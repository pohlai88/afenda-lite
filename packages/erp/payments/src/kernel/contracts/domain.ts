export const PAYMENT_DIRECTIONS = [
	"receipt",
	"disbursement",
	"refund",
] as const;
export type PaymentDirection = (typeof PAYMENT_DIRECTIONS)[number];

/** `posted` is the settled state; no separate settlement lifecycle exists. */
export const PAYMENT_STATUSES = ["draft", "posted", "reversed"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_PURPOSES = [
	"customer_receipt",
	"supplier_disbursement",
	"customer_refund",
	"supplier_refund_receipt",
	"internal_transfer",
	"manual_receipt",
	"manual_disbursement",
] as const;
export type PaymentPurpose = (typeof PAYMENT_PURPOSES)[number];

export const PAYMENT_ACCOUNT_KINDS = [
	"bank",
	"cash",
	"gateway",
	"clearing",
] as const;
export type PaymentAccountKind = (typeof PAYMENT_ACCOUNT_KINDS)[number];

export const APPLICATION_STATUSES = [
	"pending",
	"applied",
	"partially_applied",
	"rejected",
	"reversed",
] as const;
export type PaymentApplicationInstructionStatus =
	(typeof APPLICATION_STATUSES)[number];

export type PaymentApplicationTargetModule = "receivables" | "payables";
export type PaymentApplicationTargetDocumentType =
	| "customer_invoice"
	| "customer_credit"
	| "supplier_invoice"
	| "supplier_credit";
export type RefundSource = "customer_payment" | "customer_credit" | "manual";

export interface PaymentAccount {
	active: boolean;
	code: string;
	createdAt: Date;
	createdBy: string;
	currencyCode: string;
	id: string;
	kind: PaymentAccountKind;
	name: string;
	normalizedCode: string;
	organizationId: string;
	updatedAt: Date;
}

export interface PaymentApplicationInstruction {
	appliedAmount: string;
	createdAt: Date;
	createdBy: string;
	currencyCode: string;
	id: string;
	intendedAmount: string;
	organizationId: string;
	paymentId: string;
	rejectionCode: string | null;
	status: PaymentApplicationInstructionStatus;
	targetDocumentId: string;
	targetDocumentType: PaymentApplicationTargetDocumentType;
	targetModule: PaymentApplicationTargetModule;
	updatedAt: Date;
}

export interface PaymentReversal {
	id: string;
	organizationId: string;
	paymentId: string;
	reason: string;
	reversedAt: Date;
	reversedBy: string;
}

export interface Payment {
	amount: string;
	applicationInstructions: PaymentApplicationInstruction[];
	code: string;
	counterpartyId: string | null;
	counterpartySnapshot: Record<string, unknown> | null;
	createdAt: Date;
	createdBy: string;
	createIdempotencyKey: string;
	currencyCode: string;
	direction: PaymentDirection;
	id: string;
	linkedPaymentId: string | null;
	normalizedCode: string;
	organizationId: string;
	originalPaymentId: string | null;
	paymentAccountId: string;
	postedAt: Date | null;
	postedBy: string | null;
	postIdempotencyKey: string | null;
	purpose: PaymentPurpose;
	reference: string | null;
	refundSource: RefundSource | null;
	reversal: PaymentReversal | null;
	reversedAt: Date | null;
	reversedBy: string | null;
	reverseIdempotencyKey: string | null;
	status: PaymentStatus;
	transferGroupId: string | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface PaymentApplicationAvailability {
	availableToApply: string;
	currencyCode: string;
	intendedAmount: string;
	paymentId: string;
	postedAmount: string;
	refundedAmount: string;
}
