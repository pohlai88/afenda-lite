import type { Result } from "@afenda/errors/result";

import type { PayablesAuthorizationPort } from "./authorization";
import type {
	GoodsReceiptMatchQueryPort,
	PostedPaymentQueryPort,
	PurchaseOrderMatchQueryPort,
} from "./ports";

export const SUPPLIER_INVOICE_STATUSES = [
	"draft",
	"matched",
	"posted",
	"cancelled",
] as const;
export type SupplierInvoiceStatus = (typeof SUPPLIER_INVOICE_STATUSES)[number];

export const THREE_WAY_MATCH_STATUSES = [
	"pending",
	"matched",
	"matched_with_tolerance",
	"exception",
] as const;
export type ThreeWayMatchStatus = (typeof THREE_WAY_MATCH_STATUSES)[number];

export interface SupplierInvoiceLine {
	createdAt: Date;
	createdBy: string;
	description: string;
	id: string;
	invoiceId: string;
	itemId: string;
	lineAmount: string;
	lineNo: number;
	organizationId: string;
	quantity: string;
	unitPrice: string;
}

export interface ThreeWayMatchResult {
	evidence: ThreeWayMatchEvidence;
	goodsReceiptId: string;
	goodsReceiptVersion: number;
	id: string;
	invoiceId: string;
	matchedAt: Date;
	matchedBy: string;
	organizationId: string;
	purchaseOrderId: string;
	purchaseOrderVersion: number;
	result: ThreeWayMatchStatus;
}

export interface ThreeWayMatchEvidence {
	lineResults: Array<{
		itemId: string;
		invoicedQuantity: string;
		invoicedUnitPrice: string;
		orderedQuantity: string;
		receivedQuantity: string;
		purchaseOrderUnitPrice: string;
		quantityVariancePct: string;
		priceVariancePct: string;
		outcome: "matched" | "matched_with_tolerance" | "exception";
	}>;
	priceTolerancePct: string;
	quantityTolerancePct: string;
}

export interface SupplierInvoice {
	cancelledAt: Date | null;
	cancelledBy: string | null;
	code: string;
	createdAt: Date;
	createdBy: string;
	currencyCode: string;
	documentType: "invoice" | "credit_note";
	id: string;
	lines: SupplierInvoiceLine[];
	matchedAt: Date | null;
	matchedBy: string | null;
	matchResult: ThreeWayMatchResult | null;
	normalizedCode: string;
	openAmount: string;
	organizationId: string;
	postedAt: Date | null;
	postedBy: string | null;
	status: SupplierInvoiceStatus;
	supplierCode: string;
	supplierId: string;
	supplierName: string;
	totalAmount: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface SupplierAllocation {
	amount: string;
	applyIdempotencyKey: string | null;
	createdAt: Date;
	createdBy: string;
	creditNoteId: string | null;
	id: string;
	invoiceId: string;
	organizationId: string;
	paymentApplicationInstructionId: string | null;
	paymentId: string | null;
	reversedAt: Date | null;
	reversedBy: string | null;
	status: "active" | "reversed";
	supplierId: string;
}

export interface SupplierBalance {
	asOf: Date;
	creditedAmount: string;
	currencyCode: string;
	invoicedAmount: string;
	openBalance: string;
	organizationId: string;
	outstandingAmount: string;
	paidAmount: string;
	supplierId: string;
	updatedAt: Date;
}

export type PayablesEventType =
	| "payables.invoice.created.v1"
	| "payables.invoice.matched.v1"
	| "payables.invoice.posted.v1"
	| "payables.invoice.cancelled.v1"
	| "payables.credit_note.posted.v1"
	| "payables.allocation.posted.v1"
	| "payables.allocation.reversed.v1"
	| "payables.payment_application.reversed.v1";

export interface PayablesEffects {
	emit: (event: {
		type: PayablesEventType;
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		payload: Record<string, unknown>;
	}) => Promise<Result<void>>;
}

export interface SupplierInvoiceCreateRecord {
	actorUserId: string;
	code: string;
	correlationId: string;
	creditAmount?: string;
	currencyCode: string;
	documentType: "invoice" | "credit_note";
	effects: PayablesEffects;
	normalizedCode: string;
	organizationId: string;
	supplierCode: string;
	supplierId: string;
	supplierName: string;
}

export interface PayablesStore {
	addCreditLine: (record: {
		organizationId: string;
		creditNoteId: string;
		itemId: string;
		description: string;
		quantity: string;
		unitPrice: string;
		actorUserId: string;
	}) => Promise<Result<SupplierInvoiceLine>>;
	addLine: (record: {
		organizationId: string;
		invoiceId: string;
		itemId: string;
		description: string;
		quantity: string;
		unitPrice: string;
		actorUserId: string;
	}) => Promise<Result<SupplierInvoiceLine>>;
	applyCredit: (record: {
		organizationId: string;
		invoiceId: string;
		creditNoteId: string;
		amount: string;
		actorUserId: string;
		correlationId: string;
		idempotencyKey: string;
		effects: PayablesEffects;
	}) => Promise<Result<SupplierAllocation>>;
	applyPayment: (record: {
		organizationId: string;
		invoiceId: string;
		amount: string;
		paymentId: string;
		paymentApplicationInstructionId: string;
		idempotencyKey: string;
		actorUserId: string;
		correlationId: string;
		effects: PayablesEffects;
	}) => Promise<Result<SupplierAllocation>>;
	cancel: (record: {
		organizationId: string;
		invoiceId: string;
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
		effects: PayablesEffects;
	}) => Promise<Result<SupplierInvoice>>;
	createCredit: (
		record: SupplierInvoiceCreateRecord,
	) => Promise<Result<SupplierInvoice>>;
	createInvoice: (
		record: SupplierInvoiceCreateRecord,
	) => Promise<Result<SupplierInvoice>>;
	getBalance: (
		organizationId: string,
		supplierId: string,
		currencyCode?: string,
	) => Promise<Result<SupplierBalance[]>>;
	getById: (
		organizationId: string,
		id: string,
	) => Promise<Result<SupplierInvoice | null>>;
	list: (filter: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: SupplierInvoiceStatus | undefined;
		supplierId?: string | undefined;
		currencyCode?: string | undefined;
		documentType?: SupplierInvoice["documentType"] | undefined;
	}) => Promise<Result<SupplierInvoice[]>>;
	matchInvoice: (record: {
		organizationId: string;
		invoiceId: string;
		purchaseOrderId: string;
		goodsReceiptId: string;
		matchStatus: ThreeWayMatchStatus;
		evidence: ThreeWayMatchEvidence;
		purchaseOrderVersion: number;
		goodsReceiptVersion: number;
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
		effects: PayablesEffects;
	}) => Promise<Result<SupplierInvoice>>;
	postCredit: (record: {
		organizationId: string;
		creditNoteId: string;
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
		effects: PayablesEffects;
	}) => Promise<Result<SupplierInvoice>>;
	postInvoice: (record: {
		organizationId: string;
		invoiceId: string;
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
		effects: PayablesEffects;
	}) => Promise<Result<SupplierInvoice>>;
	reversePaymentApplication: (record: {
		organizationId: string;
		paymentId: string;
		actorUserId: string;
		correlationId: string;
		effects: PayablesEffects;
	}) => Promise<Result<SupplierAllocation[]>>;
}

export interface PayablesCommandOptions {
	authorization?: PayablesAuthorizationPort;
	effects?: PayablesEffects;
	goodsReceiptMatch?: GoodsReceiptMatchQueryPort;
	postedPayment?: PostedPaymentQueryPort;
	purchaseOrderMatch?: PurchaseOrderMatchQueryPort;
	store?: PayablesStore;
}

export type {
	GoodsReceiptMatchBasis,
	GoodsReceiptMatchQueryPort,
	PostedPaymentBasis,
	PostedPaymentQueryPort,
	PurchaseOrderMatchBasis,
	PurchaseOrderMatchQueryPort,
} from "./ports";
