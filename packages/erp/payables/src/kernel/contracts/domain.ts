import type { PayablesEffects } from "./effects";

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
