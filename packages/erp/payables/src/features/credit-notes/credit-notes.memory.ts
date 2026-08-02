import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";

import type {
	SupplierInvoice,
	SupplierInvoiceCreateRecord,
	SupplierInvoiceLine,
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
import type { PayablesCreditNotesStore } from "./credit-notes.store";

export function createMemoryCreditNoteMethods(
	state: MemoryPayablesState,
): PayablesCreditNotesStore {
	return {
		createCredit(
			record: SupplierInvoiceCreateRecord,
		): Promise<Result<SupplierInvoice>> {
			const created = newInvoice(state, record);
			if (!created.ok) {
				return resolveResult(created);
			}
			state.invoices.set(created.data.id, created.data);
			return resolveResult(errorResult.ok(cloneInvoice(created.data)));
		},

		addCreditLine(
			record: Parameters<PayablesCreditNotesStore["addCreditLine"]>[0],
		): Promise<Result<SupplierInvoiceLine>> {
			const found = findInvoice(
				state,
				record.organizationId,
				record.creditNoteId,
			);
			if (!found.ok) {
				return resolveResult(found);
			}
			const credit = found.data;
			if (credit.status !== "draft") {
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
				invoiceId: record.creditNoteId,
				itemId: record.itemId,
				lineAmount: multiply(record.quantity, record.unitPrice),
				lineNo: credit.lines.length + 1,
				organizationId: record.organizationId,
				quantity: record.quantity,
				unitPrice: record.unitPrice,
			};
			credit.lines.push(line);
			credit.totalAmount = format(
				credit.lines.reduce(
					(total, row) => total + decimal(row.lineAmount),
					0n,
				),
			);
			credit.version += 1;
			credit.updatedBy = record.actorUserId;
			credit.updatedAt = now;
			return resolveResult(errorResult.ok({ ...line }));
		},

		async postCredit(
			record: Parameters<PayablesCreditNotesStore["postCredit"]>[0],
		): Promise<Result<SupplierInvoice>> {
			const found = findInvoice(
				state,
				record.organizationId,
				record.creditNoteId,
			);
			if (!found.ok) {
				return found;
			}
			const credit = found.data;
			if (credit.documentType !== "credit_note" || credit.status !== "draft") {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Only draft supplier credit notes can be posted",
				});
			}
			if (
				credit.version !== record.expectedVersion ||
				decimal(credit.totalAmount) <= 0n
			) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Supplier credit note post conflict",
				});
			}
			const previousBalances = new Map(state.balances);
			const now = new Date();
			credit.status = "posted";
			credit.openAmount = credit.totalAmount;
			credit.postedAt = now;
			credit.postedBy = record.actorUserId;
			credit.updatedAt = now;
			credit.updatedBy = record.actorUserId;
			credit.version += 1;
			adjustBalance(state, credit, -decimal(credit.totalAmount));
			const emitted = await record.effects.emit({
				actorUserId: record.actorUserId,
				correlationId: record.correlationId,
				organizationId: credit.organizationId,
				payload: {
					actorId: record.actorUserId,
					amount: credit.totalAmount,
					correlationId: record.correlationId,
					currencyCode: credit.currencyCode,
					entityId: credit.id,
					organizationId: credit.organizationId,
					supplierId: credit.supplierId,
				},
				type: "payables.credit_note.posted.v1",
			});
			if (!emitted.ok) {
				credit.status = "draft";
				credit.openAmount = "0";
				credit.postedAt = null;
				credit.postedBy = null;
				credit.version -= 1;
				state.balances.clear();
				for (const [key, value] of previousBalances) {
					state.balances.set(key, value);
				}
				return emitted;
			}
			return errorResult.ok(cloneInvoice(credit));
		},
	};
}
