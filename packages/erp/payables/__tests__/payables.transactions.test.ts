import { fail, ok } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";

import {
	addSupplierInvoiceLine,
	createDraftSupplierInvoice,
	createMemoryPayablesStore,
	type GoodsReceiptMatchQueryPort,
	getSupplierInvoiceById,
	matchSupplierInvoice,
	type PurchaseOrderMatchQueryPort,
} from "../src/index";

const organizationId = "org-1";
const actorUserId = "user-1";
const supplierId = "00000000-0000-4000-8000-000000000001";
const itemId = "00000000-0000-4000-8000-000000000002";
const purchaseOrderId = "00000000-0000-4000-8000-000000000003";
const goodsReceiptId = "00000000-0000-4000-8000-000000000004";

const purchaseOrderMatch: PurchaseOrderMatchQueryPort = {
	async getPurchaseOrderMatchBasis() {
		return ok({
			purchaseOrderId,
			supplierPartyId: supplierId,
			status: "posted",
			currencyCode: "USD",
			version: 1,
			lines: [{ itemId, quantity: "10", unitPrice: "40" }],
		});
	},
};

const goodsReceiptMatch: GoodsReceiptMatchQueryPort = {
	async getGoodsReceiptMatchBasis() {
		return ok({
			goodsReceiptId,
			purchaseOrderId,
			status: "posted",
			sourceType: "purchase_order",
			sourceId: purchaseOrderId,
			version: 1,
			lines: [{ itemId, quantityReceived: "10" }],
		});
	},
};

describe("payables transaction rollback", () => {
	it("rolls back match state when event emission fails", async () => {
		const store = createMemoryPayablesStore();
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
		const common = {
			store,
			authorization,
			effects,
			purchaseOrderMatch,
			goodsReceiptMatch,
		};
		const created = await createDraftSupplierInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "create",
				code: "SI-ROLLBACK",
				supplierId,
				supplierCode: "S-1",
				supplierName: "Supplier",
				currencyCode: "USD",
			},
			common,
		);
		if (!created.ok) return;
		await addSupplierInvoiceLine(
			{
				organizationId,
				actorUserId,
				correlationId: "line",
				invoiceId: created.data.id,
				itemId,
				description: "Line",
				quantity: "1",
				unitPrice: "40",
			},
			common,
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
			{
				...common,
				effects: {
					async emit() {
						return fail("INTERNAL_ERROR", "outbox failed");
					},
				},
			},
		);
		expect(matched.ok).toBe(false);
		const invoice = await getSupplierInvoiceById(
			{ organizationId, actorUserId, id: created.data.id },
			common,
		);
		expect(invoice.ok && invoice.data?.status).toBe("draft");
		expect(invoice.ok && invoice.data?.matchResult).toBeNull();
	});
});
