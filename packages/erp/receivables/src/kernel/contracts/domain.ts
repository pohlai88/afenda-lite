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

export interface SalesInvoiceLine {
	createdAt: Date;
	createdBy: string;
	deliveryLineId: string | null;
	description: string;
	id: string;
	invoiceId: string;
	itemCode: string;
	itemId: string;
	itemName: string;
	lineAmount: string;
	lineNo: number;
	organizationId: string;
	quantity: string;
	salesOrderLineId: string | null;
	unitPrice: string;
}

export interface SalesInvoice {
	accountingDate: Date | null;
	cancelledAt: Date | null;
	cancelledBy: string | null;
	closedAt: Date | null;
	closedBy: string | null;
	code: string;
	createdAt: Date;
	createdBy: string;
	currencyCode: string;
	customerCode: string;
	customerId: string;
	customerName: string;
	deliveryId: string | null;
	dueDate: Date | null;
	id: string;
	invoiceDate: Date | null;
	invoiceSource: SalesInvoiceSource;
	lines: SalesInvoiceLine[];
	manualReason: string | null;
	normalizedCode: string;
	openAmount: string;
	organizationId: string;
	paymentTermCode: string | null;
	paymentTermDescription: string | null;
	postedAt: Date | null;
	postedBy: string | null;
	salesOrderId: string | null;
	status: SalesInvoiceStatus;
	totalAmount: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface SalesCreditNote {
	amount: string;
	code: string;
	createdAt: Date;
	createdBy: string;
	currencyCode: string;
	customerCode: string;
	customerId: string;
	customerName: string;
	id: string;
	normalizedCode: string;
	organizationId: string;
	postedAt: Date | null;
	postedBy: string | null;
	salesInvoiceId: string;
	status: "draft" | "posted" | "cancelled";
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface CustomerAllocation {
	amount: string;
	createdAt: Date;
	createdBy: string;
	creditNoteId: string | null;
	customerId: string;
	id: string;
	invoiceId: string;
	organizationId: string;
	paymentApplicationInstructionId: string;
	paymentId: string;
	reversedAt: Date | null;
	reversedBy: string | null;
	status: CustomerAllocationStatus;
}

export interface CustomerBalance {
	currencyCode: string;
	customerId: string;
	openBalance: string;
	organizationId: string;
	updatedAt: Date;
}

export interface CustomerAgingBucket {
	current: string;
	days1to30: string;
	days31to60: string;
	days61to90: string;
	over90: string;
}

export interface CustomerAging {
	asOfDate: string;
	buckets: CustomerAgingBucket;
	currencyCode: string;
	customerId: string;
	organizationId: string;
	totalOpen: string;
}
