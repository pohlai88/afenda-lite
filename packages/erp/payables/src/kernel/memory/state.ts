import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";
import type {
	SupplierAllocation,
	SupplierBalance,
	SupplierInvoice,
	SupplierInvoiceCreateRecord,
} from "../contracts/domain";
import { decimal, format } from "../money";

/**
 * Shared in-memory domain state for the parity adapter.
 * Package-wide kernel primitive: several feature memory slices operate on the
 * same invoice/allocation/balance maps, so the state shape and its invariant
 * helpers have one owner here instead of N structural copies.
 */
export interface MemoryPayablesState {
	allocations: Map<string, SupplierAllocation>;
	balances: Map<string, SupplierBalance>;
	invoices: Map<string, SupplierInvoice>;
}

export function createMemoryPayablesState(): MemoryPayablesState {
	return {
		allocations: new Map(),
		balances: new Map(),
		invoices: new Map(),
	};
}

export function cloneInvoice(invoice: SupplierInvoice): SupplierInvoice {
	return {
		...invoice,
		lines: invoice.lines.map((line) => ({ ...line })),
		matchResult:
			invoice.matchResult === null ? null : { ...invoice.matchResult },
	};
}

export function findInvoice(
	state: MemoryPayablesState,
	organizationId: string,
	invoiceId: string,
): Result<SupplierInvoice> {
	const invoice = state.invoices.get(invoiceId);
	return invoice === undefined || invoice.organizationId !== organizationId
		? errorResult.fail("NOT_FOUND", {
				publicMessage: "Supplier invoice not found",
			})
		: errorResult.ok(invoice);
}

export function adjustBalance(
	state: MemoryPayablesState,
	invoice: SupplierInvoice,
	amount: bigint,
): void {
	const key = `${invoice.organizationId}:${invoice.supplierId}:${invoice.currencyCode}`;
	const existing = state.balances.get(key);
	state.balances.set(key, {
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

export function newInvoice(
	state: MemoryPayablesState,
	record: SupplierInvoiceCreateRecord,
): Result<SupplierInvoice> {
	for (const invoice of state.invoices.values()) {
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

export function resolveResult<T>(result: Result<T>): Promise<Result<T>> {
	return Promise.resolve(result);
}
