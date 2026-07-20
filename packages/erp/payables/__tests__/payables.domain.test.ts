import { ok } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";

import {
	addSupplierInvoiceLine,
	allocateSupplierPayment,
	cancelSupplierInvoice,
	createDraftSupplierInvoice,
	createMemoryPayablesStore,
	getSupplierBalance,
	issueSupplierCreditNote,
	matchSupplierInvoice,
	postSupplierInvoice,
} from "../src/index";

const organizationId = "org-1";
const actorUserId = "user-1";
const supplierId = "00000000-0000-4000-8000-000000000001";
const itemId = "00000000-0000-4000-8000-000000000002";
const purchaseOrderId = "00000000-0000-4000-8000-000000000003";
const goodsReceiptId = "00000000-0000-4000-8000-000000000004";
const paymentId = "00000000-0000-4000-8000-000000000005";
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

describe("payables lifecycle", () => {
	it("matches before posting and updates supplier balance for every financial operation", async () => {
		const store = createMemoryPayablesStore();
		const options = { store, authorization, effects };
		const created = await createDraftSupplierInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "create",
				code: "SI-1",
				supplierId,
				supplierCode: "S-1",
				supplierName: "Supplier One",
				currencyCode: "usd",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;
		await addSupplierInvoiceLine(
			{
				organizationId,
				actorUserId,
				correlationId: "line",
				invoiceId: created.data.id,
				itemId,
				description: "Materials",
				quantity: "2",
				unitPrice: "50",
			},
			options,
		);
		const matched = await matchSupplierInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "match",
				invoiceId: created.data.id,
				purchaseOrderId,
				goodsReceiptId,
				expectedVersion: 2,
			},
			options,
		);
		expect(matched.ok && matched.data.status).toBe("matched");
		expect(matched.ok && matched.data.matchResult?.result).toBe("matched");
		const posted = await postSupplierInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "post",
				invoiceId: created.data.id,
				expectedVersion: 3,
			},
			options,
		);
		expect(posted.ok && posted.data.openAmount).toBe("100");
		await allocateSupplierPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "allocate",
				invoiceId: created.data.id,
				paymentId,
				amount: "25",
			},
			options,
		);
		await issueSupplierCreditNote(
			{
				organizationId,
				actorUserId,
				correlationId: "credit",
				code: "SCN-1",
				supplierId,
				supplierCode: "S-1",
				supplierName: "Supplier One",
				currencyCode: "USD",
				amount: "10",
			},
			options,
		);
		const balance = await getSupplierBalance(
			{ organizationId, actorUserId, supplierId, currencyCode: "USD" },
			options,
		);
		expect(balance.ok && balance.data[0]?.openBalance).toBe("65");

		const cancellable = await createDraftSupplierInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "create-cancel",
				code: "SI-2",
				supplierId,
				supplierCode: "S-1",
				supplierName: "Supplier One",
				currencyCode: "USD",
			},
			options,
		);
		if (!cancellable.ok) return;
		await addSupplierInvoiceLine(
			{
				organizationId,
				actorUserId,
				correlationId: "line-cancel",
				invoiceId: cancellable.data.id,
				itemId,
				description: "Cancellation",
				quantity: "1",
				unitPrice: "20",
			},
			options,
		);
		await matchSupplierInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "match-cancel",
				invoiceId: cancellable.data.id,
				purchaseOrderId,
				goodsReceiptId,
				expectedVersion: 2,
			},
			options,
		);
		await postSupplierInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "post-cancel",
				invoiceId: cancellable.data.id,
				expectedVersion: 3,
			},
			options,
		);
		const cancelled = await cancelSupplierInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "cancel",
				invoiceId: cancellable.data.id,
				expectedVersion: 4,
			},
			options,
		);
		expect(cancelled.ok).toBe(true);
		const finalBalance = await getSupplierBalance(
			{ organizationId, actorUserId, supplierId },
			options,
		);
		expect(finalBalance.ok && finalBalance.data[0]?.openBalance).toBe("65");
	});
});
