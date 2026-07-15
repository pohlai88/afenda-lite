"use server";

import { canInviteMember, inviteOrgMember, requireRole } from "@afenda/auth";

import { parseInviteOrgMemberCommand } from "@/modules/identity/domain/invite-org-member";

export type InviteOrgMemberActionState =
	| { status: "idle" }
	| { status: "success"; email: string }
	| { status: "error"; message: string };

/**
 * Operator invite adapter — coarse `requireRole('operator')` +
 * `canInviteMember`, then `@afenda/auth` `inviteOrgMember` with session
 * `orgId` and production `APP_URL` Origin (ARCH-026 · GUIDE-018 I1.3).
 */
export async function inviteOrgMemberAction(
	_prev: InviteOrgMemberActionState,
	formData: FormData,
): Promise<InviteOrgMemberActionState> {
	const session = await requireRole("operator");

	let command: ReturnType<typeof parseInviteOrgMemberCommand>;
	try {
		command = parseInviteOrgMemberCommand({
			email: formData.get("email"),
			role: formData.get("role"),
		});
	} catch {
		return {
			status: "error",
			message: "Enter a valid email and membership role.",
		};
	}

	if (!canInviteMember(session.role, command.role)) {
		return {
			status: "error",
			message: "You cannot invite that membership role.",
		};
	}

	try {
		await inviteOrgMember({
			email: command.email,
			orgId: session.orgId,
			role: command.role,
		});
	} catch {
		return {
			status: "error",
			message: "Invitation could not be sent. Try again or contact an admin.",
		};
	}

	return { status: "success", email: command.email };
}
