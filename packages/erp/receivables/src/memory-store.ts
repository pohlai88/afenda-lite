import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";

import { add, decimal, format, multiply, subtract } from "./shared/money";
import type { ReceivablesStore } from "./store";
import type {
	CustomerAging,
	CustomerAllocation,
	CustomerBalance,
	SalesCreditNote,
	SalesInvoice,
	SalesInvoiceLine,
} from "./types";

function cloneInvoice(invoice: SalesInvoice): SalesInvoice {
	return { ...invoice, lines: invoice.lines.map((line) => ({ ...line })) };
}

function cloneAllocation(allocation: CustomerAllocation): CustomerAllocation {
	return { ...allocation };
}

function cloneCredit(credit: SalesCreditNote): SalesCreditNote {
	return { ...credit };
}

function emptyAgingBuckets() {
	return {
		current: "0",
		days1to30: "0",
		days31to60: "0",
		days61to90: "0",
		over90: "0",
	};
}

function daysBetween(asOf: Date, due: Date): number {
	const ms = asOf.getTime() - due.getTime();
	return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export class MemoryReceivablesStore implements ReceivablesStore {
	private readonly invoices = new Map<string, SalesInvoice>();
	private readonly credits = new Map<string, SalesCreditNote>();
	private readonly allocations = new Map<string, CustomerAllocation>();
	private readonly balances = new Map<string, CustomerBalance>();
	private readonly createKeys = new Map<string, string>();
	private readonly lineKeys = new Map<string, string>();
	private readonly postKeys = new Map<string, string>();
	private readonly creditKeys = new Map<string, string>();
	private readonly applyKeys = new Map<string, string>();
	private readonly reverseKeys = new Map<string, string>();
	private readonly cancelKeys = new Map<string, string>();
	private readonly closeKeys = new Map<string, string>();

	private balanceKey(
		organizationId: string,
		customerId: string,
		currencyCode: string,
	): string {
		return `${organizationId}:${customerId}:${currencyCode}`;
	}

	private orgKey(organizationId: string, key: string): string {
		return `${organizationId}:${key}`;
	}

	private adjustBalance(
		organizationId: string,
		customerId: string,
		currencyCode: string,
		amount: bigint,
	): void {
		const key = this.balanceKey(organizationId, customerId, currencyCode);
		const existing = this.balances.get(key);
		const now = new Date();
		this.balances.set(key, {
			organizationId,
			customerId,
			currencyCode,
			openBalance: format(decimal(existing?.openBalance ?? "0") + amount),
			updatedAt: now,
		});
	}

	async createInvoice(
		record: Parameters<ReceivablesStore["createInvoice"]>[0],
	): Promise<Result<SalesInvoice>> {
		const key = this.orgKey(record.organizationId, record.idempotencyKey);
		const existingId = this.createKeys.get(key);
		if (existingId !== undefined) {
			const existing = this.invoices.get(existingId);
			if (existing === undefined) {
				return fail("INTERNAL_ERROR", "Create idempotency target missing");
			}
			return ok(cloneInvoice(existing));
		}
		for (const invoice of this.invoices.values()) {
			if (
				invoice.organizationId === record.organizationId &&
				invoice.normalizedCode === record.normalizedCode
			) {
				return fail("CONFLICT", "Sales invoice code already exists");
			}
		}
		const now = new Date();
		const invoice: SalesInvoice = {
			id: randomUUID(),
			organizationId: record.organizationId,
			code: record.code,
			normalizedCode: record.normalizedCode,
			status: "draft",
			invoiceSource: record.invoiceSource,
			customerId: record.customerId,
			customerCode: record.customerCode,
			customerName: record.customerName,
			currencyCode: record.currencyCode,
			salesOrderId: record.salesOrderId,
			deliveryId: record.deliveryId,
			invoiceDate: record.invoiceDate,
			accountingDate: record.accountingDate,
			dueDate: record.dueDate,
			paymentTermCode: record.paymentTermCode,
			paymentTermDescription: record.paymentTermDescription,
			manualReason: record.manualReason,
			totalAmount: "0",
			openAmount: "0",
			version: 1,
			createdBy: record.actorUserId,
			updatedBy: record.actorUserId,
			postedAt: null,
			postedBy: null,
			closedAt: null,
			closedBy: null,
			cancelledAt: null,
			cancelledBy: null,
			createdAt: now,
			updatedAt: now,
			lines: [],
		};
		this.invoices.set(invoice.id, invoice);
		this.createKeys.set(key, invoice.id);
		return ok(cloneInvoice(invoice));
	}

	async addLine(
		record: Parameters<ReceivablesStore["addLine"]>[0],
	): Promise<Result<SalesInvoiceLine>> {
		const key = this.orgKey(record.organizationId, record.idempotencyKey);
		const existingLineId = this.lineKeys.get(key);
		if (existingLineId !== undefined) {
			for (const invoice of this.invoices.values()) {
				const line = invoice.lines.find((row) => row.id === existingLineId);
				if (line !== undefined) return ok({ ...line });
			}
			return fail("INTERNAL_ERROR", "Line idempotency target missing");
		}
		const invoice = this.invoices.get(record.invoiceId);
		if (
			invoice === undefined ||
			invoice.organizationId !== record.organizationId
		) {
			return fail("NOT_FOUND", "Sales invoice not found");
		}
		if (invoice.status !== "draft") {
			return fail("CONFLICT", "Lines can only be added to draft invoices");
		}
		const now = new Date();
		const line: SalesInvoiceLine = {
			id: randomUUID(),
			organizationId: record.organizationId,
			invoiceId: record.invoiceId,
			lineNo: invoice.lines.length + 1,
			itemId: record.itemId,
			itemCode: record.itemCode,
			itemName: record.itemName,
			description: record.description,
			quantity: record.quantity,
			unitPrice: record.unitPrice,
			lineAmount: multiply(record.quantity, record.unitPrice),
			salesOrderLineId: record.salesOrderLineId,
			deliveryLineId: record.deliveryLineId,
			createdBy: record.actorUserId,
			createdAt: now,
		};
		invoice.lines.push(line);
		invoice.totalAmount = format(
			invoice.lines.reduce((total, row) => total + decimal(row.lineAmount), 0n),
		);
		invoice.version += 1;
		invoice.updatedBy = record.actorUserId;
		invoice.updatedAt = now;
		this.lineKeys.set(key, line.id);
		return ok({ ...line });
	}

	async postInvoice(
		record: Parameters<ReceivablesStore["postInvoice"]>[0],
	): Promise<Result<SalesInvoice>> {
		const key = this.orgKey(record.organizationId, record.idempotencyKey);
		const existingId = this.postKeys.get(key);
		if (existingId !== undefined) {
			const existing = this.invoices.get(existingId);
			if (existing === undefined) {
				return fail("INTERNAL_ERROR", "Post idempotency target missing");
			}
			return ok(cloneInvoice(existing));
		}
		const invoice = this.invoices.get(record.invoiceId);
		if (
			invoice === undefined ||
			invoice.organizationId !== record.organizationId
		) {
			return fail("NOT_FOUND", "Sales invoice not found");
		}
		if (invoice.status !== "draft") {
			return fail("CONFLICT", "Sales invoice is not a draft invoice");
		}
		if (invoice.version !== record.expectedVersion) {
			return fail("CONFLICT", "Sales invoice version conflict");
		}
		if (invoice.lines.length === 0 || decimal(invoice.totalAmount) <= 0n) {
			return fail(
				"CONFLICT",
				"Cannot post an invoice without a positive total",
			);
		}
		if (record.sourceLineChecks !== undefined) {
			for (const check of record.sourceLineChecks) {
				if (
					decimal(check.quantity) > decimal(check.remainingInvoiceableQuantity)
				) {
					return fail(
						"CONFLICT",
						"Invoice quantity exceeds remaining invoiceable quantity",
					);
				}
			}
		}
		const previous = cloneInvoice(invoice);
		const previousBalances = new Map(this.balances);
		const now = new Date();
		invoice.status = "posted";
		invoice.openAmount = invoice.totalAmount;
		invoice.postedAt = now;
		invoice.postedBy = record.actorUserId;
		invoice.updatedAt = now;
		invoice.updatedBy = record.actorUserId;
		invoice.version += 1;
		if (invoice.invoiceDate === null) invoice.invoiceDate = now;
		if (invoice.accountingDate === null) invoice.accountingDate = now;
		this.adjustBalance(
			invoice.organizationId,
			invoice.customerId,
			invoice.currencyCode,
			decimal(invoice.totalAmount),
		);
		const emitted = await record.effects.emit({
			type: "receivables.invoice.posted.v1",
			organizationId: invoice.organizationId,
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
			payload: {
				organizationId: invoice.organizationId,
				entityId: invoice.id,
				customerId: invoice.customerId,
				amount: invoice.totalAmount,
				currencyCode: invoice.currencyCode,
				actorId: record.actorUserId,
				correlationId: record.correlationId,
			},
		});
		if (!emitted.ok) {
			this.invoices.set(invoice.id, previous);
			this.balances.clear();
			for (const [balanceKey, value] of previousBalances) {
				this.balances.set(balanceKey, value);
			}
			return emitted;
		}
		this.postKeys.set(key, invoice.id);
		return ok(cloneInvoice(invoice));
	}

	async issueCredit(
		record: Parameters<ReceivablesStore["issueCredit"]>[0],
	): Promise<Result<SalesCreditNote>> {
		const key = this.orgKey(record.organizationId, record.idempotencyKey);
		const existingId = this.creditKeys.get(key);
		if (existingId !== undefined) {
			const existing = this.credits.get(existingId);
			if (existing === undefined) {
				return fail("INTERNAL_ERROR", "Credit idempotency target missing");
			}
			return ok(cloneCredit(existing));
		}
		const invoice = this.invoices.get(record.salesInvoiceId);
		if (
			invoice === undefined ||
			invoice.organizationId !== record.organizationId
		) {
			return fail("NOT_FOUND", "Sales invoice not found");
		}
		if (invoice.status !== "posted" && invoice.status !== "closed") {
			return fail("CONFLICT", "Credit note requires a posted invoice");
		}
		if (invoice.currencyCode !== record.currencyCode) {
			return fail("CONFLICT", "Credit note currency must match invoice");
		}
		if (
			decimal(record.amount) > decimal(invoice.openAmount) &&
			invoice.status === "posted"
		) {
			return fail("CONFLICT", "Credit amount exceeds invoice open amount");
		}
		for (const credit of this.credits.values()) {
			if (
				credit.organizationId === record.organizationId &&
				credit.normalizedCode === record.normalizedCode
			) {
				return fail("CONFLICT", "Credit note code already exists");
			}
		}
		const previousInvoice = cloneInvoice(invoice);
		const previousBalances = new Map(this.balances);
		const now = new Date();
		const credit: SalesCreditNote = {
			id: randomUUID(),
			organizationId: record.organizationId,
			code: record.code,
			normalizedCode: record.normalizedCode,
			status: "posted",
			customerId: record.customerId,
			customerCode: record.customerCode,
			customerName: record.customerName,
			salesInvoiceId: record.salesInvoiceId,
			currencyCode: record.currencyCode,
			amount: record.amount,
			version: 1,
			createdBy: record.actorUserId,
			updatedBy: record.actorUserId,
			postedAt: now,
			postedBy: record.actorUserId,
			createdAt: now,
			updatedAt: now,
		};
		if (invoice.status === "posted") {
			invoice.openAmount = subtract(invoice.openAmount, record.amount);
			invoice.version += 1;
			invoice.updatedAt = now;
			invoice.updatedBy = record.actorUserId;
		}
		this.credits.set(credit.id, credit);
		this.adjustBalance(
			record.organizationId,
			record.customerId,
			record.currencyCode,
			-decimal(record.amount),
		);
		const emitted = await record.effects.emit({
			type: "receivables.credit_note.posted.v1",
			organizationId: credit.organizationId,
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
			payload: {
				organizationId: credit.organizationId,
				entityId: credit.id,
				customerId: credit.customerId,
				amount: credit.amount,
				currencyCode: credit.currencyCode,
				actorId: record.actorUserId,
				correlationId: record.correlationId,
			},
		});
		if (!emitted.ok) {
			this.credits.delete(credit.id);
			this.invoices.set(invoice.id, previousInvoice);
			this.balances.clear();
			for (const [balanceKey, value] of previousBalances) {
				this.balances.set(balanceKey, value);
			}
			return emitted;
		}
		this.creditKeys.set(key, credit.id);
		return ok(cloneCredit(credit));
	}

	async applyReceipt(
		record: Parameters<ReceivablesStore["applyReceipt"]>[0],
	): Promise<Result<CustomerAllocation>> {
		const key = this.orgKey(record.organizationId, record.idempotencyKey);
		const existingId = this.applyKeys.get(key);
		if (existingId !== undefined) {
			const existing = this.allocations.get(existingId);
			if (existing === undefined) {
				return fail("INTERNAL_ERROR", "Apply idempotency target missing");
			}
			return ok(cloneAllocation(existing));
		}
		for (const allocation of this.allocations.values()) {
			if (
				allocation.organizationId === record.organizationId &&
				allocation.paymentApplicationInstructionId ===
					record.paymentApplicationInstructionId &&
				allocation.status === "active"
			) {
				return fail(
					"CONFLICT",
					"Payment application instruction already applied",
				);
			}
		}
		const invoice = this.invoices.get(record.invoiceId);
		if (
			invoice === undefined ||
			invoice.organizationId !== record.organizationId
		) {
			return fail("NOT_FOUND", "Sales invoice not found");
		}
		if (invoice.status !== "posted") {
			return fail("CONFLICT", "Allocation requires a posted invoice");
		}
		if (invoice.version !== record.expectedInvoiceVersion) {
			return fail("CONFLICT", "Sales invoice version conflict");
		}
		const amount = decimal(record.amount);
		if (amount <= 0n || amount > decimal(invoice.openAmount)) {
			return fail("CONFLICT", "Allocation exceeds invoice open amount");
		}
		const previous = cloneInvoice(invoice);
		const previousBalances = new Map(this.balances);
		const now = new Date();
		const allocation: CustomerAllocation = {
			id: randomUUID(),
			organizationId: record.organizationId,
			invoiceId: invoice.id,
			customerId: invoice.customerId,
			paymentId: record.paymentId,
			paymentApplicationInstructionId: record.paymentApplicationInstructionId,
			creditNoteId: null,
			status: "active",
			amount: record.amount,
			createdBy: record.actorUserId,
			createdAt: now,
			reversedAt: null,
			reversedBy: null,
		};
		invoice.openAmount = subtract(invoice.openAmount, record.amount);
		invoice.version += 1;
		invoice.updatedAt = now;
		invoice.updatedBy = record.actorUserId;
		this.allocations.set(allocation.id, allocation);
		this.adjustBalance(
			invoice.organizationId,
			invoice.customerId,
			invoice.currencyCode,
			-amount,
		);
		const emitted = await record.effects.emit({
			type: "receivables.receipt_application.posted.v1",
			organizationId: invoice.organizationId,
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
			payload: {
				organizationId: invoice.organizationId,
				entityId: allocation.id,
				customerId: invoice.customerId,
				amount: record.amount,
				currencyCode: invoice.currencyCode,
				actorId: record.actorUserId,
				correlationId: record.correlationId,
			},
		});
		if (!emitted.ok) {
			this.invoices.set(invoice.id, previous);
			this.allocations.delete(allocation.id);
			this.balances.clear();
			for (const [balanceKey, value] of previousBalances) {
				this.balances.set(balanceKey, value);
			}
			return emitted;
		}
		this.applyKeys.set(key, allocation.id);
		return ok(cloneAllocation(allocation));
	}

	async reverseReceiptApplication(
		record: Parameters<ReceivablesStore["reverseReceiptApplication"]>[0],
	): Promise<Result<CustomerAllocation>> {
		const key = this.orgKey(record.organizationId, record.idempotencyKey);
		const existingId = this.reverseKeys.get(key);
		if (existingId !== undefined) {
			const existing = this.allocations.get(existingId);
			if (existing === undefined) {
				return fail("INTERNAL_ERROR", "Reverse idempotency target missing");
			}
			return ok(cloneAllocation(existing));
		}
		const allocation = this.allocations.get(record.allocationId);
		if (
			allocation === undefined ||
			allocation.organizationId !== record.organizationId
		) {
			return fail("NOT_FOUND", "Customer allocation not found");
		}
		if (allocation.status !== "active") {
			return fail("CONFLICT", "Allocation is not active");
		}
		const invoice = this.invoices.get(allocation.invoiceId);
		if (invoice === undefined) {
			return fail("INTERNAL_ERROR", "Customer allocation invoice is missing");
		}
		const previous = cloneInvoice(invoice);
		const previousAllocation = cloneAllocation(allocation);
		const previousBalances = new Map(this.balances);
		const now = new Date();
		const amount = decimal(allocation.amount);
		invoice.openAmount = add(invoice.openAmount, allocation.amount);
		invoice.version += 1;
		invoice.updatedAt = now;
		invoice.updatedBy = record.actorUserId;
		if (invoice.status === "closed") {
			invoice.status = "posted";
			invoice.closedAt = null;
			invoice.closedBy = null;
		}
		allocation.status = "reversed";
		allocation.reversedAt = now;
		allocation.reversedBy = record.actorUserId;
		this.adjustBalance(
			invoice.organizationId,
			invoice.customerId,
			invoice.currencyCode,
			amount,
		);
		const emitted = await record.effects.emit({
			type: "receivables.receipt_application.reversed.v1",
			organizationId: invoice.organizationId,
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
			payload: {
				organizationId: invoice.organizationId,
				entityId: allocation.id,
				customerId: invoice.customerId,
				amount: allocation.amount,
				currencyCode: invoice.currencyCode,
				actorId: record.actorUserId,
				correlationId: record.correlationId,
			},
		});
		if (!emitted.ok) {
			this.invoices.set(invoice.id, previous);
			this.allocations.set(allocation.id, previousAllocation);
			this.balances.clear();
			for (const [balanceKey, value] of previousBalances) {
				this.balances.set(balanceKey, value);
			}
			return emitted;
		}
		this.reverseKeys.set(key, allocation.id);
		return ok(cloneAllocation(allocation));
	}

	async reverseAllocationsByPayment(
		record: Parameters<ReceivablesStore["reverseAllocationsByPayment"]>[0],
	): Promise<Result<CustomerAllocation[]>> {
		const active = [...this.allocations.values()].filter(
			(allocation) =>
				allocation.organizationId === record.organizationId &&
				allocation.paymentId === record.paymentId &&
				allocation.status === "active",
		);
		const reversed: CustomerAllocation[] = [];
		for (const allocation of active) {
			const result = await this.reverseReceiptApplication({
				organizationId: record.organizationId,
				allocationId: allocation.id,
				idempotencyKey: `${record.idempotencyKey}:${allocation.id}`,
				actorUserId: record.actorUserId,
				correlationId: record.correlationId,
				effects: record.effects,
			});
			if (!result.ok) return result;
			reversed.push(result.data);
		}
		return ok(reversed);
	}

	async cancelDraft(
		record: Parameters<ReceivablesStore["cancelDraft"]>[0],
	): Promise<Result<SalesInvoice>> {
		const key = this.orgKey(record.organizationId, record.idempotencyKey);
		const existingId = this.cancelKeys.get(key);
		if (existingId !== undefined) {
			const existing = this.invoices.get(existingId);
			if (existing === undefined) {
				return fail("INTERNAL_ERROR", "Cancel idempotency target missing");
			}
			return ok(cloneInvoice(existing));
		}
		const invoice = this.invoices.get(record.invoiceId);
		if (
			invoice === undefined ||
			invoice.organizationId !== record.organizationId
		) {
			return fail("NOT_FOUND", "Sales invoice not found");
		}
		if (invoice.status !== "draft") {
			return fail("CONFLICT", "Only draft sales invoices can be cancelled");
		}
		if (invoice.version !== record.expectedVersion) {
			return fail("CONFLICT", "Sales invoice version conflict");
		}
		const previous = cloneInvoice(invoice);
		const now = new Date();
		invoice.status = "cancelled";
		invoice.openAmount = "0";
		invoice.cancelledAt = now;
		invoice.cancelledBy = record.actorUserId;
		invoice.updatedAt = now;
		invoice.updatedBy = record.actorUserId;
		invoice.version += 1;
		const emitted = await record.effects.emit({
			type: "receivables.invoice.cancelled.v1",
			organizationId: invoice.organizationId,
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
			payload: {
				organizationId: invoice.organizationId,
				entityId: invoice.id,
				customerId: invoice.customerId,
				amount: invoice.totalAmount,
				currencyCode: invoice.currencyCode,
				actorId: record.actorUserId,
				correlationId: record.correlationId,
			},
		});
		if (!emitted.ok) {
			this.invoices.set(invoice.id, previous);
			return emitted;
		}
		this.cancelKeys.set(key, invoice.id);
		return ok(cloneInvoice(invoice));
	}

	async closeInvoice(
		record: Parameters<ReceivablesStore["closeInvoice"]>[0],
	): Promise<Result<SalesInvoice>> {
		const key = this.orgKey(record.organizationId, record.idempotencyKey);
		const existingId = this.closeKeys.get(key);
		if (existingId !== undefined) {
			const existing = this.invoices.get(existingId);
			if (existing === undefined) {
				return fail("INTERNAL_ERROR", "Close idempotency target missing");
			}
			return ok(cloneInvoice(existing));
		}
		const invoice = this.invoices.get(record.invoiceId);
		if (
			invoice === undefined ||
			invoice.organizationId !== record.organizationId
		) {
			return fail("NOT_FOUND", "Sales invoice not found");
		}
		if (invoice.status !== "posted") {
			return fail("CONFLICT", "Only posted invoices can be closed");
		}
		if (invoice.version !== record.expectedVersion) {
			return fail("CONFLICT", "Sales invoice version conflict");
		}
		if (decimal(invoice.openAmount) !== 0n) {
			return fail("CONFLICT", "Invoice open amount must be zero to close");
		}
		const previous = cloneInvoice(invoice);
		const now = new Date();
		invoice.status = "closed";
		invoice.closedAt = now;
		invoice.closedBy = record.actorUserId;
		invoice.updatedAt = now;
		invoice.updatedBy = record.actorUserId;
		invoice.version += 1;
		const emitted = await record.effects.emit({
			type: "receivables.invoice.closed.v1",
			organizationId: invoice.organizationId,
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
			payload: {
				organizationId: invoice.organizationId,
				entityId: invoice.id,
				customerId: invoice.customerId,
				amount: invoice.totalAmount,
				currencyCode: invoice.currencyCode,
				actorId: record.actorUserId,
				correlationId: record.correlationId,
			},
		});
		if (!emitted.ok) {
			this.invoices.set(invoice.id, previous);
			return emitted;
		}
		this.closeKeys.set(key, invoice.id);
		return ok(cloneInvoice(invoice));
	}

	async getById(
		organizationId: string,
		id: string,
	): Promise<Result<SalesInvoice | null>> {
		const invoice = this.invoices.get(id);
		return ok(
			invoice !== undefined && invoice.organizationId === organizationId
				? cloneInvoice(invoice)
				: null,
		);
	}

	async list(
		filter: Parameters<ReceivablesStore["list"]>[0],
	): Promise<Result<SalesInvoice[]>> {
		const start = (filter.page - 1) * filter.pageSize;
		return ok(
			[...this.invoices.values()]
				.filter((row) => row.organizationId === filter.organizationId)
				.filter(
					(row) => filter.status === undefined || row.status === filter.status,
				)
				.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
				.slice(start, start + filter.pageSize)
				.map(cloneInvoice),
		);
	}

	async getBalance(
		organizationId: string,
		customerId: string,
		currencyCode?: string,
	): Promise<Result<CustomerBalance[]>> {
		return ok(
			[...this.balances.values()]
				.filter((row) => row.organizationId === organizationId)
				.filter((row) => row.customerId === customerId)
				.filter(
					(row) =>
						currencyCode === undefined || row.currencyCode === currencyCode,
				)
				.map((row) => ({ ...row })),
		);
	}

	async getAging(
		input: Parameters<ReceivablesStore["getAging"]>[0],
	): Promise<Result<CustomerAging>> {
		const asOf = new Date(`${input.asOfDate}T23:59:59.999Z`);
		const buckets = emptyAgingBuckets();
		let total = 0n;
		for (const invoice of this.invoices.values()) {
			if (
				invoice.organizationId !== input.organizationId ||
				invoice.customerId !== input.customerId ||
				invoice.currencyCode !== input.currencyCode ||
				invoice.status !== "posted" ||
				decimal(invoice.openAmount) <= 0n
			) {
				continue;
			}
			const due = invoice.dueDate ?? invoice.postedAt ?? invoice.createdAt;
			const age = daysBetween(asOf, due);
			const open = decimal(invoice.openAmount);
			total += open;
			const amount = format(open);
			if (age <= 0) buckets.current = add(buckets.current, amount);
			else if (age <= 30) buckets.days1to30 = add(buckets.days1to30, amount);
			else if (age <= 60) buckets.days31to60 = add(buckets.days31to60, amount);
			else if (age <= 90) buckets.days61to90 = add(buckets.days61to90, amount);
			else buckets.over90 = add(buckets.over90, amount);
		}
		return ok({
			organizationId: input.organizationId,
			customerId: input.customerId,
			currencyCode: input.currencyCode,
			asOfDate: input.asOfDate,
			buckets,
			totalOpen: format(total),
		});
	}

	async sumPostedQuantityForSourceLine(
		input: Parameters<ReceivablesStore["sumPostedQuantityForSourceLine"]>[0],
	): Promise<Result<string>> {
		let total = 0n;
		for (const invoice of this.invoices.values()) {
			if (
				invoice.organizationId !== input.organizationId ||
				(invoice.status !== "posted" && invoice.status !== "closed") ||
				invoice.id === input.excludeInvoiceId
			) {
				continue;
			}
			for (const line of invoice.lines) {
				if (
					input.salesOrderLineId !== undefined &&
					line.salesOrderLineId === input.salesOrderLineId
				) {
					total += decimal(line.quantity);
				}
				if (
					input.deliveryLineId !== undefined &&
					line.deliveryLineId === input.deliveryLineId
				) {
					total += decimal(line.quantity);
				}
			}
		}
		for (const credit of this.credits.values()) {
			if (
				credit.organizationId !== input.organizationId ||
				credit.status !== "posted"
			) {
				continue;
			}
			// Credit notes do not reopen quantity in this memory model unless tied to lines.
			void credit;
		}
		return ok(format(total));
	}

	async listPostedFactsForReconcile(organizationId: string): Promise<
		Result<{
			invoices: Array<{
				id: string;
				customerId: string;
				currencyCode: string;
				totalAmount: string;
				status: SalesInvoice["status"];
			}>;
			credits: Array<{
				id: string;
				customerId: string;
				currencyCode: string;
				amount: string;
				status: string;
			}>;
			allocations: Array<{
				id: string;
				customerId: string;
				invoiceId: string;
				amount: string;
				status: string;
			}>;
			balances: CustomerBalance[];
		}>
	> {
		return ok({
			invoices: [...this.invoices.values()]
				.filter((row) => row.organizationId === organizationId)
				.filter((row) => row.status === "posted" || row.status === "closed")
				.map((row) => ({
					id: row.id,
					customerId: row.customerId,
					currencyCode: row.currencyCode,
					totalAmount: row.totalAmount,
					status: row.status,
				})),
			credits: [...this.credits.values()]
				.filter((row) => row.organizationId === organizationId)
				.filter((row) => row.status === "posted")
				.map((row) => ({
					id: row.id,
					customerId: row.customerId,
					currencyCode: row.currencyCode,
					amount: row.amount,
					status: row.status,
				})),
			allocations: [...this.allocations.values()]
				.filter((row) => row.organizationId === organizationId)
				.filter((row) => row.status === "active")
				.map((row) => ({
					id: row.id,
					customerId: row.customerId,
					invoiceId: row.invoiceId,
					amount: row.amount,
					status: row.status,
				})),
			balances: [...this.balances.values()]
				.filter((row) => row.organizationId === organizationId)
				.map((row) => ({ ...row })),
		});
	}
}

export function createMemoryReceivablesStore(): MemoryReceivablesStore {
	return new MemoryReceivablesStore();
}
