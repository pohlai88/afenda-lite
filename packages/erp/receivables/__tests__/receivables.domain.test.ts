import { ok } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";

import {
	addSalesInvoiceLine,
	applyCustomerReceipt,
	cancelDraftSalesInvoice,
	closeSalesInvoice,
	createDraftSalesInvoice,
	createMemoryReceivablesStore,
	getCustomerAging,
	getCustomerBalance,
	issueCreditNote,
	postSalesInvoice,
} from "../src/index";

const organizationId = "org-1";
const actorUserId = "user-1";
const customerId = "00000000-0000-4000-8000-000000000001";
const itemId = "00000000-0000-4000-8000-000000000002";
const paymentId = "00000000-0000-4000-8000-000000000010";
const instructionId = "00000000-0000-4000-8000-000000000011";
const authorization = {
	async can() {
		return true;
	},
};
const effects = {
	async emit() {
		return ok(undefined);
	},
};

describe("receivables lifecycle", () => {
	it("posts, applies receipt, credits, closes, and rejects posted cancel", async () => {
		const store = createMemoryReceivablesStore();
		const options = { store, authorization, effects };
		const created = await createDraftSalesInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "corr-create",
				idempotencyKey: "idem-create-1",
				code: "INV-1",
				customerId,
				customerCode: "C-1",
				customerName: "Customer One",
				currencyCode: "usd",
				invoiceSource: "manual",
				manualReason: "Opening commercial invoice",
				dueDate: new Date("2026-01-01T00:00:00.000Z"),
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const line = await addSalesInvoiceLine(
			{
				organizationId,
				actorUserId,
				correlationId: "corr-line",
				idempotencyKey: "idem-line-1",
				invoiceId: created.data.id,
				itemId,
				itemCode: "ITEM-1",
				itemName: "Consulting",
				description: "Consulting",
				quantity: "2",
				unitPrice: "50",
			},
			options,
		);
		expect(line.ok).toBe(true);

		const posted = await postSalesInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "corr-post",
				idempotencyKey: "idem-post-1",
				invoiceId: created.data.id,
				expectedVersion: 2,
			},
			options,
		);
		expect(posted.ok && posted.data.openAmount).toBe("100");

		const applied = await applyCustomerReceipt(
			{
				organizationId,
				actorUserId,
				correlationId: "corr-apply",
				idempotencyKey: "idem-apply-1",
				paymentId,
				paymentApplicationInstructionId: instructionId,
				salesInvoiceId: created.data.id,
				amount: "25",
				expectedInvoiceVersion: 3,
			},
			options,
		);
		expect(applied.ok).toBe(true);

		const credit = await issueCreditNote(
			{
				organizationId,
				actorUserId,
				correlationId: "corr-credit",
				idempotencyKey: "idem-credit-1",
				code: "CN-1",
				salesInvoiceId: created.data.id,
				customerId,
				customerCode: "C-1",
				customerName: "Customer One",
				currencyCode: "USD",
				amount: "10",
			},
			options,
		);
		expect(credit.ok && credit.data.status).toBe("posted");

		const balance = await getCustomerBalance(
			{ organizationId, actorUserId, customerId, currencyCode: "USD" },
			options,
		);
		expect(balance.ok && balance.data[0]?.openBalance).toBe("65");

		const aging = await getCustomerAging(
			{
				organizationId,
				actorUserId,
				customerId,
				currencyCode: "USD",
				asOfDate: "2026-07-01",
			},
			options,
		);
		expect(aging.ok && aging.data.totalOpen).toBe("65");

		const rejectPostedCancel = await cancelDraftSalesInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "corr-cancel-posted",
				idempotencyKey: "idem-cancel-posted",
				invoiceId: created.data.id,
				expectedVersion: 4,
			},
			options,
		);
		expect(rejectPostedCancel.ok).toBe(false);

		const draft = await createDraftSalesInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "corr-draft-cancel",
				idempotencyKey: "idem-create-2",
				code: "INV-2",
				customerId,
				customerCode: "C-1",
				customerName: "Customer One",
				currencyCode: "USD",
				invoiceSource: "manual",
				manualReason: "Cancel draft test",
			},
			options,
		);
		if (!draft.ok) return;
		const cancelled = await cancelDraftSalesInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "corr-cancel-draft",
				idempotencyKey: "idem-cancel-draft",
				invoiceId: draft.data.id,
				expectedVersion: 1,
			},
			options,
		);
		expect(cancelled.ok && cancelled.data.status).toBe("cancelled");

		const settle = await applyCustomerReceipt(
			{
				organizationId,
				actorUserId,
				correlationId: "corr-apply-rest",
				idempotencyKey: "idem-apply-2",
				paymentId: "00000000-0000-4000-8000-000000000012",
				paymentApplicationInstructionId: "00000000-0000-4000-8000-000000000013",
				salesInvoiceId: created.data.id,
				amount: "65",
				expectedInvoiceVersion: 5,
			},
			options,
		);
		expect(settle.ok).toBe(true);
		const closed = await closeSalesInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "corr-close",
				idempotencyKey: "idem-close-1",
				invoiceId: created.data.id,
				expectedVersion: 6,
			},
			options,
		);
		expect(closed.ok && closed.data.status).toBe("closed");
	});
});
