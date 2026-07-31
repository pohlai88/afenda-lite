import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";

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
const TRAILING_ZERO_PATTERN = /0+$/;

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
		.replace(TRAILING_ZERO_PATTERN, "");
	return `${sign}${absolute / SCALE}${fraction.length > 0 ? `.${fraction}` : ""}`;
}

function multiply(left: string, right: string): string {
	return format((decimal(left) * decimal(right)) / SCALE);
}

function resolveResult<T>(result: Result<T>): Promise<Result<T>> {
	return Promise.resolve(result);
}

async function runSequentially<T>(
	items: readonly T[],
	operation: (item: T) => Promise<Result<void>>,
): Promise<Result<void>> {
	const [item, ...remaining] = items;
	if (item === undefined) {
		return errorResult.ok(undefined);
	}
	const current = await operation(item);
	if (!current.ok) {
		return current;
	}
	return runSequentially(remaining, operation);
}

function cloneInvoice(invoice: SupplierInvoice): SupplierInvoice {
	return {
		...invoice,
		lines: invoice.lines.map((line) => ({ ...line })),
		matchResult:
			invoice.matchResult === null ? null : { ...invoice.matchResult },
	};
}

/**
 * Deterministic contract-test adapter with no concurrent transaction isolation.
 * Command rollback is explicit per mutation; nested transactions are unsupported.
 * It mirrors domain behavior, not production database mechanics.
 */
export class MemoryPayablesStore implements PayablesStore {
	private readonly invoices = new Map<string, SupplierInvoice>();
	private readonly allocations = new Map<string, SupplierAllocation>();
	private readonly balances = new Map<string, SupplierBalance>();

	private adjustBalance(invoice: SupplierInvoice, amount: bigint): void {
		const key = `${invoice.organizationId}:${invoice.supplierId}:${invoice.currencyCode}`;
		const existing = this.balances.get(key);
		this.balances.set(key, {
			asOf: new Date(),
			creditedAmount: existing?.creditedAmount ?? "0",
			currencyCode: invoice.currencyCode,
			invoicedAmount: existing?.invoicedAmount ?? "0",
			openBalance: format(decimal(existing?.openBalance ?? "0") + amount),
			organizationId: invoice.organizationId,
			outstandingAmount: format(decimal(existing?.openBalance ?? "0") + amount),
			paidAmount: existing?.paidAmount ?? "0",
			supplierId: invoice.supplierId,
			updatedAt: new Date(),
		});
	}

	private findInvoice(
		organizationId: string,
		invoiceId: string,
	): Result<SupplierInvoice> {
		const invoice = this.invoices.get(invoiceId);
		return invoice === undefined || invoice.organizationId !== organizationId
			? errorResult.fail("NOT_FOUND", {
					publicMessage: "Supplier invoice not found",
				})
			: errorResult.ok(invoice);
	}

	private newInvoice(
		record: SupplierInvoiceCreateRecord,
	): Result<SupplierInvoice> {
		for (const invoice of this.invoices.values()) {
			if (
				invoice.organizationId === record.organizationId &&
				invoice.normalizedCode === record.normalizedCode
			) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Supplier invoice code already exists",
				});
			}
		}
		const now = new Date();
		return errorResult.ok({
			cancelledAt: null,
			cancelledBy: null,
			code: record.code,
			createdAt: now,
			createdBy: record.actorUserId,
			currencyCode: record.currencyCode,
			documentType: record.documentType,
			id: randomUUID(),
			lines: [],
			matchedAt: null,
			matchedBy: null,
			matchResult: null,
			normalizedCode: record.normalizedCode,
			openAmount: "0",
			organizationId: record.organizationId,
			postedAt: null,
			postedBy: null,
			status: "draft",
			supplierCode: record.supplierCode,
			supplierId: record.supplierId,
			supplierName: record.supplierName,
			totalAmount: record.creditAmount ?? "0",
			updatedAt: now,
			updatedBy: record.actorUserId,
			version: 1,
		});
	}

	async createInvoice(
		record: SupplierInvoiceCreateRecord,
	): Promise<Result<SupplierInvoice>> {
		const created = this.newInvoice(record);
		if (!created.ok) {
			return created;
		}
		this.invoices.set(created.data.id, created.data);
		const emitted = await record.effects.emit({
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
			organizationId: record.organizationId,
			payload: {
				actorId: record.actorUserId,
				amount: created.data.totalAmount,
				correlationId: record.correlationId,
				currencyCode: record.currencyCode,
				entityId: created.data.id,
				organizationId: record.organizationId,
				supplierId: record.supplierId,
			},
			type: "payables.invoice.created.v1",
		});
		if (!emitted.ok) {
			this.invoices.delete(created.data.id);
			return emitted;
		}
		return errorResult.ok(cloneInvoice(created.data));
	}

	addLine(
		record: Parameters<PayablesStore["addLine"]>[0],
	): Promise<Result<SupplierInvoiceLine>> {
		const found = this.findInvoice(record.organizationId, record.invoiceId);
		if (!found.ok) {
			return resolveResult(found);
		}
		const invoice = found.data;
		if (invoice.status !== "draft") {
			return resolveResult(
				errorResult.fail("CONFLICT", {
					publicMessage: "Lines can only be added to draft supplier documents",
				}),
			);
		}
		const now = new Date();
		const line: SupplierInvoiceLine = {
			createdAt: now,
			createdBy: record.actorUserId,
			description: record.description,
			id: randomUUID(),
			invoiceId: record.invoiceId,
			itemId: record.itemId,
			lineAmount: multiply(record.quantity, record.unitPrice),
			lineNo: invoice.lines.length + 1,
			organizationId: record.organizationId,
			quantity: record.quantity,
			unitPrice: record.unitPrice,
		};
		invoice.lines.push(line);
		invoice.totalAmount = format(
			invoice.lines.reduce((total, row) => total + decimal(row.lineAmount), 0n),
		);
		invoice.version += 1;
		invoice.updatedBy = record.actorUserId;
		invoice.updatedAt = now;
		return resolveResult(errorResult.ok({ ...line }));
	}

	async matchInvoice(
		record: Parameters<PayablesStore["matchInvoice"]>[0],
	): Promise<Result<SupplierInvoice>> {
		const found = this.findInvoice(record.organizationId, record.invoiceId);
		if (!found.ok) {
			return found;
		}
		const invoice = found.data;
		if (invoice.status !== "draft" || invoice.documentType !== "invoice") {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Only draft supplier invoices can be matched",
			});
		}
		if (invoice.version !== record.expectedVersion) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Supplier invoice version conflict",
			});
		}
		if (invoice.lines.length === 0 || decimal(invoice.totalAmount) <= 0n) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Cannot match an invoice without a positive total",
			});
		}
		const previous = cloneInvoice(invoice);
		const now = new Date();
		const result: ThreeWayMatchResult = {
			evidence: record.evidence,
			goodsReceiptId: record.goodsReceiptId,
			goodsReceiptVersion: record.goodsReceiptVersion,
			id: randomUUID(),
			invoiceId: invoice.id,
			matchedAt: now,
			matchedBy: record.actorUserId,
			organizationId: record.organizationId,
			purchaseOrderId: record.purchaseOrderId,
			purchaseOrderVersion: record.purchaseOrderVersion,
			result: record.matchStatus,
		};
		invoice.matchResult = result;
		if (record.matchStatus !== "exception") {
			invoice.status = "matched";
			invoice.matchedAt = now;
			invoice.matchedBy = record.actorUserId;
			invoice.updatedAt = now;
			invoice.updatedBy = record.actorUserId;
			invoice.version += 1;
		}
		if (record.matchStatus === "exception") {
			return errorResult.ok(cloneInvoice(invoice));
		}
		const emitted = await record.effects.emit({
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
			organizationId: invoice.organizationId,
			payload: {
				actorId: record.actorUserId,
				amount: invoice.totalAmount,
				correlationId: record.correlationId,
				currencyCode: invoice.currencyCode,
				entityId: invoice.id,
				organizationId: invoice.organizationId,
				supplierId: invoice.supplierId,
			},
			type: "payables.invoice.matched.v1",
		});
		if (!emitted.ok) {
			this.invoices.set(invoice.id, previous);
			return emitted;
		}
		return errorResult.ok(cloneInvoice(invoice));
	}

	async postInvoice(
		record: Parameters<PayablesStore["postInvoice"]>[0],
	): Promise<Result<SupplierInvoice>> {
		const found = this.findInvoice(record.organizationId, record.invoiceId);
		if (!found.ok) {
			return found;
		}
		const invoice = found.data;
		if (invoice.status !== "matched" || invoice.documentType !== "invoice") {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Supplier invoice must be matched before posting",
			});
		}
		if (invoice.version !== record.expectedVersion) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Supplier invoice version conflict",
			});
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
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
			organizationId: invoice.organizationId,
			payload: {
				actorId: record.actorUserId,
				amount: invoice.totalAmount,
				correlationId: record.correlationId,
				currencyCode: invoice.currencyCode,
				entityId: invoice.id,
				organizationId: invoice.organizationId,
				supplierId: invoice.supplierId,
			},
			type: "payables.invoice.posted.v1",
		});
		if (!emitted.ok) {
			this.invoices.set(invoice.id, previous);
			this.balances.clear();
			for (const [key, value] of previousBalances) {
				this.balances.set(key, value);
			}
			return emitted;
		}
		return errorResult.ok(cloneInvoice(invoice));
	}

	createCredit(
		record: SupplierInvoiceCreateRecord,
	): Promise<Result<SupplierInvoice>> {
		const created = this.newInvoice(record);
		if (!created.ok) {
			return resolveResult(created);
		}
		this.invoices.set(created.data.id, created.data);
		return resolveResult(errorResult.ok(cloneInvoice(created.data)));
	}

	addCreditLine(
		record: Parameters<PayablesStore["addCreditLine"]>[0],
	): Promise<Result<SupplierInvoiceLine>> {
		return this.addLine({ ...record, invoiceId: record.creditNoteId });
	}

	async postCredit(
		record: Parameters<PayablesStore["postCredit"]>[0],
	): Promise<Result<SupplierInvoice>> {
		const found = this.findInvoice(record.organizationId, record.creditNoteId);
		if (!found.ok) {
			return found;
		}
		const invoice = found.data;
		if (invoice.documentType !== "credit_note" || invoice.status !== "draft") {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Only draft supplier credit notes can be posted",
			});
		}
		if (
			invoice.version !== record.expectedVersion ||
			decimal(invoice.totalAmount) <= 0n
		) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Supplier credit note post conflict",
			});
		}
		const previousBalances = new Map(this.balances);
		const now = new Date();
		invoice.status = "posted";
		invoice.openAmount = invoice.totalAmount;
		invoice.postedAt = now;
		invoice.postedBy = record.actorUserId;
		invoice.updatedAt = now;
		invoice.updatedBy = record.actorUserId;
		invoice.version += 1;
		this.adjustBalance(invoice, -decimal(invoice.totalAmount));
		const emitted = await record.effects.emit({
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
			organizationId: invoice.organizationId,
			payload: {
				actorId: record.actorUserId,
				amount: invoice.totalAmount,
				correlationId: record.correlationId,
				currencyCode: invoice.currencyCode,
				entityId: invoice.id,
				organizationId: invoice.organizationId,
				supplierId: invoice.supplierId,
			},
			type: "payables.credit_note.posted.v1",
		});
		if (!emitted.ok) {
			invoice.status = "draft";
			invoice.openAmount = "0";
			invoice.postedAt = null;
			invoice.postedBy = null;
			invoice.version -= 1;
			this.balances.clear();
			for (const [key, value] of previousBalances) {
				this.balances.set(key, value);
			}
			return emitted;
		}
		return errorResult.ok(cloneInvoice(invoice));
	}

	async applyPayment(
		record: Parameters<PayablesStore["applyPayment"]>[0],
	): Promise<Result<SupplierAllocation>> {
		const found = this.findInvoice(record.organizationId, record.invoiceId);
		if (!found.ok) {
			return found;
		}
		const invoice = found.data;
		const amount = decimal(record.amount);
		if (invoice.status !== "posted" || invoice.documentType !== "invoice") {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Payment application requires a posted supplier invoice",
			});
		}
		if (amount <= 0n || amount > decimal(invoice.openAmount)) {
			return errorResult.fail("CONFLICT", {
				publicMessage:
					"Payment application exceeds supplier invoice open amount",
			});
		}
		const replay = [...this.allocations.values()].find(
			(candidateAllocation) =>
				candidateAllocation.organizationId === record.organizationId &&
				candidateAllocation.applyIdempotencyKey === record.idempotencyKey,
		);
		if (replay !== undefined) {
			return errorResult.ok({ ...replay });
		}
		const previous = cloneInvoice(invoice);
		const previousBalances = new Map(this.balances);
		const allocation: SupplierAllocation = {
			amount: record.amount,
			applyIdempotencyKey: record.idempotencyKey,
			createdAt: new Date(),
			createdBy: record.actorUserId,
			creditNoteId: null,
			id: randomUUID(),
			invoiceId: invoice.id,
			organizationId: record.organizationId,
			paymentApplicationInstructionId: record.paymentApplicationInstructionId,
			paymentId: record.paymentId,
			reversedAt: null,
			reversedBy: null,
			status: "active",
			supplierId: invoice.supplierId,
		};
		invoice.openAmount = format(decimal(invoice.openAmount) - amount);
		invoice.version += 1;
		invoice.updatedAt = allocation.createdAt;
		invoice.updatedBy = record.actorUserId;
		this.allocations.set(allocation.id, allocation);
		this.adjustBalance(invoice, -amount);
		const emitted = await record.effects.emit({
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
			organizationId: invoice.organizationId,
			payload: {
				actorId: record.actorUserId,
				amount: record.amount,
				correlationId: record.correlationId,
				currencyCode: invoice.currencyCode,
				entityId: allocation.id,
				organizationId: invoice.organizationId,
				supplierId: invoice.supplierId,
			},
			type: "payables.allocation.posted.v1",
		});
		if (!emitted.ok) {
			this.invoices.set(invoice.id, previous);
			this.allocations.delete(allocation.id);
			this.balances.clear();
			for (const [key, value] of previousBalances) {
				this.balances.set(key, value);
			}
			return emitted;
		}
		return errorResult.ok({ ...allocation });
	}

	applyCredit(
		record: Parameters<PayablesStore["applyCredit"]>[0],
	): Promise<Result<SupplierAllocation>> {
		const invoiceResult = this.findInvoice(
			record.organizationId,
			record.invoiceId,
		);
		if (!invoiceResult.ok) {
			return resolveResult(invoiceResult);
		}
		const creditResult = this.findInvoice(
			record.organizationId,
			record.creditNoteId,
		);
		if (!creditResult.ok) {
			return resolveResult(creditResult);
		}
		const invoice = invoiceResult.data;
		const credit = creditResult.data;
		if (
			invoice.status !== "posted" ||
			invoice.documentType !== "invoice" ||
			credit.status !== "posted" ||
			credit.documentType !== "credit_note" ||
			invoice.supplierId !== credit.supplierId ||
			invoice.currencyCode !== credit.currencyCode
		) {
			return resolveResult(
				errorResult.fail("CONFLICT", {
					publicMessage:
						"Supplier credit application requires matching posted documents",
				}),
			);
		}
		const replay = [...this.allocations.values()].find(
			(candidateAllocation) =>
				candidateAllocation.organizationId === record.organizationId &&
				candidateAllocation.applyIdempotencyKey === record.idempotencyKey,
		);
		if (replay !== undefined) {
			return resolveResult(errorResult.ok({ ...replay }));
		}
		const amount = decimal(record.amount);
		if (
			amount <= 0n ||
			amount > decimal(invoice.openAmount) ||
			amount > decimal(credit.openAmount)
		) {
			return resolveResult(
				errorResult.fail("CONFLICT", {
					publicMessage: "Supplier credit application exceeds an open amount",
				}),
			);
		}
		const now = new Date();
		const allocation: SupplierAllocation = {
			amount: record.amount,
			applyIdempotencyKey: record.idempotencyKey,
			createdAt: now,
			createdBy: record.actorUserId,
			creditNoteId: credit.id,
			id: randomUUID(),
			invoiceId: invoice.id,
			organizationId: record.organizationId,
			paymentApplicationInstructionId: null,
			paymentId: null,
			reversedAt: null,
			reversedBy: null,
			status: "active",
			supplierId: invoice.supplierId,
		};
		invoice.openAmount = format(decimal(invoice.openAmount) - amount);
		credit.openAmount = format(decimal(credit.openAmount) - amount);
		invoice.version += 1;
		credit.version += 1;
		invoice.updatedAt = now;
		credit.updatedAt = now;
		invoice.updatedBy = record.actorUserId;
		credit.updatedBy = record.actorUserId;
		this.allocations.set(allocation.id, allocation);
		this.adjustBalance(invoice, -amount);
		return resolveResult(errorResult.ok({ ...allocation }));
	}

	async reversePaymentApplication(
		record: Parameters<PayablesStore["reversePaymentApplication"]>[0],
	): Promise<Result<SupplierAllocation[]>> {
		const allocations = [...this.allocations.values()].filter(
			(allocation) =>
				allocation.organizationId === record.organizationId &&
				allocation.paymentId === record.paymentId &&
				allocation.status === "active",
		);
		const invoices = new Map<string, SupplierInvoice>();
		const balances = new Map(this.balances);
		const previousAllocations = allocations.map((allocation) => ({
			...allocation,
		}));
		const reversed = await runSequentially(allocations, (allocation) => {
			const found = this.findInvoice(
				record.organizationId,
				allocation.invoiceId,
			);
			if (!found.ok) {
				return resolveResult(errorResult.fail("INTERNAL_ERROR"));
			}
			const invoice = found.data;
			invoices.set(invoice.id, cloneInvoice(invoice));
			const amount = decimal(allocation.amount);
			invoice.openAmount = format(decimal(invoice.openAmount) + amount);
			invoice.version += 1;
			invoice.updatedBy = record.actorUserId;
			invoice.updatedAt = new Date();
			this.adjustBalance(invoice, amount);
			allocation.status = "reversed";
			allocation.reversedAt = new Date();
			allocation.reversedBy = record.actorUserId;
			return record.effects.emit({
				actorUserId: record.actorUserId,
				correlationId: record.correlationId,
				organizationId: invoice.organizationId,
				payload: {
					actorId: record.actorUserId,
					amount: allocation.amount,
					correlationId: record.correlationId,
					currencyCode: invoice.currencyCode,
					entityId: allocation.id,
					organizationId: invoice.organizationId,
					supplierId: invoice.supplierId,
				},
				type: "payables.payment_application.reversed.v1",
			});
		});
		if (!reversed.ok) {
			for (const [id, previous] of invoices) {
				this.invoices.set(id, previous);
			}
			this.balances.clear();
			for (const [key, balance] of balances) {
				this.balances.set(key, balance);
			}
			for (const previous of previousAllocations) {
				this.allocations.set(previous.id, previous);
			}
			return reversed;
		}
		return errorResult.ok(allocations.map((allocation) => ({ ...allocation })));
	}

	async cancel(
		record: Parameters<PayablesStore["cancel"]>[0],
	): Promise<Result<SupplierInvoice>> {
		const found = this.findInvoice(record.organizationId, record.invoiceId);
		if (!found.ok) {
			return found;
		}
		const invoice = found.data;
		if (invoice.status === "cancelled") {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Supplier invoice is already cancelled",
			});
		}
		if (invoice.version !== record.expectedVersion) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Supplier invoice version conflict",
			});
		}
		if (invoice.status !== "draft" && invoice.status !== "matched") {
			return errorResult.fail("CONFLICT", {
				publicMessage:
					"Only draft or matched supplier invoices may be cancelled",
			});
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
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
			organizationId: invoice.organizationId,
			payload: {
				actorId: record.actorUserId,
				amount: invoice.totalAmount,
				correlationId: record.correlationId,
				currencyCode: invoice.currencyCode,
				entityId: invoice.id,
				organizationId: invoice.organizationId,
				supplierId: invoice.supplierId,
			},
			type: "payables.invoice.cancelled.v1",
		});
		if (!emitted.ok) {
			this.invoices.set(invoice.id, previous);
			return emitted;
		}
		return errorResult.ok(cloneInvoice(invoice));
	}

	getById(
		organizationId: string,
		id: string,
	): Promise<Result<SupplierInvoice | null>> {
		const invoice = this.invoices.get(id);
		return resolveResult(
			errorResult.ok(
				invoice !== undefined && invoice.organizationId === organizationId
					? cloneInvoice(invoice)
					: null,
			),
		);
	}

	list(
		filter: Parameters<PayablesStore["list"]>[0],
	): Promise<Result<SupplierInvoice[]>> {
		const start = (filter.page - 1) * filter.pageSize;
		return resolveResult(
			errorResult.ok(
				[...this.invoices.values()]
					.filter((row) => row.organizationId === filter.organizationId)
					.filter(
						(row) =>
							filter.status === undefined || row.status === filter.status,
					)
					.filter(
						(row) =>
							filter.supplierId === undefined ||
							row.supplierId === filter.supplierId,
					)
					.filter(
						(row) =>
							filter.currencyCode === undefined ||
							row.currencyCode === filter.currencyCode,
					)
					.filter(
						(row) =>
							filter.documentType === undefined ||
							row.documentType === filter.documentType,
					)
					.sort(
						(a, b) =>
							b.updatedAt.getTime() - a.updatedAt.getTime() ||
							b.id.localeCompare(a.id),
					)
					.slice(start, start + filter.pageSize)
					.map(cloneInvoice),
			),
		);
	}

	getBalance(
		organizationId: string,
		supplierId: string,
		currencyCode?: string,
	): Promise<Result<SupplierBalance[]>> {
		return resolveResult(
			errorResult.ok(
				[...this.balances.values()]
					.filter((row) => row.organizationId === organizationId)
					.filter((row) => row.supplierId === supplierId)
					.filter(
						(row) =>
							currencyCode === undefined || row.currencyCode === currencyCode,
					)
					.map((row) => {
						const documents = [...this.invoices.values()].filter(
							(document) =>
								document.organizationId === row.organizationId &&
								document.supplierId === row.supplierId &&
								document.currencyCode === row.currencyCode &&
								document.status === "posted",
						);
						const invoicedAmount = documents
							.filter((document) => document.documentType === "invoice")
							.reduce(
								(total, document) => total + decimal(document.totalAmount),
								0n,
							);
						const creditedAmount = documents
							.filter((document) => document.documentType === "credit_note")
							.reduce(
								(total, document) => total + decimal(document.totalAmount),
								0n,
							);
						const paidAmount = [...this.allocations.values()]
							.filter(
								(allocation) =>
									allocation.organizationId === row.organizationId &&
									allocation.supplierId === row.supplierId &&
									allocation.status === "active" &&
									allocation.paymentId !== null,
							)
							.reduce(
								(total, allocation) => total + decimal(allocation.amount),
								0n,
							);
						return {
							...row,
							asOf: new Date(),
							creditedAmount: format(creditedAmount),
							invoicedAmount: format(invoicedAmount),
							outstandingAmount: row.openBalance,
							paidAmount: format(paidAmount),
						};
					}),
			),
		);
	}
}

export function createMemoryPayablesStore(): MemoryPayablesStore {
	return new MemoryPayablesStore();
}
