import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";

import type {
	CustomerAllocation,
	CustomerBalance,
	InvoiceCreateRecord,
	ReceivablesStore,
	SalesInvoice,
	SalesInvoiceLine,
} from "./model";

const SCALE = 1_000_000n;

function decimal(value: string): bigint {
	const [whole = "0", fraction = ""] = value.split(".");
	return BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, "0").slice(0, 6));
}

function format(value: bigint): string {
	const sign = value < 0n ? "-" : "";
	const absolute = value < 0n ? -value : value;
	const fraction = (absolute % SCALE).toString().padStart(6, "0").replace(/0+$/, "");
	return `${sign}${absolute / SCALE}${fraction.length > 0 ? `.${fraction}` : ""}`;
}

function multiply(left: string, right: string): string {
	return format((decimal(left) * decimal(right)) / SCALE);
}

function cloneInvoice(invoice: SalesInvoice): SalesInvoice {
	return { ...invoice, lines: invoice.lines.map((line) => ({ ...line })) };
}

export class MemoryReceivablesStore implements ReceivablesStore {
	private readonly invoices = new Map<string, SalesInvoice>();
	private readonly allocations = new Map<string, CustomerAllocation>();
	private readonly balances = new Map<string, CustomerBalance>();

	private balanceKey(organizationId: string, customerId: string, currencyCode: string): string {
		return `${organizationId}:${customerId}:${currencyCode}`;
	}

	private adjustBalance(invoice: SalesInvoice, amount: bigint): void {
		const key = this.balanceKey(
			invoice.organizationId,
			invoice.customerId,
			invoice.currencyCode,
		);
		const existing = this.balances.get(key);
		const now = new Date();
		this.balances.set(key, {
			organizationId: invoice.organizationId,
			customerId: invoice.customerId,
			currencyCode: invoice.currencyCode,
			openBalance: format(decimal(existing?.openBalance ?? "0") + amount),
			updatedAt: now,
		});
	}

	async createInvoice(record: InvoiceCreateRecord): Promise<Result<SalesInvoice>> {
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
			documentType: record.documentType,
			status: "draft",
			customerId: record.customerId,
			customerCode: record.customerCode,
			customerName: record.customerName,
			currencyCode: record.currencyCode,
			totalAmount: record.creditAmount ?? "0",
			openAmount: "0",
			version: 1,
			createdBy: record.actorUserId,
			updatedBy: record.actorUserId,
			postedAt: null,
			postedBy: null,
			cancelledAt: null,
			cancelledBy: null,
			createdAt: now,
			updatedAt: now,
			lines: [],
		};
		this.invoices.set(invoice.id, invoice);
		return ok(cloneInvoice(invoice));
	}

	async addLine(record: {
		organizationId: string;
		invoiceId: string;
		itemId: string;
		description: string;
		quantity: string;
		unitPrice: string;
		actorUserId: string;
	}): Promise<Result<SalesInvoiceLine>> {
		const invoice = this.invoices.get(record.invoiceId);
		if (invoice === undefined || invoice.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Sales invoice not found");
		}
		if (invoice.status !== "draft" || invoice.documentType !== "invoice") {
			return fail("CONFLICT", "Lines can only be added to draft invoices");
		}
		const now = new Date();
		const line: SalesInvoiceLine = {
			id: randomUUID(),
			organizationId: record.organizationId,
			invoiceId: record.invoiceId,
			lineNo: invoice.lines.length + 1,
			itemId: record.itemId,
			description: record.description,
			quantity: record.quantity,
			unitPrice: record.unitPrice,
			lineAmount: multiply(record.quantity, record.unitPrice),
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
		return ok({ ...line });
	}

	async postInvoice(record: Parameters<ReceivablesStore["postInvoice"]>[0]): Promise<Result<SalesInvoice>> {
		const invoice = this.invoices.get(record.invoiceId);
		if (invoice === undefined || invoice.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Sales invoice not found");
		}
		if (invoice.status !== "draft" || invoice.documentType !== "invoice") {
			return fail("CONFLICT", "Sales invoice is not a draft invoice");
		}
		if (invoice.version !== record.expectedVersion) {
			return fail("CONFLICT", "Sales invoice version conflict");
		}
		if (invoice.lines.length === 0 || decimal(invoice.totalAmount) <= 0n) {
			return fail("CONFLICT", "Cannot post an invoice without a positive total");
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
		this.adjustBalance(invoice, decimal(invoice.totalAmount));
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
			for (const [key, value] of previousBalances) this.balances.set(key, value);
			return emitted;
		}
		return ok(cloneInvoice(invoice));
	}

	async issueCredit(record: Parameters<ReceivablesStore["issueCredit"]>[0]): Promise<Result<SalesInvoice>> {
		const created = await this.createInvoice({ ...record, creditAmount: record.amount });
		if (!created.ok) return created;
		const invoice = this.invoices.get(created.data.id);
		if (invoice === undefined) return fail("INTERNAL_ERROR", "Credit note missing after create");
		const previousBalances = new Map(this.balances);
		const now = new Date();
		invoice.status = "posted";
		invoice.openAmount = "0";
		invoice.postedAt = now;
		invoice.postedBy = record.actorUserId;
		invoice.updatedAt = now;
		invoice.version += 1;
		this.adjustBalance(invoice, -decimal(record.amount));
		const emitted = await record.effects.emit({
			type: "receivables.credit_note.posted.v1",
			organizationId: invoice.organizationId,
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
			payload: {
				organizationId: invoice.organizationId,
				entityId: invoice.id,
				customerId: invoice.customerId,
				amount: record.amount,
				currencyCode: invoice.currencyCode,
				actorId: record.actorUserId,
				correlationId: record.correlationId,
			},
		});
		if (!emitted.ok) {
			this.invoices.delete(invoice.id);
			this.balances.clear();
			for (const [key, value] of previousBalances) this.balances.set(key, value);
			return emitted;
		}
		return ok(cloneInvoice(invoice));
	}

	async allocate(record: Parameters<ReceivablesStore["allocate"]>[0]): Promise<Result<CustomerAllocation>> {
		const invoice = this.invoices.get(record.invoiceId);
		if (invoice === undefined || invoice.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Sales invoice not found");
		}
		const amount = decimal(record.amount);
		if (invoice.status !== "posted" || invoice.documentType !== "invoice") {
			return fail("CONFLICT", "Allocation requires a posted invoice");
		}
		if (amount <= 0n || amount > decimal(invoice.openAmount)) {
			return fail("CONFLICT", "Allocation exceeds invoice open amount");
		}
		const previous = cloneInvoice(invoice);
		const previousBalances = new Map(this.balances);
		const allocation: CustomerAllocation = {
			id: randomUUID(),
			organizationId: record.organizationId,
			invoiceId: invoice.id,
			customerId: invoice.customerId,
			paymentId: record.paymentId,
			amount: record.amount,
			createdBy: record.actorUserId,
			createdAt: new Date(),
		};
		invoice.openAmount = format(decimal(invoice.openAmount) - amount);
		invoice.version += 1;
		invoice.updatedAt = allocation.createdAt;
		invoice.updatedBy = record.actorUserId;
		this.allocations.set(allocation.id, allocation);
		this.adjustBalance(invoice, -amount);
		const emitted = await record.effects.emit({
			type: "receivables.allocation.posted.v1",
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
			for (const [key, value] of previousBalances) this.balances.set(key, value);
			return emitted;
		}
		return ok({ ...allocation });
	}

	async cancel(record: Parameters<ReceivablesStore["cancel"]>[0]): Promise<Result<SalesInvoice>> {
		const invoice = this.invoices.get(record.invoiceId);
		if (invoice === undefined || invoice.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Sales invoice not found");
		}
		if (invoice.status !== "draft" && invoice.status !== "posted") {
			return fail("CONFLICT", "Sales invoice cannot be cancelled");
		}
		if (invoice.version !== record.expectedVersion) {
			return fail("CONFLICT", "Sales invoice version conflict");
		}
		if (invoice.status === "posted") {
			if (
				invoice.documentType === "invoice" &&
				decimal(invoice.openAmount) !== decimal(invoice.totalAmount)
			) {
				return fail("CONFLICT", "Cannot cancel an invoice with allocations");
			}
			const direction = invoice.documentType === "invoice" ? -1n : 1n;
			this.adjustBalance(invoice, direction * decimal(invoice.totalAmount));
		}
		const now = new Date();
		invoice.status = "cancelled";
		invoice.openAmount = "0";
		invoice.cancelledAt = now;
		invoice.cancelledBy = record.actorUserId;
		invoice.updatedAt = now;
		invoice.updatedBy = record.actorUserId;
		invoice.version += 1;
		return ok(cloneInvoice(invoice));
	}

	async getById(organizationId: string, id: string): Promise<Result<SalesInvoice | null>> {
		const invoice = this.invoices.get(id);
		return ok(
			invoice !== undefined && invoice.organizationId === organizationId
				? cloneInvoice(invoice)
				: null,
		);
	}

	async list(filter: Parameters<ReceivablesStore["list"]>[0]): Promise<Result<SalesInvoice[]>> {
		const start = (filter.page - 1) * filter.pageSize;
		return ok(
			[...this.invoices.values()]
				.filter((row) => row.organizationId === filter.organizationId)
				.filter((row) => filter.status === undefined || row.status === filter.status)
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
				.filter((row) => currencyCode === undefined || row.currencyCode === currencyCode)
				.map((row) => ({ ...row })),
		);
	}
}

export function createMemoryReceivablesStore(): MemoryReceivablesStore {
	return new MemoryReceivablesStore();
}
