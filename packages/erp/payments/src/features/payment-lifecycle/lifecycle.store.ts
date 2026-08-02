import type { Result } from "@afenda/errors";

import type {
	InstrumentClearanceStatus,
	Payment,
	PaymentDeduction,
	PaymentDirection,
	PaymentMethodSnapshot,
	PaymentStatus,
	RefundSource,
} from "../../kernel/contracts/domain";

/** Validated deduction line handed to the store by the operation layer. */
export type PaymentDeductionInput = Omit<
	PaymentDeduction,
	"id" | "paymentId" | "createdAt" | "createdBy" | "functionalAmount"
>;

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
	| "deductions"
	| "methodSnapshot"
	| "clearanceStatus"
	| "clearanceIdempotencyKey"
> & {
	actorUserId: string;
	correlationId: string;
	deductions: readonly PaymentDeductionInput[];
	/** Set only by immediately-posting flows (transfer, refund); null for drafts. */
	methodSnapshot: PaymentMethodSnapshot | null;
};

export interface PaymentsLifecycleStore {
	createAndPostTransfer: (record: {
		organizationId: string;
		code: string;
		normalizedCode: string;
		fromPaymentAccountId: string;
		toPaymentAccountId: string;
		paymentMethodId: string;
		methodSnapshot: PaymentMethodSnapshot;
		amount: string;
		currencyCode: string;
		actorUserId: string;
		correlationId: string;
		idempotencyKey: string;
		reference: string | null;
	}) => Promise<Result<{ outgoing: Payment; incoming: Payment }>>;
	createDraft: (record: PaymentCreateRecord) => Promise<Result<Payment>>;
	getById: (
		organizationId: string,
		id: string,
	) => Promise<Result<Payment | null>>;
	list: (filter: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: PaymentStatus | undefined;
		direction?: PaymentDirection | undefined;
	}) => Promise<Result<Payment[]>>;
	post: (record: {
		organizationId: string;
		paymentId: string;
		expectedVersion: number;
		methodSnapshot: PaymentMethodSnapshot;
		actorUserId: string;
		correlationId: string;
		idempotencyKey: string;
	}) => Promise<Result<Payment>>;
	postRefund: (
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
	) => Promise<Result<Payment>>;
	reverse: (record: {
		organizationId: string;
		paymentId: string;
		expectedVersion: number;
		reason: string;
		actorUserId: string;
		correlationId: string;
		idempotencyKey: string;
	}) => Promise<Result<Payment>>;
	updateInstrumentClearance: (record: {
		organizationId: string;
		paymentId: string;
		expectedVersion: number;
		status: InstrumentClearanceStatus;
		clearanceDate: string | null;
		settlementReference: string | null;
		reason: string | null;
		actorUserId: string;
		correlationId: string;
		idempotencyKey: string;
	}) => Promise<Result<Payment>>;
}
