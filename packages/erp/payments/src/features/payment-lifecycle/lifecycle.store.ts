import type { Result } from "@afenda/errors";

import type {
	Payment,
	PaymentDirection,
	PaymentStatus,
	RefundSource,
} from "../../kernel/contracts/domain";

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

export interface PaymentsLifecycleStore {
	createAndPostTransfer: (record: {
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
}
