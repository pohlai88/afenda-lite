"use server";

import { canInviteMember, inviteOrgMember, requireRole } from "@afenda/auth";

import { inviteOrgMemberCommandSchema } from "@/modules/identity/schemas/invite-org-member";
import {
	type ActionResult,
	actionFail,
	actionOk,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type InviteOrgMemberActionData = {
	email: string;
};

/** `null` = form idle (`useActionState`); otherwise API-002 `ActionResult`. */
export type InviteOrgMemberActionState =
	ActionResult<InviteOrgMemberActionData> | null;

/**
 * Operator invite adapter — coarse `requireRole('operator')` +
 * `canInviteMember`, then `@afenda/auth` `inviteOrgMember` with session
 * `orgId` and production `APP_URL` Origin (ARCH-026 · GUIDE-018 I1.3 / I2.1).
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

	return actionOk({ email: parsed.data.email });
}
