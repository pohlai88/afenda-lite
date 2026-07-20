import type { Result } from "@afenda/errors/result";

import type { PaymentsAuthorizationPort } from "./authorization";

export const PAYMENT_DIRECTIONS = [
	"receipt",
	"disbursement",
	"refund",
	"transfer",
] as const;
export type PaymentDirection = (typeof PAYMENT_DIRECTIONS)[number];

export const PAYMENT_STATUSES = ["draft", "posted", "reversed"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type PaymentAllocationTarget = "receivable" | "payable";

export type PaymentAllocation = {
	id: string;
	organizationId: string;
	paymentId: string;
	targetType: PaymentAllocationTarget;
	targetId: string;
	amount: string;
	createdBy: string;
	createdAt: Date;
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
	direction: PaymentDirection;
	status: PaymentStatus;
	counterpartyId: string | null;
	originalPaymentId: string | null;
	currencyCode: string;
	amount: string;
	reference: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	postedAt: Date | null;
	postedBy: string | null;
	reversedAt: Date | null;
	reversedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
	allocations: PaymentAllocation[];
	reversal: PaymentReversal | null;
};

export type PaymentsEventType =
	| "payments.payment.created.v1"
	| "payments.payment.posted.v1"
	| "payments.payment.reversed.v1"
	| "payments.refund.posted.v1";

export type PaymentsEffects = {
	emit(event: {
		type: PaymentsEventType;
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		payload: Record<string, unknown>;
	}): Promise<Result<void>>;
};

export type PaymentCreateRecord = {
	organizationId: string;
	code: string;
	normalizedCode: string;
	direction: Exclude<PaymentDirection, "refund">;
	counterpartyId: string | null;
	currencyCode: string;
	amount: string;
	reference: string | null;
	actorUserId: string;
	correlationId: string;
	effects: PaymentsEffects;
};

export type PaymentRefundRecord = {
	organizationId: string;
	code: string;
	normalizedCode: string;
	originalPaymentId: string;
	amount: string;
	reference: string | null;
	actorUserId: string;
	correlationId: string;
	effects: PaymentsEffects;
};

export type PaymentsStore = {
	createDraft(record: PaymentCreateRecord): Promise<Result<Payment>>;
	addAllocation(record: {
		organizationId: string;
		paymentId: string;
		targetType: PaymentAllocationTarget;
		targetId: string;
		amount: string;
		actorUserId: string;
	}): Promise<Result<PaymentAllocation>>;
	post(record: {
		organizationId: string;
		paymentId: string;
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
		effects: PaymentsEffects;
	}): Promise<Result<Payment>>;
	reverse(record: {
		organizationId: string;
		paymentId: string;
		expectedVersion: number;
		reason: string;
		actorUserId: string;
		correlationId: string;
		effects: PaymentsEffects;
	}): Promise<Result<Payment>>;
	postRefund(record: PaymentRefundRecord): Promise<Result<Payment>>;
	getById(organizationId: string, id: string): Promise<Result<Payment | null>>;
	list(filter: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: PaymentStatus;
		direction?: PaymentDirection;
	}): Promise<Result<Payment[]>>;
};

export type PaymentsCommandOptions = {
	store?: PaymentsStore;
	authorization?: PaymentsAuthorizationPort;
	effects?: PaymentsEffects;
};
