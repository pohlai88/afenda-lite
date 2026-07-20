import { fail } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";

import {
	addSupplierInvoiceLine,
	createDraftSupplierInvoice,
	createMemoryPayablesStore,
	getSupplierInvoiceById,
	matchSupplierInvoice,
} from "../src/index";

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
				return { ok: true as const, data: undefined };
			},
		};
		const common = { store, authorization, effects };
		const created = await createDraftSupplierInvoice(
			{
				organizationId: "org-1",
				actorUserId: "user-1",
				correlationId: "create",
				code: "SI-ROLLBACK",
				supplierId: "00000000-0000-4000-8000-000000000001",
				supplierCode: "S-1",
				supplierName: "Supplier",
				currencyCode: "USD",
			},
			common,
		);
		if (!created.ok) return;
		await addSupplierInvoiceLine(
			{
				organizationId: "org-1",
				actorUserId: "user-1",
				correlationId: "line",
				invoiceId: created.data.id,
				itemId: "00000000-0000-4000-8000-000000000002",
				description: "Line",
				quantity: "1",
				unitPrice: "40",
			},
			common,
		);
		const matched = await matchSupplierInvoice(
			{
				organizationId: "org-1",
				actorUserId: "user-1",
				correlationId: "match",
				invoiceId: created.data.id,
				purchaseOrderId: "00000000-0000-4000-8000-000000000003",
				goodsReceiptId: "00000000-0000-4000-8000-000000000004",
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
			{ organizationId: "org-1", actorUserId: "user-1", id: created.data.id },
			common,
		);
		expect(invoice.ok && invoice.data?.status).toBe("draft");
		expect(invoice.ok && invoice.data?.matchResult).toBeNull();
	});
});
