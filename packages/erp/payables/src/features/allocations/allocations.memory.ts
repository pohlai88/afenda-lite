import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";

import type {
	SupplierAllocation,
	SupplierInvoice,
} from "../../kernel/contracts/domain";
import {
	adjustBalance,
	cloneInvoice,
	findInvoice,
	type MemoryPayablesState,
	resolveResult,
} from "../../kernel/memory/state";
import { decimal, format } from "../../kernel/money";
import type { PayablesAllocationsStore } from "./allocations.store";

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

export function createMemoryAllocationMethods(
	state: MemoryPayablesState,
): PayablesAllocationsStore {
	return {
		async applyPayment(
			record: Parameters<PayablesAllocationsStore["applyPayment"]>[0],
		): Promise<Result<SupplierAllocation>> {
			const found = findInvoice(state, record.organizationId, record.invoiceId);
			if (!found.ok) {
				return found;
			}
			const invoice = found.data;
			const amount = decimal(record.amount);
			if (invoice.status !== "posted" || invoice.documentType !== "invoice") {
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"Payment application requires a posted supplier invoice",
				});
			}
			if (amount <= 0n || amount > decimal(invoice.openAmount)) {
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"Payment application exceeds supplier invoice open amount",
				});
			}
			const replay = [...state.allocations.values()].find(
				(candidateAllocation) =>
					candidateAllocation.organizationId === record.organizationId &&
					candidateAllocation.applyIdempotencyKey === record.idempotencyKey,
			);
			if (replay !== undefined) {
				return errorResult.ok({ ...replay });
			}
			const previous = cloneInvoice(invoice);
			const previousBalances = new Map(state.balances);
			const allocation: SupplierAllocation = {
				amount: record.amount,
				applyIdempotencyKey: record.idempotencyKey,
				createdAt: new Date(),
				createdBy: record.actorUserId,
				creditNoteId: null,
				id: randomUUID(),
				invoiceId: invoice.id,
				organizationId: record.organizationId,
				paymentApplicationInstructionId:
					record.paymentApplicationInstructionId,
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
			state.allocations.set(allocation.id, allocation);
			adjustBalance(state, invoice, -amount);
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
				state.invoices.set(invoice.id, previous);
				state.allocations.delete(allocation.id);
				state.balances.clear();
				for (const [key, value] of previousBalances) {
					state.balances.set(key, value);
				}
				return emitted;
			}
			return errorResult.ok({ ...allocation });
		},

		async applyCredit(
			record: Parameters<PayablesAllocationsStore["applyCredit"]>[0],
		): Promise<Result<SupplierAllocation>> {
			const invoiceResult = findInvoice(
				state,
				record.organizationId,
				record.invoiceId,
			);
			if (!invoiceResult.ok) {
				return invoiceResult;
			}
			const creditResult = findInvoice(
				state,
				record.organizationId,
				record.creditNoteId,
			);
			if (!creditResult.ok) {
				return creditResult;
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
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"Supplier credit application requires matching posted documents",
				});
			}
			const replay = [...state.allocations.values()].find(
				(candidateAllocation) =>
					candidateAllocation.organizationId === record.organizationId &&
					candidateAllocation.applyIdempotencyKey === record.idempotencyKey,
			);
			if (replay !== undefined) {
				return errorResult.ok({ ...replay });
			}
			const amount = decimal(record.amount);
			if (
				amount <= 0n ||
				amount > decimal(invoice.openAmount) ||
				amount > decimal(credit.openAmount)
			) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Supplier credit application exceeds an open amount",
				});
			}
			const previousInvoice = cloneInvoice(invoice);
			const previousCredit = cloneInvoice(credit);
			const previousBalances = new Map(state.balances);
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
			state.allocations.set(allocation.id, allocation);
			adjustBalance(state, invoice, -amount);
			// Mode B fix: credit application now emits the declared
			// payables.allocation.posted.v1 event (parity with applyPayment).
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
				state.invoices.set(invoice.id, previousInvoice);
				state.invoices.set(credit.id, previousCredit);
				state.allocations.delete(allocation.id);
				state.balances.clear();
				for (const [key, value] of previousBalances) {
					state.balances.set(key, value);
				}
				return emitted;
			}
			return errorResult.ok({ ...allocation });
		},

		async reversePaymentApplication(
			record: Parameters<
				PayablesAllocationsStore["reversePaymentApplication"]
			>[0],
		): Promise<Result<SupplierAllocation[]>> {
			const allocations = [...state.allocations.values()].filter(
				(allocation) =>
					allocation.organizationId === record.organizationId &&
					allocation.paymentId === record.paymentId &&
					allocation.status === "active",
			);
			const invoices = new Map<string, SupplierInvoice>();
			const balances = new Map(state.balances);
			const previousAllocations = allocations.map((allocation) => ({
				...allocation,
			}));
			const reversed = await runSequentially(allocations, (allocation) => {
				const found = findInvoice(
					state,
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
				adjustBalance(state, invoice, amount);
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
					state.invoices.set(id, previous);
				}
				state.balances.clear();
				for (const [key, balance] of balances) {
					state.balances.set(key, balance);
				}
				for (const previous of previousAllocations) {
					state.allocations.set(previous.id, previous);
				}
				return reversed;
			}
			return errorResult.ok(
				allocations.map((allocation) => ({ ...allocation })),
			);
		},
	};
}
