import { requireRole, type Session } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";

import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import type { ProductPermissionCode } from "@/modules/identity/domain/session-permission";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFailInternal,
} from "@/modules/platform/schemas/action-result";

/**
 * Shared operator session + permission + internal-error envelope for
 * Server Actions. Caller stamps org/user from `session`.
 */
export async function runOperatorPermissionAction<T>(input: {
	path: string;
	permission: ProductPermissionCode;
	safeMessage: string;
	execute: (
		session: Session,
		correlationId: string,
	) => Promise<ActionResult<T>>;
}): Promise<ActionResult<T>> {
	const correlationId = createCorrelationId();
	const session = await requireRole("operator");

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
		return actionFailInternal(input.safeMessage, correlationId);
	}
}
