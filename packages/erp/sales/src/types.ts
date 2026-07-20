export const SALES_ORDER_STATUSES = ["draft", "posted", "cancelled"] as const;
export type SalesOrderStatus = (typeof SALES_ORDER_STATUSES)[number];

export const SALES_ORDER_LIST_SORTS = [
	"updatedAt:desc",
	"updatedAt:asc",
	"createdAt:desc",
	"createdAt:asc",
	"code:asc",
	"code:desc",
] as const;
export type SalesOrderListSort = (typeof SALES_ORDER_LIST_SORTS)[number];

export type SalesOrderLine = {
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
	lineIdempotencyKey: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type SalesOrder = {
	id: string;
	organizationId: string;
	code: string;
	normalizedCode: string;
	status: SalesOrderStatus;
	partyId: string;
	partyCode: string;
	partyName: string;
	billToAddressSnapshot: string | null;
	shipToAddressSnapshot: string | null;
	paymentTermId: string | null;
	paymentTermCode: string | null;
	paymentTermName: string | null;
	netDays: number | null;
	currencyCode: string;
	exchangeRate: string | null;
	subtotalAmount: string | null;
	discountTotal: string | null;
	taxTotal: string | null;
	documentTotal: string | null;
	createIdempotencyKey: string;
	postIdempotencyKey: string | null;
	cancelIdempotencyKey: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	postedAt: Date | null;
	postedBy: string | null;
	cancelledAt: Date | null;
	cancelledBy: string | null;
	createdAt: Date;
	updatedAt: Date;
	lines: SalesOrderLine[];
};
