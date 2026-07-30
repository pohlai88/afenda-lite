import { fail, ok } from "@afenda/errors/result";
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
	can() {
		return Promise.resolve(true);
	},
};
const effects = {
	emit() {
		return Promise.resolve(ok(undefined));
	},
};

const purchaseOrderMatch: PurchaseOrderMatchQueryPort = {
	getPurchaseOrderMatchBasis() {
		return Promise.resolve(
			ok({
				currencyCode: "USD",
				lines: [{ itemId, quantity: "10", unitPrice: "50" }],
				priceTolerancePct: "100",
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
			ok({
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

const postedPayment: PostedPaymentQueryPort = {
	getPostedPayment() {
		return Promise.resolve(
			ok({
				currencyCode: "USD",
				direction: "outbound",
				paymentId,
				status: "posted",
			}),
		);
	},
};

describe("payables lifecycle", () => {
	it("matches before posting and updates supplier balance for every financial operation", async () => {
		const store = createMemoryPayablesStore();
		const options = {
			authorization,
			effects,
			goodsReceiptMatch,
			postedPayment,
			purchaseOrderMatch,
			store,
		};
		const created = await createDraftSupplierInvoice(
			{
				actorUserId,
				code: "SI-1",
				correlationId: "create",
				currencyCode: "usd",
				organizationId,
				supplierCode: "S-1",
				supplierId,
				supplierName: "Supplier One",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		await addSupplierInvoiceLine(
			{
				actorUserId,
				correlationId: "line",
				description: "Materials",
				invoiceId: created.data.id,
				itemId,
				organizationId,
				quantity: "2",
				unitPrice: "50",
			},
			options,
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
			options,
		);
		expect(matched.ok && matched.data.status).toBe("matched");
		expect(matched.ok && matched.data.matchResult?.result).toBe("matched");
		const posted = await postSupplierInvoice(
			{
				actorUserId,
				correlationId: "post",
				expectedVersion: 3,
				invoiceId: created.data.id,
				organizationId,
			},
			options,
		);
		expect(posted.ok && posted.data.openAmount).toBe("100");
		await applySupplierPayment(
			{
				actorUserId,
				amount: "25",
				correlationId: "apply",
				idempotencyKey: "apply-1",
				invoiceId: created.data.id,
				organizationId,
				paymentApplicationInstructionId: "00000000-0000-4000-8000-000000000006",
				paymentId,
			},
			options,
		);
		await issueSupplierCreditNote(
			{
				actorUserId,
				amount: "10",
				code: "SCN-1",
				correlationId: "credit",
				currencyCode: "USD",
				itemId,
				organizationId,
				supplierCode: "S-1",
				supplierId,
				supplierName: "Supplier One",
			},
			options,
		);
		const balance = await getSupplierBalance(
			{ actorUserId, currencyCode: "USD", organizationId, supplierId },
			options,
		);
		expect(balance.ok && balance.data[0]?.openBalance).toBe("65");

		const cancellable = await createDraftSupplierInvoice(
			{
				actorUserId,
				code: "SI-2",
				correlationId: "create-cancel",
				currencyCode: "USD",
				organizationId,
				supplierCode: "S-1",
				supplierId,
				supplierName: "Supplier One",
			},
			options,
		);
		if (!cancellable.ok) {
			return;
		}
		await addSupplierInvoiceLine(
			{
				actorUserId,
				correlationId: "line-cancel",
				description: "Cancellation",
				invoiceId: cancellable.data.id,
				itemId,
				organizationId,
				quantity: "1",
				unitPrice: "20",
			},
			options,
		);
		const matchedCancel = await matchSupplierInvoice(
			{
				actorUserId,
				correlationId: "match-cancel",
				expectedVersion: 2,
				goodsReceiptId,
				invoiceId: cancellable.data.id,
				organizationId,
				purchaseOrderId,
			},
			options,
		);
		expect(matchedCancel.ok).toBe(true);
		if (!matchedCancel.ok) {
			return;
		}
		const cancelledMatched = await cancelSupplierInvoice(
			{
				actorUserId,
				correlationId: "cancel-matched",
				expectedVersion: matchedCancel.data.version,
				invoiceId: cancellable.data.id,
				organizationId,
			},
			options,
		);
		expect(cancelledMatched.ok).toBe(true);

		const postedReject = await createDraftSupplierInvoice(
			{
				actorUserId,
				code: "SI-3",
				correlationId: "create-posted-cancel",
				currencyCode: "USD",
				organizationId,
				supplierCode: "S-1",
				supplierId,
				supplierName: "Supplier One",
			},
			options,
		);
		if (!postedReject.ok) {
			return;
		}
		await addSupplierInvoiceLine(
			{
				actorUserId,
				correlationId: "line-posted-cancel",
				description: "Posted cancel reject",
				invoiceId: postedReject.data.id,
				itemId,
				organizationId,
				quantity: "1",
				unitPrice: "15",
			},
			options,
		);
		await matchSupplierInvoice(
			{
				actorUserId,
				correlationId: "match-posted-cancel",
				expectedVersion: 2,
				goodsReceiptId,
				invoiceId: postedReject.data.id,
				organizationId,
				purchaseOrderId,
			},
			options,
		);
		const postedInvoice = await postSupplierInvoice(
			{
				actorUserId,
				correlationId: "post-posted-cancel",
				expectedVersion: 3,
				invoiceId: postedReject.data.id,
				organizationId,
			},
			options,
		);
		expect(postedInvoice.ok).toBe(true);
		if (!postedInvoice.ok) {
			return;
		}
		const cancelPosted = await cancelSupplierInvoice(
			{
				actorUserId,
				correlationId: "cancel-posted",
				expectedVersion: postedInvoice.data.version,
				invoiceId: postedReject.data.id,
				organizationId,
			},
			options,
		);
		expect(cancelPosted.ok).toBe(false);

		const finalBalance = await getSupplierBalance(
			{ actorUserId, organizationId, supplierId },
			options,
		);
		// SI-1 remaining 65 + SI-3 posted 15 (cancel rejected) = 80
		expect(finalBalance.ok && finalBalance.data[0]?.openBalance).toBe("80");
	});

	it("rejects currency mismatch on three-way match", async () => {
		const store = createMemoryPayablesStore();
		const fxPo: PurchaseOrderMatchQueryPort = {
			getPurchaseOrderMatchBasis() {
				return Promise.resolve(
					ok({
						currencyCode: "EUR",
						lines: [{ itemId, quantity: "10", unitPrice: "50" }],
						purchaseOrderId,
						status: "posted",
						supplierPartyId: supplierId,
						version: 1,
					}),
				);
			},
		};
		const options = {
			authorization,
			effects,
			goodsReceiptMatch,
			postedPayment,
			purchaseOrderMatch: fxPo,
			store,
		};
		const created = await createDraftSupplierInvoice(
			{
				actorUserId,
				code: "SI-MATCH-FX",
				correlationId: "create-match-fx",
				currencyCode: "USD",
				organizationId,
				supplierCode: "S-1",
				supplierId,
				supplierName: "Supplier One",
			},
			options,
		);
		if (!created.ok) {
			return;
		}
		await addSupplierInvoiceLine(
			{
				actorUserId,
				correlationId: "line-match-fx",
				description: "FX match",
				invoiceId: created.data.id,
				itemId,
				organizationId,
				quantity: "1",
				unitPrice: "10",
			},
			options,
		);
		const matched = await matchSupplierInvoice(
			{
				actorUserId,
				correlationId: "match-fx",
				expectedVersion: 2,
				goodsReceiptId,
				invoiceId: created.data.id,
				organizationId,
				purchaseOrderId,
			},
			options,
		);
		expect(matched.ok).toBe(false);
		if (matched.ok) {
			return;
		}
		expect(matched.message).toMatch(/currenc/i);
	});

	it("restores the supplier invoice and balance when reversing payment allocations", async () => {
		const store = createMemoryPayablesStore();
		const options = {
			authorization,
			effects,
			goodsReceiptMatch,
			postedPayment,
			purchaseOrderMatch,
			store,
		};
		const created = await createDraftSupplierInvoice(
			{
				actorUserId,
				code: "SI-REVERSE",
				correlationId: "reverse-create",
				currencyCode: "USD",
				organizationId,
				supplierCode: "S-1",
				supplierId,
				supplierName: "Supplier One",
			},
			options,
		);
		if (!created.ok) {
			return;
		}
		await addSupplierInvoiceLine(
			{
				actorUserId,
				correlationId: "reverse-line",
				description: "Materials",
				invoiceId: created.data.id,
				itemId,
				organizationId,
				quantity: "1",
				unitPrice: "100",
			},
			options,
		);
		await matchSupplierInvoice(
			{
				actorUserId,
				correlationId: "reverse-match",
				expectedVersion: 2,
				goodsReceiptId,
				invoiceId: created.data.id,
				organizationId,
				purchaseOrderId,
			},
			options,
		);
		await postSupplierInvoice(
			{
				actorUserId,
				correlationId: "reverse-post",
				expectedVersion: 3,
				invoiceId: created.data.id,
				organizationId,
			},
			options,
		);
		await applySupplierPayment(
			{
				actorUserId,
				amount: "25",
				correlationId: "reverse-apply",
				idempotencyKey: "reverse-apply-1",
				invoiceId: created.data.id,
				organizationId,
				paymentApplicationInstructionId: "00000000-0000-4000-8000-000000000006",
				paymentId,
			},
			options,
		);
		const failedReversal = await reverseSupplierPaymentApplication(
			{
				actorUserId,
				correlationId: "reverse-failed",
				idempotencyKey: "reverse-supplier-failed",
				organizationId,
				paymentId,
			},
			{
				...options,
				effects: {
					emit() {
						return Promise.resolve(
							fail("INTERNAL_ERROR", "reversal event failed"),
						);
					},
				},
			},
		);
		expect(failedReversal.ok).toBe(false);
		const afterFailedReversal = await store.getById(
			organizationId,
			created.data.id,
		);
		expect(afterFailedReversal.ok && afterFailedReversal.data?.openAmount).toBe(
			"75",
		);
		const balanceAfterFailedReversal = await getSupplierBalance(
			{ actorUserId, currencyCode: "USD", organizationId, supplierId },
			options,
		);
		expect(
			balanceAfterFailedReversal.ok &&
				balanceAfterFailedReversal.data[0]?.openBalance,
		).toBe("75");
		const reversed = await reverseSupplierPaymentApplication(
			{
				actorUserId,
				correlationId: "reverse",
				idempotencyKey: "reverse-supplier-1",
				organizationId,
				paymentId,
			},
			options,
		);
		expect(reversed.ok && reversed.data).toHaveLength(1);
		const invoice = await store.getById(organizationId, created.data.id);
		expect(invoice.ok && invoice.data?.openAmount).toBe("100");
		const balance = await getSupplierBalance(
			{ actorUserId, currencyCode: "USD", organizationId, supplierId },
			options,
		);
		expect(balance.ok && balance.data[0]?.openBalance).toBe("100");
	});

	it("rejects currency mismatch on payment application", async () => {
		const store = createMemoryPayablesStore();
		const mismatchedPayment: PostedPaymentQueryPort = {
			getPostedPayment() {
				return Promise.resolve(
					ok({
						currencyCode: "EUR",
						direction: "outbound",
						paymentId,
						status: "posted",
					}),
				);
			},
		};
		const options = {
			authorization,
			effects,
			goodsReceiptMatch,
			postedPayment: mismatchedPayment,
			purchaseOrderMatch,
			store,
		};
		const created = await createDraftSupplierInvoice(
			{
				actorUserId,
				code: "SI-FX",
				correlationId: "create-fx",
				currencyCode: "USD",
				organizationId,
				supplierCode: "S-1",
				supplierId,
				supplierName: "Supplier One",
			},
			options,
		);
		if (!created.ok) {
			return;
		}
		await addSupplierInvoiceLine(
			{
				actorUserId,
				correlationId: "line-fx",
				description: "FX",
				invoiceId: created.data.id,
				itemId,
				organizationId,
				quantity: "1",
				unitPrice: "10",
			},
			options,
		);
		await matchSupplierInvoice(
			{
				actorUserId,
				correlationId: "match-fx",
				expectedVersion: 2,
				goodsReceiptId,
				invoiceId: created.data.id,
				organizationId,
				purchaseOrderId,
			},
			options,
		);
		await postSupplierInvoice(
			{
				actorUserId,
				correlationId: "post-fx",
				expectedVersion: 3,
				invoiceId: created.data.id,
				organizationId,
			},
			options,
		);
		const applied = await applySupplierPayment(
			{
				actorUserId,
				amount: "5",
				correlationId: "apply-fx",
				idempotencyKey: "apply-fx",
				invoiceId: created.data.id,
				organizationId,
				paymentApplicationInstructionId: "00000000-0000-4000-8000-000000000006",
				paymentId,
			},
			options,
		);
		expect(applied.ok).toBe(false);
		if (applied.ok) {
			return;
		}
		expect(applied.message).toMatch(/currenc/i);
	});
});
