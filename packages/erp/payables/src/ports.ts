import type { Result } from "@afenda/errors/result";

/** Posted payment snapshot for AP application — Payments owns the payment row. */
export interface PostedPaymentBasis {
	currencyCode: string;
	direction: string;
	paymentId: string;
	status: "posted";
}

export interface PostedPaymentQueryPort {
	getPostedPayment: (input: {
		organizationId: string;
		paymentId: string;
	}) => Promise<Result<PostedPaymentBasis | null>>;
}

export interface PurchaseOrderMatchLineBasis {
	itemId: string;
	quantity: string;
	unitPrice: string;
}

/** PO match basis from composition-root adapter — Payables never queries PO tables. */
export interface PurchaseOrderMatchBasis {
	currencyCode: string;
	lines: PurchaseOrderMatchLineBasis[];
	priceTolerancePct?: string;
	purchaseOrderId: string;
	quantityTolerancePct?: string;
	status: string;
	supplierPartyId: string;
	version: number;
}

export interface PurchaseOrderMatchQueryPort {
	getPurchaseOrderMatchBasis: (input: {
		organizationId: string;
		purchaseOrderId: string;
	}) => Promise<Result<PurchaseOrderMatchBasis | null>>;
}

export interface GoodsReceiptMatchLineBasis {
	itemId: string;
	quantityReceived: string;
}

/** GR match basis from composition-root adapter — Payables never queries GR tables. */
export interface GoodsReceiptMatchBasis {
	goodsReceiptId: string;
	lines: GoodsReceiptMatchLineBasis[];
	purchaseOrderId: string;
	sourceId: string;
	sourceType: string;
	status: string;
	version: number;
}

export interface GoodsReceiptMatchQueryPort {
	getGoodsReceiptMatchBasis: (input: {
		organizationId: string;
		goodsReceiptId: string;
	}) => Promise<Result<GoodsReceiptMatchBasis | null>>;
}
