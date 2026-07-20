import type { Result } from "@afenda/errors/result";

/** Posted payment snapshot for AP application — Payments owns the payment row. */
export type PostedPaymentBasis = {
	paymentId: string;
	status: "posted";
	currencyCode: string;
	direction: string;
};

export type PostedPaymentQueryPort = {
	getPostedPayment(input: {
		organizationId: string;
		paymentId: string;
	}): Promise<Result<PostedPaymentBasis | null>>;
};

export type PurchaseOrderMatchLineBasis = {
	itemId: string;
	quantity: string;
	unitPrice: string;
};

/** PO match basis from composition-root adapter — Payables never queries PO tables. */
export type PurchaseOrderMatchBasis = {
	purchaseOrderId: string;
	supplierPartyId: string;
	status: string;
	currencyCode: string;
	version: number;
	quantityTolerancePct?: string;
	priceTolerancePct?: string;
	lines: PurchaseOrderMatchLineBasis[];
};

export type PurchaseOrderMatchQueryPort = {
	getPurchaseOrderMatchBasis(input: {
		organizationId: string;
		purchaseOrderId: string;
	}): Promise<Result<PurchaseOrderMatchBasis | null>>;
};

export type GoodsReceiptMatchLineBasis = {
	itemId: string;
	quantityReceived: string;
};

/** GR match basis from composition-root adapter — Payables never queries GR tables. */
export type GoodsReceiptMatchBasis = {
	goodsReceiptId: string;
	purchaseOrderId: string;
	status: string;
	sourceType: string;
	sourceId: string;
	version: number;
	lines: GoodsReceiptMatchLineBasis[];
};

export type GoodsReceiptMatchQueryPort = {
	getGoodsReceiptMatchBasis(input: {
		organizationId: string;
		goodsReceiptId: string;
	}): Promise<Result<GoodsReceiptMatchBasis | null>>;
};
