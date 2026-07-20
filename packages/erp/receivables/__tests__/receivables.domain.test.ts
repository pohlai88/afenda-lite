import { ok } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";

import {
	addSalesInvoiceLine,
	allocateCustomerReceipt,
	cancelSalesInvoice,
	createDraftSalesInvoice,
	createMemoryReceivablesStore,
	getCustomerBalance,
	issueCreditNote,
	postSalesInvoice,
} from "../src/index";

const organizationId = "org-1";
const actorUserId = "user-1";
const customerId = "00000000-0000-4000-8000-000000000001";
const itemId = "00000000-0000-4000-8000-000000000002";
const authorization = { async can() { return true; } };
const effects = { async emit() { return ok(undefined); } };

describe("receivables lifecycle", () => {
	it("posts, allocates, credits, and reverses posted balance on cancel", async () => {
		const store = createMemoryReceivablesStore();
		const options = { store, authorization, effects };
		const created = await createDraftSalesInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "corr-create",
				code: "INV-1",
				customerId,
				customerCode: "C-1",
				customerName: "Customer One",
				currencyCode: "usd",
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
				invoiceId: created.data.id,
				itemId,
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
				invoiceId: created.data.id,
				expectedVersion: 2,
			},
			options,
		);
		expect(posted.ok && posted.data.openAmount).toBe("100");

		const allocated = await allocateCustomerReceipt(
			{
				organizationId,
				actorUserId,
				correlationId: "corr-allocate",
				invoiceId: created.data.id,
				amount: "25",
			},
			options,
		);
		expect(allocated.ok).toBe(true);

		const credit = await issueCreditNote(
			{
				organizationId,
				actorUserId,
				correlationId: "corr-credit",
				code: "CN-1",
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

		const cancellable = await createDraftSalesInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "corr-cancellable",
				code: "INV-2",
				customerId,
				customerCode: "C-1",
				customerName: "Customer One",
				currencyCode: "USD",
			},
			options,
		);
		if (!cancellable.ok) return;
		await addSalesInvoiceLine(
			{
				organizationId,
				actorUserId,
				correlationId: "corr-cancellable-line",
				invoiceId: cancellable.data.id,
				itemId,
				description: "Cancellation test",
				quantity: "1",
				unitPrice: "20",
			},
			options,
		);
		await postSalesInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "corr-cancellable-post",
				invoiceId: cancellable.data.id,
				expectedVersion: 2,
			},
			options,
		);
		const cancelled = await cancelSalesInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "corr-cancel",
				invoiceId: cancellable.data.id,
				expectedVersion: 3,
			},
			options,
		);
		expect(cancelled.ok).toBe(true);
		const finalBalance = await getCustomerBalance(
			{ organizationId, actorUserId, customerId },
			options,
		);
		expect(finalBalance.ok && finalBalance.data[0]?.openBalance).toBe("65");
	});
});
