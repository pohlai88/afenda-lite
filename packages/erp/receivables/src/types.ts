export const SALES_INVOICE_STATUSES = [
	"draft",
	"posted",
	"closed",
	"cancelled",
] as const;
export type SalesInvoiceStatus = (typeof SALES_INVOICE_STATUSES)[number];

export const SALES_INVOICE_SOURCES = [
	"sales_order",
	"delivery",
	"manual",
	"opening_balance",
] as const;
export type SalesInvoiceSource = (typeof SALES_INVOICE_SOURCES)[number];

export const CUSTOMER_ALLOCATION_STATUSES = ["active", "reversed"] as const;
export type CustomerAllocationStatus =
	(typeof CUSTOMER_ALLOCATION_STATUSES)[number];

export type SalesInvoiceLine = {
	id: string;
	organizationId: string;
	invoiceId: string;
	lineNo: number;
	itemId: string;
	itemCode: string;
	itemName: string;
	description: string;
	quantity: string;
	unitPrice: string;
	lineAmount: string;
	salesOrderLineId: string | null;
	deliveryLineId: string | null;
	createdBy: string;
	createdAt: Date;
};

export type SalesInvoice = {
	id: string;
	organizationId: string;
	code: string;
	normalizedCode: string;
	status: SalesInvoiceStatus;
	invoiceSource: SalesInvoiceSource;
	customerId: string;
	customerCode: string;
	customerName: string;
	currencyCode: string;
	salesOrderId: string | null;
	deliveryId: string | null;
	invoiceDate: Date | null;
	accountingDate: Date | null;
	dueDate: Date | null;
	paymentTermCode: string | null;
	paymentTermDescription: string | null;
	manualReason: string | null;
	totalAmount: string;
	openAmount: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	postedAt: Date | null;
	postedBy: string | null;
	closedAt: Date | null;
	closedBy: string | null;
	cancelledAt: Date | null;
	cancelledBy: string | null;
	createdAt: Date;
	updatedAt: Date;
	lines: SalesInvoiceLine[];
};

export type SalesCreditNote = {
	id: string;
	organizationId: string;
	code: string;
	normalizedCode: string;
	status: "draft" | "posted" | "cancelled";
	customerId: string;
	customerCode: string;
	customerName: string;
	salesInvoiceId: string;
	currencyCode: string;
	amount: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	postedAt: Date | null;
	postedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export type CustomerAllocation = {
	id: string;
	organizationId: string;
	invoiceId: string;
	customerId: string;
	paymentId: string;
	paymentApplicationInstructionId: string;
	creditNoteId: string | null;
	status: CustomerAllocationStatus;
	amount: string;
	createdBy: string;
	createdAt: Date;
	reversedAt: Date | null;
	reversedBy: string | null;
};

export type CustomerBalance = {
	organizationId: string;
	customerId: string;
	currencyCode: string;
	openBalance: string;
	updatedAt: Date;
};

export type CustomerAgingBucket = {
	current: string;
	days1to30: string;
	days31to60: string;
	days61to90: string;
	over90: string;
};

export type CustomerAging = {
	organizationId: string;
	customerId: string;
	currencyCode: string;
	asOfDate: string;
	buckets: CustomerAgingBucket;
	totalOpen: string;
};
