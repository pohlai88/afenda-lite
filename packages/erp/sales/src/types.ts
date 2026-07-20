export const SALES_ORDER_STATUSES = ["draft", "posted"] as const;
export type SalesOrderStatus = (typeof SALES_ORDER_STATUSES)[number];

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
	paymentTermId: string | null;
	paymentTermCode: string | null;
	netDays: number | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	postedAt: Date | null;
	postedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
	lines: SalesOrderLine[];
};
