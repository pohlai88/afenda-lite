import { authServer, type Session } from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { http } from "@afenda/http";
import { logger } from "@afenda/logger";

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
	const correlationId = http.correlation.create();
	const session = await authServer.session.get();

	try {
		return await input.execute(session, correlationId);
	} catch {
		logger.event({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: input.path,
			code: "INTERNAL_ERROR",
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}
}
