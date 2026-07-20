import type { Result } from "@afenda/errors/result";

import type { PaymentsAuthorizationPort } from "./authorization";

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

export type PaymentAccount = {
	id: string;
	organizationId: string;
	code: string;
	normalizedCode: string;
	name: string;
	kind: PaymentAccountKind;
	currencyCode: string;
	active: boolean;
	createdBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PaymentApplicationInstruction = {
	id: string;
	organizationId: string;
	paymentId: string;
	targetModule: PaymentApplicationTargetModule;
	targetDocumentType: PaymentApplicationTargetDocumentType;
	targetDocumentId: string;
	intendedAmount: string;
	appliedAmount: string;
	currencyCode: string;
	status: PaymentApplicationInstructionStatus;
	rejectionCode: string | null;
	createdBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PaymentReversal = {
	id: string;
	organizationId: string;
	paymentId: string;
	reason: string;
	reversedBy: string;
	reversedAt: Date;
};

export type Payment = {
	id: string;
	organizationId: string;
	code: string;
	normalizedCode: string;
	paymentAccountId: string;
	direction: PaymentDirection;
	purpose: PaymentPurpose;
	status: PaymentStatus;
	counterpartyId: string | null;
	counterpartySnapshot: Record<string, unknown> | null;
	transferGroupId: string | null;
	linkedPaymentId: string | null;
	originalPaymentId: string | null;
	refundSource: RefundSource | null;
	currencyCode: string;
	amount: string;
	reference: string | null;
	createIdempotencyKey: string;
	postIdempotencyKey: string | null;
	reverseIdempotencyKey: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	postedAt: Date | null;
	postedBy: string | null;
	reversedAt: Date | null;
	reversedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
	applicationInstructions: PaymentApplicationInstruction[];
	reversal: PaymentReversal | null;
};

export type PaymentApplicationAvailability = {
	paymentId: string;
	currencyCode: string;
	postedAmount: string;
	intendedAmount: string;
	refundedAmount: string;
	availableToApply: string;
};

export type PaymentsEventType =
	| "payments.payment.created.v1"
	| "payments.payment.posted.v1"
	| "payments.payment.reversed.v1"
	| "payments.refund.posted.v1"
	| "payments.application_instruction.created.v1"
	| "payments.application_instruction.applied.v1"
	| "payments.application_instruction.rejected.v1"
	| "payments.transfer.posted.v1";

export type PaymentsEffects = {
	emit(event: {
		type: PaymentsEventType;
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		payload: Record<string, unknown>;
	}): Promise<Result<void>>;
};

export type PaymentCreateRecord = Omit<
	Payment,
	| "id"
	| "status"
	| "version"
	| "postedAt"
	| "postedBy"
	| "reversedAt"
	| "reversedBy"
	| "createdAt"
	| "updatedAt"
	| "applicationInstructions"
	| "reversal"
	| "postIdempotencyKey"
	| "reverseIdempotencyKey"
	| "createdBy"
	| "updatedBy"
> & {
	actorUserId: string;
	correlationId: string;
};

export type PaymentsCommandOptions = {
	store?: PaymentsStore;
	authorization?: PaymentsAuthorizationPort;
	effects?: PaymentsEffects;
};

export type PaymentsStore = {
	createPaymentAccount(
		record: Omit<PaymentAccount, "id" | "createdAt" | "updatedAt">,
	): Promise<Result<PaymentAccount>>;
	listPaymentAccounts(
		organizationId: string,
	): Promise<Result<PaymentAccount[]>>;
	createDraft(record: PaymentCreateRecord): Promise<Result<Payment>>;
	addApplicationInstruction(
		record: Omit<
			PaymentApplicationInstruction,
			| "id"
			| "createdAt"
			| "updatedAt"
			| "appliedAmount"
			| "status"
			| "rejectionCode"
		> & {
			idempotencyKey: string;
			actorUserId: string;
			correlationId: string;
		},
	): Promise<Result<PaymentApplicationInstruction>>;
	post(record: {
		organizationId: string;
		paymentId: string;
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
		idempotencyKey: string;
	}): Promise<Result<Payment>>;
	reverse(record: {
		organizationId: string;
		paymentId: string;
		expectedVersion: number;
		reason: string;
		actorUserId: string;
		correlationId: string;
		idempotencyKey: string;
	}): Promise<Result<Payment>>;
	createAndPostTransfer(record: {
		organizationId: string;
		code: string;
		normalizedCode: string;
		fromPaymentAccountId: string;
		toPaymentAccountId: string;
		amount: string;
		currencyCode: string;
		actorUserId: string;
		correlationId: string;
		idempotencyKey: string;
		reference: string | null;
	}): Promise<Result<{ outgoing: Payment; incoming: Payment }>>;
	postRefund(
		record: Omit<
			PaymentCreateRecord,
			| "direction"
			| "purpose"
			| "currencyCode"
			| "paymentAccountId"
			| "counterpartyId"
			| "counterpartySnapshot"
			| "transferGroupId"
			| "linkedPaymentId"
			| "originalPaymentId"
			| "refundSource"
		> & {
			originalPaymentId: string;
			paymentAccountId: string;
			refundSource: RefundSource;
		},
	): Promise<Result<Payment>>;
	markInstructionApplied(record: {
		organizationId: string;
		instructionId: string;
		appliedAmount: string;
		actorUserId: string;
		correlationId: string;
		idempotencyKey: string;
	}): Promise<Result<PaymentApplicationInstruction>>;
	markInstructionRejected(record: {
		organizationId: string;
		instructionId: string;
		rejectionCode: string;
		actorUserId: string;
		correlationId: string;
		idempotencyKey: string;
	}): Promise<Result<PaymentApplicationInstruction>>;
	getById(organizationId: string, id: string): Promise<Result<Payment | null>>;
	list(filter: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: PaymentStatus;
		direction?: PaymentDirection;
	}): Promise<Result<Payment[]>>;
	getApplicationAvailability(
		organizationId: string,
		paymentId: string,
	): Promise<Result<PaymentApplicationAvailability>>;
};
