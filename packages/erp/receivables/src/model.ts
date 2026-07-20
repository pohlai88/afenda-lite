import type { Result } from "@afenda/errors/result";
import type { ReceivablesEventType } from "@afenda/events/schemas";

import type { ReceivablesAuthorizationPort } from "./authorization";

export const SALES_INVOICE_STATUSES = ["draft", "posted", "cancelled"] as const;
export type SalesInvoiceStatus = (typeof SALES_INVOICE_STATUSES)[number];

export type SalesInvoiceLine = {
	id: string;
	organizationId: string;
	invoiceId: string;
	lineNo: number;
	itemId: string;
	description: string;
	quantity: string;
	unitPrice: string;
	lineAmount: string;
	createdBy: string;
	createdAt: Date;
};

export type SalesInvoice = {
	id: string;
	organizationId: string;
	code: string;
	normalizedCode: string;
	documentType: "invoice" | "credit_note";
	status: SalesInvoiceStatus;
	customerId: string;
	customerCode: string;
	customerName: string;
	currencyCode: string;
	totalAmount: string;
	openAmount: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	postedAt: Date | null;
	postedBy: string | null;
	cancelledAt: Date | null;
	cancelledBy: string | null;
	createdAt: Date;
	updatedAt: Date;
	lines: SalesInvoiceLine[];
};

export type CustomerAllocation = {
	id: string;
	organizationId: string;
	invoiceId: string;
	customerId: string;
	paymentId: string | null;
	amount: string;
	createdBy: string;
	createdAt: Date;
};

export type CustomerBalance = {
	organizationId: string;
	customerId: string;
	currencyCode: string;
	openBalance: string;
	updatedAt: Date;
};

export type ReceivablesEvent = {
	type: ReceivablesEventType;
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	payload: Record<string, unknown>;
};

export type ReceivablesEffects = {
	emit(event: ReceivablesEvent): Promise<Result<void>>;
};

export type InvoiceCreateRecord = {
	organizationId: string;
	code: string;
	normalizedCode: string;
	documentType: "invoice" | "credit_note";
	customerId: string;
	customerCode: string;
	customerName: string;
	currencyCode: string;
	creditAmount?: string;
	actorUserId: string;
};

export type ReceivablesStore = {
	createInvoice(record: InvoiceCreateRecord): Promise<Result<SalesInvoice>>;
	addLine(record: {
		organizationId: string;
		invoiceId: string;
		itemId: string;
		description: string;
		quantity: string;
		unitPrice: string;
		actorUserId: string;
	}): Promise<Result<SalesInvoiceLine>>;
	postInvoice(record: {
		organizationId: string;
		invoiceId: string;
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
		effects: ReceivablesEffects;
	}): Promise<Result<SalesInvoice>>;
	issueCredit(record: InvoiceCreateRecord & {
		amount: string;
		correlationId: string;
		effects: ReceivablesEffects;
	}): Promise<Result<SalesInvoice>>;
	allocate(record: {
		organizationId: string;
		invoiceId: string;
		amount: string;
		paymentId: string | null;
		actorUserId: string;
		correlationId: string;
		effects: ReceivablesEffects;
	}): Promise<Result<CustomerAllocation>>;
	cancel(record: {
		organizationId: string;
		invoiceId: string;
		expectedVersion: number;
		actorUserId: string;
	}): Promise<Result<SalesInvoice>>;
	getById(organizationId: string, id: string): Promise<Result<SalesInvoice | null>>;
	list(filter: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: SalesInvoiceStatus;
	}): Promise<Result<SalesInvoice[]>>;
	getBalance(
		organizationId: string,
		customerId: string,
		currencyCode?: string,
	): Promise<Result<CustomerBalance[]>>;
};

export type ReceivablesCommandOptions = {
	store?: ReceivablesStore;
	authorization?: ReceivablesAuthorizationPort;
	effects?: ReceivablesEffects;
};
