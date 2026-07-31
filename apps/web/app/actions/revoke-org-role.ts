"use server";

import { requireRole } from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { createCorrelationId } from "@afenda/http";
import { revalidatePath } from "next/cache";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { revokeOrgRoleWithAudit } from "@/modules/identity/domain/revoke-org-role-audited";
import { revokeOrgRoleCommandSchema } from "@/modules/identity/schemas/revoke-org-role";
import { readRequestAttribution } from "@/modules/platform/domain/request-attribution";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface RevokeOrgRoleActionData {
	assignmentId: string;
	auditId: string;
	roleId: string;
	userId: string;
}

/** `null` = form idle (`useActionState`); otherwise API-002 `ActionResult`. */
export type RevokeOrgRoleActionState =
	ActionResult<RevokeOrgRoleActionData> | null;

/**
 * Operator revoke adapter — coarse `requireRole('operator')` + Tier-2
 * `org.roles.manage` via `hasPermission`, then Identity
 * `revokeOrgRoleWithAudit` (soft-revoke + org-scoped audit in one Neon HTTP
 * transaction — ARCH-023 · ARCH-025 · GUIDE-018 I3.1 · N12 · I5.3).
 */
export async function revokeOrgRoleAction(
	_prev: RevokeOrgRoleActionState,
	formData: FormData,
): Promise<RevokeOrgRoleActionState> {
	const correlationId = createCorrelationId();
	const session = await requireRole("operator");

	const parsed = parseSchema(revokeOrgRoleCommandSchema, {
		assignmentId: formData.get("assignmentId"),
	});
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Enter a valid assignment id.",
		});
	}

	const permissionDenied = await forbidUnlessPermission(
		session,
		"org.roles.manage",
	);
	if (permissionDenied) {
		return permissionDenied;
	}

	let result: Awaited<ReturnType<typeof revokeOrgRoleWithAudit>>;
	try {
		const attribution = await readRequestAttribution();
		result = await revokeOrgRoleWithAudit({
			orgId: session.orgId,
			assignmentId: parsed.data.assignmentId,
			actorUserId: session.userId,
			correlationId,
			...(attribution.ipAddress === undefined
				? {}
				: { ipAddress: attribution.ipAddress }),
			...(attribution.userAgent === undefined
				? {}
				: { userAgent: attribution.userAgent }),
		});
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "revokeOrgRoleAction",
			code: "INTERNAL_ERROR",
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}

	if (!result.ok) {
		return result;
	}

	logProductEvent({
		level: "info",
		event: "role.revoke",
		correlationId,
		orgId: session.orgId,
		actorUserId: session.userId,
		path: "revokeOrgRoleAction",
	});

	revalidatePath("/admin");

	return errorResult.ok({
		assignmentId: result.assignment.id,
		userId: result.assignment.userId,
		roleId: result.assignment.roleId,
		auditId: result.auditId,
	});
}
