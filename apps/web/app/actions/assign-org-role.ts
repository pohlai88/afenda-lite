"use server";

import { requireRole } from "@afenda/auth";
import { revalidatePath } from "next/cache";

import { assignOrgRole } from "@/modules/identity/domain/assign-org-role";
import { hasPermission } from "@/modules/identity/domain/has-permission";
import { assignOrgRoleCommandSchema } from "@/modules/identity/schemas/assign-org-role";
import {
	ROLE_ASSIGN_AUDIT_ACTION,
	recordRbacAudit,
} from "@/modules/platform/domain/record-rbac-audit";
import {
	type ActionResult,
	actionFail,
	actionOk,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type AssignOrgRoleActionData = {
	assignmentId: string;
	userId: string;
	roleId: string;
	reactivated: boolean;
	auditId: string;
};

/** `null` = form idle (`useActionState`); otherwise API-002 `ActionResult`. */
export type AssignOrgRoleActionState =
	ActionResult<AssignOrgRoleActionData> | null;

/**
 * Operator assign adapter — coarse `requireRole('operator')` + Tier-2
 * `org.roles.manage` via `hasPermission`, Identity `assignOrgRole` hard-tenancy
 * write, then Platform `recordRbacAudit` (ARCH-023 · GUIDE-018 I3.1).
 */
export async function assignOrgRoleAction(
	_prev: AssignOrgRoleActionState,
	formData: FormData,
): Promise<AssignOrgRoleActionState> {
	const session = await requireRole("operator");

	const parsed = parseSchema(assignOrgRoleCommandSchema, {
		userId: formData.get("userId"),
		roleId: formData.get("roleId"),
	});
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Enter a valid user id and role.",
			parsed.details,
		);
	}

	const allowed = await hasPermission({
		orgId: session.orgId,
		userId: session.userId,
		code: "org.roles.manage",
		bootstrapRole: session.role,
	});
	if (!allowed) {
		return actionFail(
			"FORBIDDEN",
			"You do not have permission to manage org roles.",
		);
	}

	let result: Awaited<ReturnType<typeof assignOrgRole>>;
	try {
		result = await assignOrgRole({
			orgId: session.orgId,
			userId: parsed.data.userId,
			roleId: parsed.data.roleId,
			grantedBy: session.userId,
		});
	} catch {
		return actionFail(
			"INTERNAL_ERROR",
			"Role assignment failed. Try again or contact an admin.",
		);
	}

	if (!result.ok) {
		return actionFail(result.code, result.message);
	}

	let auditId: string;
	try {
		const audit = await recordRbacAudit({
			orgId: session.orgId,
			action: ROLE_ASSIGN_AUDIT_ACTION,
			actorUserId: session.userId,
			targetType: "role_assignment",
			targetId: result.assignment.id,
			roleId: result.assignment.roleId,
			newValue: {
				userId: result.assignment.userId,
				roleId: result.assignment.roleId,
				scopeType: result.assignment.scopeType,
				reactivated: result.reactivated,
			},
		});
		auditId = audit.id;
	} catch {
		return actionFail(
			"INTERNAL_ERROR",
			"Role was assigned but the org-scoped audit write failed. Contact an admin.",
		);
	}

	revalidatePath("/admin");

	return actionOk({
		assignmentId: result.assignment.id,
		userId: result.assignment.userId,
		roleId: result.assignment.roleId,
		reactivated: result.reactivated,
		auditId,
	});
}
