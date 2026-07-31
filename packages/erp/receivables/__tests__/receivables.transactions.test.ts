import { errorResult } from "@afenda/errors";
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
		const authorization = {
			can() {
				return Promise.resolve(true);
			},
		};
		const organizationId = "org-1";
		const actorUserId = "user-1";
		const customerId = "00000000-0000-4000-8000-000000000001";
		const common = {
			store,
			authorization,
			effects: {
				emit() {
					return Promise.resolve(errorResult.ok(undefined));
				},
			},
		};
		const created = await createDraftSalesInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "create",
				idempotencyKey: "idem-tx-create",
				code: "INV-ROLLBACK",
				customerId,
				customerCode: "C-1",
				customerName: "Customer",
				currencyCode: "USD",
				invoiceSource: "manual",
				manualReason: "Rollback test",
			},
			common,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		await addSalesInvoiceLine(
			{
				organizationId,
				actorUserId,
				correlationId: "line",
				idempotencyKey: "idem-tx-line",
				invoiceId: created.data.id,
				itemId: "00000000-0000-4000-8000-000000000002",
				itemCode: "ITEM-1",
				itemName: "Line",
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
				idempotencyKey: "idem-tx-post",
				invoiceId: created.data.id,
				expectedVersion: 2,
			},
			{
				...common,
				effects: {
					emit() {
						return Promise.resolve(errorResult.fail("INTERNAL_ERROR"));
					},
				},
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
		expect(errorResult.ok(undefined).ok).toBe(true);
	});
});
