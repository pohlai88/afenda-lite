"use server";

import { requireRole } from "@afenda/auth";
import { revalidatePath } from "next/cache";

import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { revokeOrgRoleWithAudit } from "@/modules/identity/domain/revoke-org-role-audited";
import { revokeOrgRoleCommandSchema } from "@/modules/identity/schemas/revoke-org-role";
import {
	type ActionResult,
	actionFail,
	actionOk,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type RevokeOrgRoleActionData = {
	assignmentId: string;
	userId: string;
	roleId: string;
	auditId: string;
};

/** `null` = form idle (`useActionState`); otherwise API-002 `ActionResult`. */
export type RevokeOrgRoleActionState =
	ActionResult<RevokeOrgRoleActionData> | null;

/**
 * Operator revoke adapter — coarse `requireRole('operator')` + Tier-2
 * `org.roles.manage` via `hasPermission`, then Identity
 * `revokeOrgRoleWithAudit` (soft-revoke + org-scoped audit in one Neon HTTP
 * transaction — ARCH-023 · ARCH-025 · GUIDE-018 I3.1 · N12).
 */
export async function revokeOrgRoleAction(
	_prev: RevokeOrgRoleActionState,
	formData: FormData,
): Promise<RevokeOrgRoleActionState> {
	const session = await requireRole("operator");

	const parsed = parseSchema(revokeOrgRoleCommandSchema, {
		assignmentId: formData.get("assignmentId"),
	});
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Enter a valid assignment id.",
			parsed.details,
		);
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
		result = await revokeOrgRoleWithAudit({
			orgId: session.orgId,
			assignmentId: parsed.data.assignmentId,
			actorUserId: session.userId,
		});
	} catch {
		return actionFail(
			"INTERNAL_ERROR",
			"Role revocation failed. Try again or contact an admin.",
		);
	}

	if (!result.ok) {
		return actionFail(result.code, result.message);
	}

	revalidatePath("/admin");

	return actionOk({
		assignmentId: result.assignment.id,
		userId: result.assignment.userId,
		roleId: result.assignment.roleId,
		auditId: result.auditId,
	});
}
