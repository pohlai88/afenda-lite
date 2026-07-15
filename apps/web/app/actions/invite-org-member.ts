"use server";

import { canInviteMember, inviteOrgMember, requireRole } from "@afenda/auth";
import { revalidatePath } from "next/cache";

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
};

/** `null` = form idle (`useActionState`); otherwise API-002 `ActionResult`. */
export type InviteOrgMemberActionState =
	ActionResult<InviteOrgMemberActionData> | null;

/**
 * Operator invite adapter — coarse `requireRole('operator')` +
 * `canInviteMember`, Neon Auth `inviteOrgMember` with session `orgId`, then
 * Platform `recordRbacAudit` hard-tenancy write (ARCH-023 · ARCH-026 ·
 * GUIDE-018 I1.3 / I2.1 / I2.3).
 *
 * AuthZ bar for I2.3: Tier-1 session role gates only. ARCH-023 Tier-2
 * `clients.invite` / `hasPermission` is GUIDE-018 **I3.1** — do not invent a
 * permission-code shim here.
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

	try {
		await inviteOrgMember({
			email: parsed.data.email,
			orgId: session.orgId,
			role: parsed.data.role,
		});
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

	return actionOk({ email: parsed.data.email, auditId });
}
