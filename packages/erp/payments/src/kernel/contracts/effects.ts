import type { Result } from "@afenda/errors";

export type PaymentsEventType =
	| "payments.payment.created.v1"
	| "payments.payment.posted.v1"
	| "payments.payment.reversed.v1"
	| "payments.payment.instrument_clearance_updated.v1"
	| "payments.payment_method.created.v1"
	| "payments.payment_method.updated.v1"
	| "payments.payment_method.deactivated.v1"
	| "payments.refund.posted.v1"
	| "payments.application_instruction.created.v1"
	| "payments.application_instruction.applied.v1"
	| "payments.application_instruction.rejected.v1"
	| "payments.transfer.posted.v1";

export interface PaymentsEffects {
	emit: (event: {
		type: PaymentsEventType;
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		payload: Record<string, unknown>;
	}) => Promise<Result<void>>;
}
