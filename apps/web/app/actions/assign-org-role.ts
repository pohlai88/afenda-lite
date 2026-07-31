"use server";

import { authServer } from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { http } from "@afenda/http";
import { logger } from "@afenda/logger";
import { revalidatePath } from "next/cache";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { assignOrgRoleWithAudit } from "@/modules/identity/domain/assign-org-role-audited";
import { getOrganizationUser } from "@/modules/identity/domain/organization-users";
import { recordOrgRoleAssignedEvent } from "@/modules/identity/domain/record-org-role-assigned-event";
import { assignOrgRoleCommandSchema } from "@/modules/identity/schemas/assign-org-role";
import { readRequestAttribution } from "@/modules/platform/domain/request-attribution";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface AssignOrgRoleActionData {
	assignmentId: string;
	auditId: string;
	notificationId: string | null;
	reactivated: boolean;
	roleId: string;
	userId: string;
}

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
	const correlationId = http.correlation.create();
	const session = await authServer.session.requireRole("operator");

	const parsed = parseSchema(assignOrgRoleCommandSchema, {
		userId: formData.get("userId"),
		roleId: formData.get("roleId"),
	});
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Select a valid organization member and role.",
		});
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
		logger.event({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "assignOrgRoleAction.membership",
			code: "INTERNAL_ERROR",
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}

	if (!member) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "That user is not an active member of this organization.",
		});
	}

	let result: Awaited<ReturnType<typeof assignOrgRoleWithAudit>>;
	try {
		const attribution = await readRequestAttribution();
		result = await assignOrgRoleWithAudit({
			orgId: session.orgId,
			userId: member.userId,
			roleId: parsed.data.roleId,
			grantedBy: session.userId,
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
		logger.event({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "assignOrgRoleAction",
			code: "INTERNAL_ERROR",
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}

	if (!result.ok) {
		return result;
	}

	let notificationId: string | null = null;
	try {
		const recorded = await recordOrgRoleAssignedEvent({
			organizationId: session.orgId,
			userId: result.assignment.userId,
			roleId: result.assignment.roleId,
			assignmentId: result.assignment.id,
			actorUserId: session.userId,
			correlationId,
			reactivated: result.reactivated,
		});
		if (recorded.ok) {
			const { notificationId: recordedNotificationId } = recorded.data;
			notificationId = recordedNotificationId;
		} else {
			logger.event({
				level: "error",
				event: "action.internal_error",
				correlationId,
				orgId: session.orgId,
				actorUserId: session.userId,
				path: "assignOrgRoleAction.event",
				code: recorded.code,
			});
		}
	} catch {
		logger.event({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "assignOrgRoleAction.event",
			code: "INTERNAL_ERROR",
		});
	}

	logger.event({
		level: "info",
		event: "role.assign",
		correlationId,
		orgId: session.orgId,
		actorUserId: session.userId,
		path: "assignOrgRoleAction",
	});

	revalidatePath("/admin");

	return errorResult.ok({
		assignmentId: result.assignment.id,
		userId: result.assignment.userId,
		roleId: result.assignment.roleId,
		reactivated: result.reactivated,
		auditId: result.auditId,
		notificationId,
	});
}
