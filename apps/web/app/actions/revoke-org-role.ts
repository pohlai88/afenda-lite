"use server";

import { requireRole } from "@afenda/auth";
import { revalidatePath } from "next/cache";

import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { revokeOrgRole } from "@/modules/identity/domain/revoke-org-role";
import { revokeOrgRoleCommandSchema } from "@/modules/identity/schemas/revoke-org-role";
import {
	ROLE_REVOKE_AUDIT_ACTION,
	recordRbacAudit,
} from "@/modules/platform/domain/record-rbac-audit";
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
 * `org.roles.manage` via `hasPermission`, Identity `revokeOrgRole` hard-tenancy
 * soft-revoke, then Platform `recordRbacAudit` (ARCH-023 · GUIDE-018 I3.1).
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

	let result: Awaited<ReturnType<typeof revokeOrgRole>>;
	try {
		result = await revokeOrgRole({
			orgId: session.orgId,
			assignmentId: parsed.data.assignmentId,
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

	let auditId: string;
	try {
		const audit = await recordRbacAudit({
			orgId: session.orgId,
			action: ROLE_REVOKE_AUDIT_ACTION,
			actorUserId: session.userId,
			targetType: "role_assignment",
			targetId: result.assignment.id,
			roleId: result.assignment.roleId,
			oldValue: {
				userId: result.assignment.userId,
				roleId: result.assignment.roleId,
				scopeType: result.assignment.scopeType,
				active: true,
			},
			newValue: {
				active: false,
			},
		});
		auditId = audit.id;
	} catch {
		return actionFail(
			"INTERNAL_ERROR",
			"Role was revoked but the org-scoped audit write failed. Contact an admin.",
		);
	}

	revalidatePath("/admin");

	return actionOk({
		assignmentId: result.assignment.id,
		userId: result.assignment.userId,
		roleId: result.assignment.roleId,
		auditId,
	});
}
