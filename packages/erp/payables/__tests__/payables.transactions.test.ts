import { errorResult } from "@afenda/errors";
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
	getPurchaseOrderMatchBasis() {
		return Promise.resolve(
			errorResult.ok({
				currencyCode: "USD",
				lines: [{ itemId, quantity: "10", unitPrice: "40" }],
				purchaseOrderId,
				status: "posted",
				supplierPartyId: supplierId,
				version: 1,
			}),
		);
	},
};

const goodsReceiptMatch: GoodsReceiptMatchQueryPort = {
	getGoodsReceiptMatchBasis() {
		return Promise.resolve(
			errorResult.ok({
				goodsReceiptId,
				lines: [{ itemId, quantityReceived: "10" }],
				purchaseOrderId,
				sourceId: purchaseOrderId,
				sourceType: "purchase_order",
				status: "posted",
				version: 1,
			}),
		);
	},
};

describe("payables transaction rollback", () => {
	it("rolls back match state when event emission fails", async () => {
		const store = createMemoryPayablesStore();
		const authorization = {
			can() {
				return Promise.resolve(true);
			},
		};
		const effects = {
			emit() {
				return Promise.resolve(errorResult.ok(undefined));
			},
		};
		const common = {
			authorization,
			effects,
			goodsReceiptMatch,
			purchaseOrderMatch,
			store,
		};
		const created = await createDraftSupplierInvoice(
			{
				actorUserId,
				code: "SI-ROLLBACK",
				correlationId: "create",
				currencyCode: "USD",
				organizationId,
				supplierCode: "S-1",
				supplierId,
				supplierName: "Supplier",
			},
			common,
		);
		if (!created.ok) {
			return;
		}
		await addSupplierInvoiceLine(
			{
				actorUserId,
				correlationId: "line",
				description: "Line",
				invoiceId: created.data.id,
				itemId,
				organizationId,
				quantity: "1",
				unitPrice: "40",
			},
			common,
		);
		const matched = await matchSupplierInvoice(
			{
				actorUserId,
				correlationId: "match",
				expectedVersion: 2,
				goodsReceiptId,
				invoiceId: created.data.id,
				organizationId,
				purchaseOrderId,
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
		expect(matched.ok).toBe(false);
		const invoice = await getSupplierInvoiceById(
			{ actorUserId, id: created.data.id, organizationId },
			common,
		);
		expect(invoice.ok && invoice.data?.status).toBe("draft");
		expect(invoice.ok && invoice.data?.matchResult).toBeNull();
	});
});
