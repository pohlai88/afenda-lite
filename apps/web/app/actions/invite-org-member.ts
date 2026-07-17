"use server";

import {
	buildJoinUrl,
	canInviteMember,
	inviteOrgMember,
	requireRole,
} from "@afenda/auth";
import { revalidatePath } from "next/cache";

import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { inviteOrgMemberCommandSchema } from "@/modules/identity/schemas/invite-org-member";
import {
	MEMBER_INVITE_AUDIT_ACTION,
	recordRbacAudit,
} from "@/modules/platform/domain/record-rbac-audit";
import { createCorrelationId } from "@/modules/platform/observability/correlation";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFail,
	actionFailInternal,
	actionOk,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type InviteOrgMemberActionData = {
	email: string;
	auditId: string;
	/** Relative `/join?invitationId=…` when Neon returned an invitation id. */
	joinUrl: string | null;
};

/** `null` = form idle (`useActionState`); otherwise API-002 `ActionResult`. */
export type InviteOrgMemberActionState =
	ActionResult<InviteOrgMemberActionData> | null;

/**
 * Operator invite adapter — coarse `requireRole('operator')` +
 * `canInviteMember` + Tier-2 `clients.invite` via `hasPermission`, Neon Auth
 * `inviteOrgMember` with session `orgId`, then Platform `recordRbacAudit`
 * hard-tenancy write (ARCH-023 · ARCH-026 · GUIDE-018 I1.3 / I2.1 / I2.3 / I3.1 · I5.3).
 */
export async function inviteOrgMemberAction(
	_prev: InviteOrgMemberActionState,
	formData: FormData,
): Promise<InviteOrgMemberActionState> {
	const correlationId = createCorrelationId();
	const session = await requireRole("operator");

	const parsed = parseSchema(inviteOrgMemberCommandSchema, {
		email: formData.get("email"),
		role: formData.get("role"),
	});
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Enter a valid email and membership role.",
			parsed.details,
		);
	}

	if (!canInviteMember(session.role, parsed.data.role)) {
		return actionFail("FORBIDDEN", "You cannot invite that membership role.");
	}

	const permissionDenied = await forbidUnlessPermission(
		session,
		"clients.invite",
	);
	if (permissionDenied) {
		return permissionDenied;
	}

	let invitationId: string | null = null;
	try {
		const invited = await inviteOrgMember({
			email: parsed.data.email,
			orgId: session.orgId,
			role: parsed.data.role,
		});
		invitationId = invited.invitationId;
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "inviteOrgMemberAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Invitation could not be sent. Try again or contact an admin.",
			correlationId,
		);
	}

	// Neon Auth invite is cross-system — cannot share a DB transaction with
	// platform_rbac_audit. One immediate retry reduces transient audit misses;
	// durable attribution after invite-without-audit remains I5.1 BLOCKED.
	const auditPayload = {
		orgId: session.orgId,
		action: MEMBER_INVITE_AUDIT_ACTION,
		actorUserId: session.userId,
		correlationId,
		targetType: "membership" as const,
		targetId: parsed.data.email,
		newValue: {
			email: parsed.data.email,
			role: parsed.data.role,
		},
	};
	let auditId: string | undefined;
	for (let attempt = 0; attempt < 2; attempt += 1) {
		try {
			const audit = await recordRbacAudit(auditPayload);
			auditId = audit.id;
			break;
		} catch {
			if (attempt === 1) {
				logProductEvent({
					level: "error",
					event: "action.internal_error",
					correlationId,
					orgId: session.orgId,
					actorUserId: session.userId,
					path: "inviteOrgMemberAction.audit",
					code: "INTERNAL_ERROR",
				});
				return actionFailInternal(
					"Invitation was sent but the org-scoped audit write failed. Contact an admin.",
					correlationId,
				);
			}
		}
	}
	if (!auditId) {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "inviteOrgMemberAction.audit",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Invitation was sent but the org-scoped audit write failed. Contact an admin.",
			correlationId,
		);
	}

	logProductEvent({
		level: "info",
		event: "member.invite",
		correlationId,
		orgId: session.orgId,
		actorUserId: session.userId,
		path: "inviteOrgMemberAction",
	});

	revalidatePath("/admin");

	return actionOk({
		email: parsed.data.email,
		auditId,
		joinUrl: invitationId ? buildJoinUrl({ invitationId }) : null,
	});
}
