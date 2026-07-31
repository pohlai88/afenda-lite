import { getSession, type Session } from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { createCorrelationId } from "@afenda/http";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import type { ProductPermissionCode } from "@/modules/identity/domain/session-permission";
import { logProductEvent } from "@/modules/platform/observability/product-log";

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
	const correlationId = createCorrelationId();
	const session = await getSession();

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
		logProductEvent({
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
