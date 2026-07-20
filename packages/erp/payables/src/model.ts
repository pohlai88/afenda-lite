import type { Result } from "@afenda/errors/result";

import type { PayablesAuthorizationPort } from "./authorization";

export const SUPPLIER_INVOICE_STATUSES = [
	"draft",
	"matched",
	"posted",
	"cancelled",
] as const;
export type SupplierInvoiceStatus = (typeof SUPPLIER_INVOICE_STATUSES)[number];

export type SupplierInvoiceLine = {
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

export type ThreeWayMatchResult = {
	id: string;
	organizationId: string;
	invoiceId: string;
	purchaseOrderId: string;
	goodsReceiptId: string;
	result: "matched";
	matchedBy: string;
	matchedAt: Date;
};

export type SupplierInvoice = {
	id: string;
	organizationId: string;
	code: string;
	normalizedCode: string;
	documentType: "invoice" | "credit_note";
	status: SupplierInvoiceStatus;
	supplierId: string;
	supplierCode: string;
	supplierName: string;
	currencyCode: string;
	totalAmount: string;
	openAmount: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	matchedAt: Date | null;
	matchedBy: string | null;
	postedAt: Date | null;
	postedBy: string | null;
	cancelledAt: Date | null;
	cancelledBy: string | null;
	createdAt: Date;
	updatedAt: Date;
	lines: SupplierInvoiceLine[];
	matchResult: ThreeWayMatchResult | null;
};

export type SupplierAllocation = {
	id: string;
	organizationId: string;
	invoiceId: string;
	supplierId: string;
	paymentId: string;
	amount: string;
	createdBy: string;
	createdAt: Date;
};

export type SupplierBalance = {
	organizationId: string;
	supplierId: string;
	currencyCode: string;
	openBalance: string;
	updatedAt: Date;
};

export type PayablesEventType =
	| "payables.invoice.created.v1"
	| "payables.invoice.matched.v1"
	| "payables.invoice.posted.v1"
	| "payables.credit_note.posted.v1"
	| "payables.allocation.posted.v1";

export type PayablesEffects = {
	emit(event: {
		type: PayablesEventType;
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		payload: Record<string, unknown>;
	}): Promise<Result<void>>;
};

export type SupplierInvoiceCreateRecord = {
	organizationId: string;
	code: string;
	normalizedCode: string;
	documentType: "invoice" | "credit_note";
	supplierId: string;
	supplierCode: string;
	supplierName: string;
	currencyCode: string;
	creditAmount?: string;
	actorUserId: string;
	correlationId: string;
	effects: PayablesEffects;
};

export type PayablesStore = {
	createInvoice(
		record: SupplierInvoiceCreateRecord,
	): Promise<Result<SupplierInvoice>>;
	addLine(record: {
		organizationId: string;
		invoiceId: string;
		itemId: string;
		description: string;
		quantity: string;
		unitPrice: string;
		actorUserId: string;
	}): Promise<Result<SupplierInvoiceLine>>;
	matchInvoice(record: {
		organizationId: string;
		invoiceId: string;
		purchaseOrderId: string;
		goodsReceiptId: string;
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
		effects: PayablesEffects;
	}): Promise<Result<SupplierInvoice>>;
	postInvoice(record: {
		organizationId: string;
		invoiceId: string;
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
		effects: PayablesEffects;
	}): Promise<Result<SupplierInvoice>>;
	issueCredit(
		record: SupplierInvoiceCreateRecord & {
			amount: string;
		},
	): Promise<Result<SupplierInvoice>>;
	allocate(record: {
		organizationId: string;
		invoiceId: string;
		amount: string;
		paymentId: string;
		actorUserId: string;
		correlationId: string;
		effects: PayablesEffects;
	}): Promise<Result<SupplierAllocation>>;
	cancel(record: {
		organizationId: string;
		invoiceId: string;
		expectedVersion: number;
		actorUserId: string;
	}): Promise<Result<SupplierInvoice>>;
	getById(
		organizationId: string,
		id: string,
	): Promise<Result<SupplierInvoice | null>>;
	list(filter: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: SupplierInvoiceStatus;
	}): Promise<Result<SupplierInvoice[]>>;
	getBalance(
		organizationId: string,
		supplierId: string,
		currencyCode?: string,
	): Promise<Result<SupplierBalance[]>>;
};

export type PayablesCommandOptions = {
	store?: PayablesStore;
	authorization?: PayablesAuthorizationPort;
	effects?: PayablesEffects;
};
