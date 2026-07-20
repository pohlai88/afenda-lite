import { ok } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";

import {
	addSupplierInvoiceLine,
	applySupplierPayment,
	cancelSupplierInvoice,
	createDraftSupplierInvoice,
	createMemoryPayablesStore,
	type GoodsReceiptMatchQueryPort,
	getSupplierBalance,
	issueSupplierCreditNote,
	matchSupplierInvoice,
	type PostedPaymentQueryPort,
	type PurchaseOrderMatchQueryPort,
	postSupplierInvoice,
	reverseSupplierPaymentApplication,
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

const purchaseOrderMatch: PurchaseOrderMatchQueryPort = {
	async getPurchaseOrderMatchBasis() {
		return ok({
			purchaseOrderId,
			supplierPartyId: supplierId,
			status: "posted",
			currencyCode: "USD",
			version: 1,
			priceTolerancePct: "100",
			lines: [{ itemId, quantity: "10", unitPrice: "50" }],
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

const postedPayment: PostedPaymentQueryPort = {
	async getPostedPayment() {
		return ok({
			paymentId,
			status: "posted",
			currencyCode: "USD",
			direction: "outbound",
		});
	},
};

describe("payables lifecycle", () => {
	it("matches before posting and updates supplier balance for every financial operation", async () => {
		const store = createMemoryPayablesStore();
		const options = {
			store,
			authorization,
			effects,
			purchaseOrderMatch,
			goodsReceiptMatch,
			postedPayment,
		};
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
		await applySupplierPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "apply",
				invoiceId: created.data.id,
				paymentId,
				paymentApplicationInstructionId: "00000000-0000-4000-8000-000000000006",
				idempotencyKey: "apply-1",
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
				itemId,
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
		const matchedCancel = await matchSupplierInvoice(
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
		expect(matchedCancel.ok).toBe(true);
		if (!matchedCancel.ok) return;
		const cancelledMatched = await cancelSupplierInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "cancel-matched",
				invoiceId: cancellable.data.id,
				expectedVersion: matchedCancel.data.version,
			},
			options,
		);
		expect(cancelledMatched.ok).toBe(true);

		const postedReject = await createDraftSupplierInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "create-posted-cancel",
				code: "SI-3",
				supplierId,
				supplierCode: "S-1",
				supplierName: "Supplier One",
				currencyCode: "USD",
			},
			options,
		);
		if (!postedReject.ok) return;
		await addSupplierInvoiceLine(
			{
				organizationId,
				actorUserId,
				correlationId: "line-posted-cancel",
				invoiceId: postedReject.data.id,
				itemId,
				description: "Posted cancel reject",
				quantity: "1",
				unitPrice: "15",
			},
			options,
		);
		await matchSupplierInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "match-posted-cancel",
				invoiceId: postedReject.data.id,
				purchaseOrderId,
				goodsReceiptId,
				expectedVersion: 2,
			},
			options,
		);
		const postedInvoice = await postSupplierInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "post-posted-cancel",
				invoiceId: postedReject.data.id,
				expectedVersion: 3,
			},
			options,
		);
		expect(postedInvoice.ok).toBe(true);
		if (!postedInvoice.ok) return;
		const cancelPosted = await cancelSupplierInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "cancel-posted",
				invoiceId: postedReject.data.id,
				expectedVersion: postedInvoice.data.version,
			},
			options,
		);
		expect(cancelPosted.ok).toBe(false);

		const finalBalance = await getSupplierBalance(
			{ organizationId, actorUserId, supplierId },
			options,
		);
		// SI-1 remaining 65 + SI-3 posted 15 (cancel rejected) = 80
		expect(finalBalance.ok && finalBalance.data[0]?.openBalance).toBe("80");
	});

	it("rejects currency mismatch on three-way match", async () => {
		const store = createMemoryPayablesStore();
		const fxPo: PurchaseOrderMatchQueryPort = {
			async getPurchaseOrderMatchBasis() {
				return ok({
					purchaseOrderId,
					supplierPartyId: supplierId,
					status: "posted",
					currencyCode: "EUR",
					version: 1,
					lines: [{ itemId, quantity: "10", unitPrice: "50" }],
				});
			},
		};
		const options = {
			store,
			authorization,
			effects,
			purchaseOrderMatch: fxPo,
			goodsReceiptMatch,
			postedPayment,
		};
		const created = await createDraftSupplierInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "create-match-fx",
				code: "SI-MATCH-FX",
				supplierId,
				supplierCode: "S-1",
				supplierName: "Supplier One",
				currencyCode: "USD",
			},
			options,
		);
		if (!created.ok) return;
		await addSupplierInvoiceLine(
			{
				organizationId,
				actorUserId,
				correlationId: "line-match-fx",
				invoiceId: created.data.id,
				itemId,
				description: "FX match",
				quantity: "1",
				unitPrice: "10",
			},
			options,
		);
		const matched = await matchSupplierInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "match-fx",
				invoiceId: created.data.id,
				purchaseOrderId,
				goodsReceiptId,
				expectedVersion: 2,
			},
			options,
		);
		expect(matched.ok).toBe(false);
		if (matched.ok) return;
		expect(matched.message).toMatch(/currenc/i);
	});

	it("restores the supplier invoice and balance when reversing payment allocations", async () => {
		const store = createMemoryPayablesStore();
		const options = {
			store,
			authorization,
			effects,
			purchaseOrderMatch,
			goodsReceiptMatch,
			postedPayment,
		};
		const created = await createDraftSupplierInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "reverse-create",
				code: "SI-REVERSE",
				supplierId,
				supplierCode: "S-1",
				supplierName: "Supplier One",
				currencyCode: "USD",
			},
			options,
		);
		if (!created.ok) return;
		await addSupplierInvoiceLine(
			{
				organizationId,
				actorUserId,
				correlationId: "reverse-line",
				invoiceId: created.data.id,
				itemId,
				description: "Materials",
				quantity: "1",
				unitPrice: "100",
			},
			options,
		);
		await matchSupplierInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "reverse-match",
				invoiceId: created.data.id,
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
				correlationId: "reverse-post",
				invoiceId: created.data.id,
				expectedVersion: 3,
			},
			options,
		);
		await applySupplierPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "reverse-apply",
				invoiceId: created.data.id,
				paymentId,
				paymentApplicationInstructionId: "00000000-0000-4000-8000-000000000006",
				idempotencyKey: "reverse-apply-1",
				amount: "25",
			},
			options,
		);
		const reversed = await reverseSupplierPaymentApplication(
			{
				organizationId,
				actorUserId,
				correlationId: "reverse",
				paymentId,
				idempotencyKey: "reverse-supplier-1",
			},
			options,
		);
		expect(reversed.ok && reversed.data).toHaveLength(1);
		const invoice = await store.getById(organizationId, created.data.id);
		expect(invoice.ok && invoice.data?.openAmount).toBe("100");
		const balance = await getSupplierBalance(
			{ organizationId, actorUserId, supplierId, currencyCode: "USD" },
			options,
		);
		expect(balance.ok && balance.data[0]?.openBalance).toBe("100");
	});

	it("rejects currency mismatch on payment application", async () => {
		const store = createMemoryPayablesStore();
		const mismatchedPayment: PostedPaymentQueryPort = {
			async getPostedPayment() {
				return ok({
					paymentId,
					status: "posted",
					currencyCode: "EUR",
					direction: "outbound",
				});
			},
		};
		const options = {
			store,
			authorization,
			effects,
			purchaseOrderMatch,
			goodsReceiptMatch,
			postedPayment: mismatchedPayment,
		};
		const created = await createDraftSupplierInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "create-fx",
				code: "SI-FX",
				supplierId,
				supplierCode: "S-1",
				supplierName: "Supplier One",
				currencyCode: "USD",
			},
			options,
		);
		if (!created.ok) return;
		await addSupplierInvoiceLine(
			{
				organizationId,
				actorUserId,
				correlationId: "line-fx",
				invoiceId: created.data.id,
				itemId,
				description: "FX",
				quantity: "1",
				unitPrice: "10",
			},
			options,
		);
		await matchSupplierInvoice(
			{
				organizationId,
				actorUserId,
				correlationId: "match-fx",
				invoiceId: created.data.id,
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
				correlationId: "post-fx",
				invoiceId: created.data.id,
				expectedVersion: 3,
			},
			options,
		);
		const applied = await applySupplierPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "apply-fx",
				invoiceId: created.data.id,
				paymentId,
				paymentApplicationInstructionId: "00000000-0000-4000-8000-000000000006",
				idempotencyKey: "apply-fx",
				amount: "5",
			},
			options,
		);
		expect(applied.ok).toBe(false);
		if (applied.ok) return;
		expect(applied.message).toMatch(/currenc/i);
	});
});
