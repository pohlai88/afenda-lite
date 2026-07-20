import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";

import type {
	PayablesStore,
	SupplierAllocation,
	SupplierBalance,
	SupplierInvoice,
	SupplierInvoiceCreateRecord,
	SupplierInvoiceLine,
	ThreeWayMatchResult,
} from "./model";

const SCALE = 1_000_000n;

function decimal(value: string): bigint {
	const [whole = "0", fraction = ""] = value.split(".");
	return BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, "0").slice(0, 6));
}

function format(value: bigint): string {
	const sign = value < 0n ? "-" : "";
	const absolute = value < 0n ? -value : value;
	const fraction = (absolute % SCALE)
		.toString()
		.padStart(6, "0")
		.replace(/0+$/, "");
	return `${sign}${absolute / SCALE}${fraction.length > 0 ? `.${fraction}` : ""}`;
}

function multiply(left: string, right: string): string {
	return format((decimal(left) * decimal(right)) / SCALE);
}

function cloneInvoice(invoice: SupplierInvoice): SupplierInvoice {
	return {
		...invoice,
		lines: invoice.lines.map((line) => ({ ...line })),
		matchResult:
			invoice.matchResult === null ? null : { ...invoice.matchResult },
	};
}

export class MemoryPayablesStore implements PayablesStore {
	private readonly invoices = new Map<string, SupplierInvoice>();
	private readonly allocations = new Map<string, SupplierAllocation>();
	private readonly balances = new Map<string, SupplierBalance>();

	private adjustBalance(invoice: SupplierInvoice, amount: bigint): void {
		const key = `${invoice.organizationId}:${invoice.supplierId}:${invoice.currencyCode}`;
		const existing = this.balances.get(key);
		this.balances.set(key, {
			organizationId: invoice.organizationId,
			supplierId: invoice.supplierId,
			currencyCode: invoice.currencyCode,
			openBalance: format(decimal(existing?.openBalance ?? "0") + amount),
			updatedAt: new Date(),
		});
	}

	private findInvoice(
		organizationId: string,
		invoiceId: string,
	): Result<SupplierInvoice> {
		const invoice = this.invoices.get(invoiceId);
		return invoice === undefined || invoice.organizationId !== organizationId
			? fail("NOT_FOUND", "Supplier invoice not found")
			: ok(invoice);
	}

	private newInvoice(
		record: SupplierInvoiceCreateRecord,
	): Result<SupplierInvoice> {
		for (const invoice of this.invoices.values()) {
			if (
				invoice.organizationId === record.organizationId &&
				invoice.normalizedCode === record.normalizedCode
			) {
				return fail("CONFLICT", "Supplier invoice code already exists");
			}
		}
		const now = new Date();
		return ok({
			id: randomUUID(),
			organizationId: record.organizationId,
			code: record.code,
			normalizedCode: record.normalizedCode,
			documentType: record.documentType,
			status: "draft",
			supplierId: record.supplierId,
			supplierCode: record.supplierCode,
			supplierName: record.supplierName,
			currencyCode: record.currencyCode,
			totalAmount: record.creditAmount ?? "0",
			openAmount: "0",
			version: 1,
			createdBy: record.actorUserId,
			updatedBy: record.actorUserId,
			matchedAt: null,
			matchedBy: null,
			postedAt: null,
			postedBy: null,
			cancelledAt: null,
			cancelledBy: null,
			createdAt: now,
			updatedAt: now,
			lines: [],
			matchResult: null,
		});
	}

	async createInvoice(
		record: SupplierInvoiceCreateRecord,
	): Promise<Result<SupplierInvoice>> {
		const created = this.newInvoice(record);
		if (!created.ok) return created;
		this.invoices.set(created.data.id, created.data);
		const emitted = await record.effects.emit({
			type: "payables.invoice.created.v1",
			organizationId: record.organizationId,
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
			payload: {
				organizationId: record.organizationId,
				entityId: created.data.id,
				supplierId: record.supplierId,
				amount: created.data.totalAmount,
				currencyCode: record.currencyCode,
				actorId: record.actorUserId,
				correlationId: record.correlationId,
			},
		});
		if (!emitted.ok) {
			this.invoices.delete(created.data.id);
			return emitted;
		}
		return ok(cloneInvoice(created.data));
	}

	async addLine(
		record: Parameters<PayablesStore["addLine"]>[0],
	): Promise<Result<SupplierInvoiceLine>> {
		const found = this.findInvoice(record.organizationId, record.invoiceId);
		if (!found.ok) return found;
		const invoice = found.data;
		if (invoice.status !== "draft" || invoice.documentType !== "invoice") {
			return fail(
				"CONFLICT",
				"Lines can only be added to draft supplier invoices",
			);
		}
		const now = new Date();
		const line: SupplierInvoiceLine = {
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

	async matchInvoice(
		record: Parameters<PayablesStore["matchInvoice"]>[0],
	): Promise<Result<SupplierInvoice>> {
		const found = this.findInvoice(record.organizationId, record.invoiceId);
		if (!found.ok) return found;
		const invoice = found.data;
		if (invoice.status !== "draft" || invoice.documentType !== "invoice") {
			return fail("CONFLICT", "Only draft supplier invoices can be matched");
		}
		if (invoice.version !== record.expectedVersion) {
			return fail("CONFLICT", "Supplier invoice version conflict");
		}
		if (invoice.lines.length === 0 || decimal(invoice.totalAmount) <= 0n) {
			return fail(
				"CONFLICT",
				"Cannot match an invoice without a positive total",
			);
		}
		const previous = cloneInvoice(invoice);
		const now = new Date();
		const result: ThreeWayMatchResult = {
			id: randomUUID(),
			organizationId: record.organizationId,
			invoiceId: invoice.id,
			purchaseOrderId: record.purchaseOrderId,
			goodsReceiptId: record.goodsReceiptId,
			result: "matched",
			matchedBy: record.actorUserId,
			matchedAt: now,
		};
		invoice.status = "matched";
		invoice.matchResult = result;
		invoice.matchedAt = now;
		invoice.matchedBy = record.actorUserId;
		invoice.updatedAt = now;
		invoice.updatedBy = record.actorUserId;
		invoice.version += 1;
		const emitted = await record.effects.emit({
			type: "payables.invoice.matched.v1",
			organizationId: invoice.organizationId,
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
			payload: {
				organizationId: invoice.organizationId,
				entityId: invoice.id,
				supplierId: invoice.supplierId,
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
		return ok(cloneInvoice(invoice));
	}

	async postInvoice(
		record: Parameters<PayablesStore["postInvoice"]>[0],
	): Promise<Result<SupplierInvoice>> {
		const found = this.findInvoice(record.organizationId, record.invoiceId);
		if (!found.ok) return found;
		const invoice = found.data;
		if (invoice.status !== "matched" || invoice.documentType !== "invoice") {
			return fail(
				"CONFLICT",
				"Supplier invoice must be matched before posting",
			);
		}
		if (invoice.version !== record.expectedVersion) {
			return fail("CONFLICT", "Supplier invoice version conflict");
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
			type: "payables.invoice.posted.v1",
			organizationId: invoice.organizationId,
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
			payload: {
				organizationId: invoice.organizationId,
				entityId: invoice.id,
				supplierId: invoice.supplierId,
				amount: invoice.totalAmount,
				currencyCode: invoice.currencyCode,
				actorId: record.actorUserId,
				correlationId: record.correlationId,
			},
		});
		if (!emitted.ok) {
			this.invoices.set(invoice.id, previous);
			this.balances.clear();
			for (const [key, value] of previousBalances)
				this.balances.set(key, value);
			return emitted;
		}
		return ok(cloneInvoice(invoice));
	}

	async issueCredit(
		record: Parameters<PayablesStore["issueCredit"]>[0],
	): Promise<Result<SupplierInvoice>> {
		const created = this.newInvoice({ ...record, creditAmount: record.amount });
		if (!created.ok) return created;
		const invoice = created.data;
		const previousBalances = new Map(this.balances);
		const now = new Date();
		invoice.status = "posted";
		invoice.postedAt = now;
		invoice.postedBy = record.actorUserId;
		invoice.updatedAt = now;
		invoice.version = 2;
		this.invoices.set(invoice.id, invoice);
		this.adjustBalance(invoice, -decimal(record.amount));
		const emitted = await record.effects.emit({
			type: "payables.credit_note.posted.v1",
			organizationId: invoice.organizationId,
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
			payload: {
				organizationId: invoice.organizationId,
				entityId: invoice.id,
				supplierId: invoice.supplierId,
				amount: record.amount,
				currencyCode: invoice.currencyCode,
				actorId: record.actorUserId,
				correlationId: record.correlationId,
			},
		});
		if (!emitted.ok) {
			this.invoices.delete(invoice.id);
			this.balances.clear();
			for (const [key, value] of previousBalances)
				this.balances.set(key, value);
			return emitted;
		}
		return ok(cloneInvoice(invoice));
	}

	async allocate(
		record: Parameters<PayablesStore["allocate"]>[0],
	): Promise<Result<SupplierAllocation>> {
		const found = this.findInvoice(record.organizationId, record.invoiceId);
		if (!found.ok) return found;
		const invoice = found.data;
		const amount = decimal(record.amount);
		if (invoice.status !== "posted" || invoice.documentType !== "invoice") {
			return fail("CONFLICT", "Allocation requires a posted supplier invoice");
		}
		if (amount <= 0n || amount > decimal(invoice.openAmount)) {
			return fail(
				"CONFLICT",
				"Allocation exceeds supplier invoice open amount",
			);
		}
		const previous = cloneInvoice(invoice);
		const previousBalances = new Map(this.balances);
		const allocation: SupplierAllocation = {
			id: randomUUID(),
			organizationId: record.organizationId,
			invoiceId: invoice.id,
			supplierId: invoice.supplierId,
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
			type: "payables.allocation.posted.v1",
			organizationId: invoice.organizationId,
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
			payload: {
				organizationId: invoice.organizationId,
				entityId: allocation.id,
				supplierId: invoice.supplierId,
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
			for (const [key, value] of previousBalances)
				this.balances.set(key, value);
			return emitted;
		}
		return ok({ ...allocation });
	}

	async cancel(
		record: Parameters<PayablesStore["cancel"]>[0],
	): Promise<Result<SupplierInvoice>> {
		const found = this.findInvoice(record.organizationId, record.invoiceId);
		if (!found.ok) return found;
		const invoice = found.data;
		if (invoice.status === "cancelled") {
			return fail("CONFLICT", "Supplier invoice is already cancelled");
		}
		if (invoice.version !== record.expectedVersion) {
			return fail("CONFLICT", "Supplier invoice version conflict");
		}
		if (
			invoice.status === "posted" &&
			invoice.documentType === "invoice" &&
			decimal(invoice.openAmount) !== decimal(invoice.totalAmount)
		) {
			return fail(
				"CONFLICT",
				"Cannot cancel a supplier invoice with allocations",
			);
		}
		if (invoice.status === "posted") {
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

	async getById(
		organizationId: string,
		id: string,
	): Promise<Result<SupplierInvoice | null>> {
		const invoice = this.invoices.get(id);
		return ok(
			invoice !== undefined && invoice.organizationId === organizationId
				? cloneInvoice(invoice)
				: null,
		);
	}

	async list(
		filter: Parameters<PayablesStore["list"]>[0],
	): Promise<Result<SupplierInvoice[]>> {
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
		supplierId: string,
		currencyCode?: string,
	): Promise<Result<SupplierBalance[]>> {
		return ok(
			[...this.balances.values()]
				.filter((row) => row.organizationId === organizationId)
				.filter((row) => row.supplierId === supplierId)
				.filter(
					(row) =>
						currencyCode === undefined || row.currencyCode === currencyCode,
				)
				.map((row) => ({ ...row })),
		);
	}
}

export function createMemoryPayablesStore(): MemoryPayablesStore {
	return new MemoryPayablesStore();
}
