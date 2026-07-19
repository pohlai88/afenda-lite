import { getSession, type Session } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";

import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFailInternal,
} from "@/modules/platform/schemas/action-result";

/**
 * Shared session + correlation + internal-error envelope for member-scoped
 * Server Actions (inbox reads/writes). Caller stamps org/user from `session`.
 */
export async function runMemberSessionAction<T>(input: {
	path: string;
	safeMessage: string;
	execute: (
		session: Session,
		correlationId: string,
	) => Promise<ActionResult<T>>;
}): Promise<ActionResult<T>> {
	const correlationId = createCorrelationId();
	const session = await getSession();

	try {
		return await input.execute(session, correlationId);
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: input.path,
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(input.safeMessage, correlationId);
	}
}
