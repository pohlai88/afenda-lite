import { authServer, type Session } from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { http } from "@afenda/http";
import { logger } from "@afenda/logger";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import type { ProductPermissionCode } from "@/modules/identity/domain/session-permission";

/**
 * Shared authenticated-member session + permission + internal-error envelope.
 * Use for org-scoped Server Actions (e.g. master-data) that must work on both
 * `/admin/*` and `/client/*` when the member holds the permission — not
 * `requireRole("operator")`.
 */
export async function runMemberPermissionAction<T>(input: {
	path: string;
	permission: ProductPermissionCode;
	safeMessage: string;
	execute: (
		session: Session,
		correlationId: string,
	) => Promise<ActionResult<T>>;
}): Promise<ActionResult<T>> {
	const correlationId = http.correlation.create();
	const session = await authServer.session.get();

	const permissionDenied = await forbidUnlessPermission(
		session,
		input.permission,
	);
	if (permissionDenied) {
		return permissionDenied;
	}

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
