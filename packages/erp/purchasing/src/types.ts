export const PURCHASE_ORDER_STATUSES = [
	"draft",
	"posted",
	"cancelled",
	"closed",
] as const;
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export type PurchaseOrderLine = {
	id: string;
	organizationId: string;
	orderId: string;
	lineNo: number;
	itemId: string;
	itemCode: string;
	itemName: string;
	baseUomId: string;
	baseUomCode: string;
	/** Decimal quantity as normalized string (precision preserved). */
	quantity: string;
	unitPrice: string;
	discountAmount: string;
	taxClassification: string | null;
	lineAmount: string;
	/** Percent as decimal string (e.g. "0.05" = 5%). Default "0". */
	overReceiptPercent: string;
	underReceiptPercent: string;
	invoiceQuantityTolerancePercent: string;
	invoicePriceTolerancePercent: string;
	lineIdempotencyKey: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PurchaseOrder = {
	id: string;
	organizationId: string;
	code: string;
	normalizedCode: string;
	status: PurchaseOrderStatus;
	partyId: string;
	partyCode: string;
	partyName: string;
	paymentTermId: string | null;
	paymentTermCode: string | null;
	paymentTermName: string | null;
	netDays: number | null;
	warehouseId: string | null;
	warehouseCode: string | null;
	warehouseName: string | null;
	currencyCode: string;
	exchangeRate: string | null;
	subtotalAmount: string | null;
	discountTotal: string | null;
	taxTotal: string | null;
	documentTotal: string | null;
	createIdempotencyKey: string;
	postIdempotencyKey: string | null;
	cancelIdempotencyKey: string | null;
	closeIdempotencyKey: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	postedAt: Date | null;
	postedBy: string | null;
	cancelledAt: Date | null;
	cancelledBy: string | null;
	closedAt: Date | null;
	closedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
	lines: PurchaseOrderLine[];
};
