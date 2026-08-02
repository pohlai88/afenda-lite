import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";

import type {
	SupplierInvoice,
	SupplierInvoiceCreateRecord,
	SupplierInvoiceLine,
	ThreeWayMatchResult,
} from "../../kernel/contracts/domain";
import {
	adjustBalance,
	cloneInvoice,
	findInvoice,
	type MemoryPayablesState,
	newInvoice,
	resolveResult,
} from "../../kernel/memory/state";
import { decimal, format, multiply } from "../../kernel/money";
import type { PayablesInvoiceLifecycleStore } from "./invoice-lifecycle.store";

export function createMemoryInvoiceLifecycleMethods(
	state: MemoryPayablesState,
): PayablesInvoiceLifecycleStore {
	return {
		async createInvoice(
			record: SupplierInvoiceCreateRecord,
		): Promise<Result<SupplierInvoice>> {
			const created = newInvoice(state, record);
			if (!created.ok) {
				return created;
			}
			state.invoices.set(created.data.id, created.data);
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
				state.invoices.delete(created.data.id);
				return emitted;
			}
			return errorResult.ok(cloneInvoice(created.data));
		},

		addLine(
			record: Parameters<PayablesInvoiceLifecycleStore["addLine"]>[0],
		): Promise<Result<SupplierInvoiceLine>> {
			const found = findInvoice(state, record.organizationId, record.invoiceId);
			if (!found.ok) {
				return resolveResult(found);
			}
			const invoice = found.data;
			if (invoice.status !== "draft") {
				return resolveResult(
					errorResult.fail("CONFLICT", {
						publicMessage:
							"Lines can only be added to draft supplier documents",
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
				invoice.lines.reduce(
					(total, row) => total + decimal(row.lineAmount),
					0n,
				),
			);
			invoice.version += 1;
			invoice.updatedBy = record.actorUserId;
			invoice.updatedAt = now;
			return resolveResult(errorResult.ok({ ...line }));
		},

		async matchInvoice(
			record: Parameters<PayablesInvoiceLifecycleStore["matchInvoice"]>[0],
		): Promise<Result<SupplierInvoice>> {
			const found = findInvoice(state, record.organizationId, record.invoiceId);
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
				state.invoices.set(invoice.id, previous);
				return emitted;
			}
			return errorResult.ok(cloneInvoice(invoice));
		},

		async postInvoice(
			record: Parameters<PayablesInvoiceLifecycleStore["postInvoice"]>[0],
		): Promise<Result<SupplierInvoice>> {
			const found = findInvoice(state, record.organizationId, record.invoiceId);
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
			const previousBalances = new Map(state.balances);
			const now = new Date();
			invoice.status = "posted";
			invoice.openAmount = invoice.totalAmount;
			invoice.postedAt = now;
			invoice.postedBy = record.actorUserId;
			invoice.updatedAt = now;
			invoice.updatedBy = record.actorUserId;
			invoice.version += 1;
			adjustBalance(state, invoice, decimal(invoice.totalAmount));
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
				state.invoices.set(invoice.id, previous);
				state.balances.clear();
				for (const [key, value] of previousBalances) {
					state.balances.set(key, value);
				}
				return emitted;
			}
			return errorResult.ok(cloneInvoice(invoice));
		},

		async cancel(
			record: Parameters<PayablesInvoiceLifecycleStore["cancel"]>[0],
		): Promise<Result<SupplierInvoice>> {
			const found = findInvoice(state, record.organizationId, record.invoiceId);
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
				state.invoices.set(invoice.id, previous);
				return emitted;
			}
			return errorResult.ok(cloneInvoice(invoice));
		},

		getById(
			organizationId: string,
			id: string,
		): Promise<Result<SupplierInvoice | null>> {
			const invoice = state.invoices.get(id);
			return resolveResult(
				errorResult.ok(
					invoice !== undefined && invoice.organizationId === organizationId
						? cloneInvoice(invoice)
						: null,
				),
			);
		},

		list(
			filter: Parameters<PayablesInvoiceLifecycleStore["list"]>[0],
		): Promise<Result<SupplierInvoice[]>> {
			const start = (filter.page - 1) * filter.pageSize;
			return resolveResult(
				errorResult.ok(
					[...state.invoices.values()]
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
		},
	};
}
