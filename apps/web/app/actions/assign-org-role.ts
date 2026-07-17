"use server";

import { requireRole } from "@afenda/auth";
import { revalidatePath } from "next/cache";

import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { assignOrgRoleWithAudit } from "@/modules/identity/domain/assign-org-role-audited";
import { getOrganizationUser } from "@/modules/identity/domain/organization-users";
import { assignOrgRoleCommandSchema } from "@/modules/identity/schemas/assign-org-role";
import { createCorrelationId } from "@/modules/platform/observability/correlation";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFail,
	actionFailInternal,
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
 * `org.roles.manage` via `hasPermission`, current-org membership check,
 * then Identity `assignOrgRoleWithAudit` (mutation + org-scoped audit in
 * one Neon HTTP transaction — ARCH-023 · ARCH-025 · GUIDE-018 I3.1 · N12 · I5.3).
 */
export async function assignOrgRoleAction(
	_prev: AssignOrgRoleActionState,
	formData: FormData,
): Promise<AssignOrgRoleActionState> {
	const correlationId = createCorrelationId();
	const session = await requireRole("operator");

	const parsed = parseSchema(assignOrgRoleCommandSchema, {
		userId: formData.get("userId"),
		roleId: formData.get("roleId"),
	});
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Select a valid organization member and role.",
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

	let member: Awaited<ReturnType<typeof getOrganizationUser>>;
	try {
		member = await getOrganizationUser(session.orgId, parsed.data.userId);
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "assignOrgRoleAction.membership",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Could not verify organization membership. Try again or contact an admin.",
			correlationId,
		);
	}

	if (!member) {
		return actionFail(
			"NOT_FOUND",
			"That user is not an active member of this organization.",
		);
	}

	let result: Awaited<ReturnType<typeof assignOrgRoleWithAudit>>;
	try {
		result = await assignOrgRoleWithAudit({
			orgId: session.orgId,
			userId: member.userId,
			roleId: parsed.data.roleId,
			grantedBy: session.userId,
			actorUserId: session.userId,
			correlationId,
		});
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "assignOrgRoleAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Role assignment failed. Try again or contact an admin.",
			correlationId,
		);
	}

	if (!result.ok) {
		return actionFail(result.code, result.message);
	}

	logProductEvent({
		level: "info",
		event: "role.assign",
		correlationId,
		orgId: session.orgId,
		actorUserId: session.userId,
		path: "assignOrgRoleAction",
	});

	revalidatePath("/admin");

	return actionOk({
		assignmentId: result.assignment.id,
		userId: result.assignment.userId,
		roleId: result.assignment.roleId,
		reactivated: result.reactivated,
		auditId: result.auditId,
	});
}
