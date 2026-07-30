export const PURCHASE_ORDER_STATUSES = [
	"draft",
	"posted",
	"cancelled",
	"closed",
] as const;
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export interface PurchaseOrderLine {
	baseUomCode: string;
	baseUomId: string;
	createdAt: Date;
	createdBy: string;
	discountAmount: string;
	id: string;
	invoicePriceTolerancePercent: string;
	invoiceQuantityTolerancePercent: string;
	itemCode: string;
	itemId: string;
	itemName: string;
	lineAmount: string;
	lineIdempotencyKey: string;
	lineNo: number;
	orderId: string;
	organizationId: string;
	/** Percent as decimal string (e.g. "0.05" = 5%). Default "0". */
	overReceiptPercent: string;
	/** Decimal quantity as normalized string (precision preserved). */
	quantity: string;
	taxClassification: string | null;
	underReceiptPercent: string;
	unitPrice: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface PurchaseOrder {
	cancelIdempotencyKey: string | null;
	cancelledAt: Date | null;
	cancelledBy: string | null;
	closedAt: Date | null;
	closedBy: string | null;
	closeIdempotencyKey: string | null;
	code: string;
	createdAt: Date;
	createdBy: string;
	createIdempotencyKey: string;
	currencyCode: string;
	discountTotal: string | null;
	documentTotal: string | null;
	exchangeRate: string | null;
	id: string;
	lines: PurchaseOrderLine[];
	netDays: number | null;
	normalizedCode: string;
	organizationId: string;
	partyCode: string;
	partyId: string;
	partyName: string;
	paymentTermCode: string | null;
	paymentTermId: string | null;
	paymentTermName: string | null;
	postedAt: Date | null;
	postedBy: string | null;
	postIdempotencyKey: string | null;
	status: PurchaseOrderStatus;
	subtotalAmount: string | null;
	taxTotal: string | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
	warehouseCode: string | null;
	warehouseId: string | null;
	warehouseName: string | null;
}
