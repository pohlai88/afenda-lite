import type { Result } from "@afenda/errors";

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
