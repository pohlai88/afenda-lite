import { requireRole, type Session } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";

import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import type { ProductPermissionCode } from "@/modules/identity/domain/session-permission";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFailInternal,
} from "@/modules/platform/schemas/action-result";

export interface OperatorPermissionActionInput<T> {
	execute: (
		session: Session,
		correlationId: string,
	) => Promise<ActionResult<T>>;
	onPermissionDenied?: (input: {
		session: Session;
		correlationId: string;
		permission: ProductPermissionCode;
	}) => void | Promise<void>;
	path: string;
	permission: ProductPermissionCode;
	safeMessage: string;
}

/**
 * Shared operator session + permission + internal-error envelope for
 * Server Actions. Caller stamps org/user from `session`.
 */
export async function runOperatorPermissionAction<T>(
	input: OperatorPermissionActionInput<T>,
): Promise<ActionResult<T>> {
	const correlationId = createCorrelationId();
	const session = await requireRole("operator");

	const permissionDenied = await forbidUnlessPermission(
		session,
		input.permission,
	);
	if (permissionDenied) {
		if (input.onPermissionDenied !== undefined) {
			try {
				await input.onPermissionDenied({
					session,
					correlationId,
					permission: input.permission,
				});
			} catch {
				// Denial telemetry is best-effort and cannot replace the governed failure.
				logProductEvent({
					level: "error",
					event: "action.permission_denial_observer_error",
					correlationId,
					orgId: session.orgId,
					actorUserId: session.userId,
					path: input.path,
					code: "INTERNAL_ERROR",
				});
			}
		}
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
