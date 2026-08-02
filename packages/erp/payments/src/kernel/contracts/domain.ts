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

export const PAYMENT_METHOD_KINDS = [
	"cash",
	"check",
	"wire",
	"ach",
	"card",
	"gateway",
	"other",
] as const;
export type PaymentMethodKind = (typeof PAYMENT_METHOD_KINDS)[number];

export const INSTRUMENT_REQUIREMENTS = [
	"forbidden",
	"optional",
	"required",
] as const;
export type InstrumentRequirement = (typeof INSTRUMENT_REQUIREMENTS)[number];

export const PAYMENT_INSTRUMENT_KINDS = [
	"check",
	"bank-transfer",
	"card",
	"gateway",
	"other",
] as const;
export type PaymentInstrumentKind = (typeof PAYMENT_INSTRUMENT_KINDS)[number];

/**
 * Discriminated instrument value object. The `gateway` variant is a passive
 * external reference only — provider machinery is out of scope here.
 */
export type PaymentInstrument =
	| {
			kind: "check";
			number: string;
			issuedOn: string;
			clearanceDate?: string | undefined;
			bankReference?: string | undefined;
	  }
	| {
			kind: "bank-transfer";
			bankReference: string;
			valueDate?: string | undefined;
	  }
	| {
			kind: "card";
			authorizationReference?: string | undefined;
			settlementReference?: string | undefined;
	  }
	| { kind: "gateway"; providerReference: string }
	| { kind: "other"; reference?: string | undefined };

export const INSTRUMENT_CLEARANCE_STATUSES = [
	"not-applicable",
	"pending",
	"cleared",
	"rejected",
] as const;
export type InstrumentClearanceStatus =
	(typeof INSTRUMENT_CLEARANCE_STATUSES)[number];

export interface PaymentMethod {
	active: boolean;
	allowedAccountKinds: readonly PaymentAccountKind[];
	allowedInstrumentKinds: readonly PaymentInstrumentKind[];
	code: string;
	createdAt: Date;
	createdBy: string;
	id: string;
	instrumentRequirement: InstrumentRequirement;
	kind: PaymentMethodKind;
	name: string;
	normalizedCode: string;
	organizationId: string;
	updatedAt: Date;
	updatedBy: string;
}

/**
 * Minimal snapshot frozen at posting so historical interpretation never
 * changes when the master record is edited. No governance fields.
 */
export interface PaymentMethodSnapshot {
	code: string;
	kind: PaymentMethodKind;
	paymentMethodId: string;
}

/** Rate direction: transaction → functional. */
export interface PaymentFxContext {
	exchangeRate: string;
	functionalCurrency: string;
	rateDate: string;
	rateSource: string | null;
	transactionCurrency: string;
}

export const PAYMENT_DEDUCTION_KINDS = [
	"bank_charge",
	"write_off",
	"rounding",
	"withholding",
	"other",
] as const;
export type PaymentDeductionKind = (typeof PAYMENT_DEDUCTION_KINDS)[number];

export const PAYMENT_DEDUCTION_EFFECTS = [
	"reduces_application_only",
	"reduces_cash_movement",
	"informational",
] as const;
export type PaymentDeductionEffect = (typeof PAYMENT_DEDUCTION_EFFECTS)[number];

/** Aggregate-owned child line — mutated only through Payment operations. */
export interface PaymentDeduction {
	accountingPurposeCode: string;
	amount: string;
	createdAt: Date;
	createdBy: string;
	description: string | null;
	effect: PaymentDeductionEffect;
	functionalAmount: string | null;
	id: string;
	kind: PaymentDeductionKind;
	lineNo: number;
	paymentId: string;
}

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
	clearanceIdempotencyKey: string | null;
	clearanceStatus: InstrumentClearanceStatus;
	code: string;
	counterpartyId: string | null;
	counterpartySnapshot: Record<string, unknown> | null;
	createdAt: Date;
	createdBy: string;
	createIdempotencyKey: string;
	currencyCode: string;
	deductions: PaymentDeduction[];
	direction: PaymentDirection;
	functionalAmount: string;
	fxContext: PaymentFxContext | null;
	id: string;
	instrument: PaymentInstrument | null;
	linkedPaymentId: string | null;
	/** Frozen at post; null while draft. */
	methodSnapshot: PaymentMethodSnapshot | null;
	normalizedCode: string;
	organizationId: string;
	originalPaymentId: string | null;
	paymentAccountId: string;
	paymentMethodId: string;
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
