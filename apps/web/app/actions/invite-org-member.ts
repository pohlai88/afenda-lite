"use server";

import {
	buildJoinUrl,
	canInviteMember,
	inviteOrgMember,
	requireRole,
} from "@afenda/auth";
import { revalidatePath } from "next/cache";

import { hasPermission } from "@/modules/identity/domain/has-permission";
import { inviteOrgMemberCommandSchema } from "@/modules/identity/schemas/invite-org-member";
import {
	MEMBER_INVITE_AUDIT_ACTION,
	recordRbacAudit,
} from "@/modules/platform/domain/record-rbac-audit";
import {
	type ActionResult,
	actionFail,
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
 * hard-tenancy write (ARCH-023 · ARCH-026 · GUIDE-018 I1.3 / I2.1 / I2.3 / I3.1).
 */
export async function inviteOrgMemberAction(
	_prev: InviteOrgMemberActionState,
	formData: FormData,
): Promise<InviteOrgMemberActionState> {
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

	const mayInvite = await hasPermission({
		orgId: session.orgId,
		userId: session.userId,
		code: "clients.invite",
		bootstrapRole: session.role,
	});
	if (!mayInvite) {
		return actionFail(
			"FORBIDDEN",
			"You do not have permission to invite members.",
		);
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
		return actionFail(
			"INTERNAL_ERROR",
			"Invitation could not be sent. Try again or contact an admin.",
		);
	}

	let auditId: string;
	try {
		const audit = await recordRbacAudit({
			orgId: session.orgId,
			action: MEMBER_INVITE_AUDIT_ACTION,
			actorUserId: session.userId,
			targetType: "membership",
			targetId: parsed.data.email,
			newValue: {
				email: parsed.data.email,
				role: parsed.data.role,
			},
		});
		auditId = audit.id;
	} catch {
		return actionFail(
			"INTERNAL_ERROR",
			"Invitation was sent but the org-scoped audit write failed. Contact an admin.",
		);
	}

	revalidatePath("/admin");

	return actionOk({
		email: parsed.data.email,
		auditId,
		joinUrl: invitationId ? buildJoinUrl({ invitationId }) : null,
	});
}
