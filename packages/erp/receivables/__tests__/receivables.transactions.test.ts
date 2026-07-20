import { fail, ok } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";

import {
	addSalesInvoiceLine,
	createDraftSalesInvoice,
	createMemoryReceivablesStore,
	getCustomerBalance,
	getSalesInvoiceById,
	postSalesInvoice,
} from "../src/index";

describe("receivables transaction rollback", () => {
	it("rolls back invoice and balance when outbox emission fails", async () => {
		const store = createMemoryReceivablesStore();
		const authorization = { async can() { return true; } };
		const organizationId = "org-1";
		const actorUserId = "user-1";
		const customerId = "00000000-0000-4000-8000-000000000001";
		const common = { store, authorization };
		const created = await createDraftSalesInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "create",
				code: "INV-ROLLBACK",
				customerId,
				customerCode: "C-1",
				customerName: "Customer",
				currencyCode: "USD",
			},
			common,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;
		await addSalesInvoiceLine(
			{
				organizationId,
				actorUserId,
				correlationId: "line",
				invoiceId: created.data.id,
				itemId: "00000000-0000-4000-8000-000000000002",
				description: "Line",
				quantity: "1",
				unitPrice: "40",
			},
			common,
		);
		const posted = await postSalesInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "post",
				invoiceId: created.data.id,
				expectedVersion: 2,
			},
			{
				...common,
				effects: { async emit() { return fail("INTERNAL_ERROR", "outbox failed"); } },
			},
		);
		expect(posted.ok).toBe(false);
		const invoice = await getSalesInvoiceById(
			{ organizationId, actorUserId, id: created.data.id },
			common,
		);
		expect(invoice.ok && invoice.data?.status).toBe("draft");
		const balance = await getCustomerBalance(
			{ organizationId, actorUserId, customerId },
			common,
		);
		expect(balance.ok && balance.data).toEqual([]);
		expect(ok(undefined).ok).toBe(true);
	});
});
