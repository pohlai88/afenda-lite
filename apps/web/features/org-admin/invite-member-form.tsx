"use client";

import { useActionState } from "react";

import {
	type InviteOrgMemberActionState,
	inviteOrgMemberAction,
} from "@/app/actions/invite-org-member";

const initialState: InviteOrgMemberActionState = null;

const fieldClassName =
	"border-input bg-background h-9 w-full rounded-md border px-3 text-sm";

type InviteRole = "admin" | "operator" | "client";

const ROLE_LABELS: Record<InviteRole, string> = {
	client: "Client",
	operator: "Operator",
	admin: "Admin",
};

type InviteMemberFormProps = {
	/** Membership roles the signed-in operator may invite. */
	inviteableRoles: InviteRole[];
	/** Canonical join path (`JOIN_PATH`) from `@afenda/auth` — RSC-supplied. */
	joinPath: string;
};

/**
 * Operator invite form — posts to `inviteOrgMemberAction` → Neon Auth
 * via `@afenda/auth` (GUIDE-018 I1.3). Invitees join at `/join?invitationId=…`.
 */
export function InviteMemberForm({
	inviteableRoles,
	joinPath,
}: InviteMemberFormProps) {
	const [state, formAction, pending] = useActionState(
		inviteOrgMemberAction,
		initialState,
	);

	const defaultRole = inviteableRoles.includes("client")
		? "client"
		: (inviteableRoles[0] ?? "client");

	return (
		<form action={formAction} className="flex max-w-md flex-col gap-4">
			<div className="flex flex-col gap-2">
				<label htmlFor="invite-email" className="text-sm font-medium">
					Email
				</label>
				<input
					id="invite-email"
					name="email"
					type="email"
					autoComplete="email"
					required
					disabled={pending || inviteableRoles.length === 0}
					placeholder="member@example.com"
					className={fieldClassName}
				/>
			</div>

			<div className="flex flex-col gap-2">
				<label htmlFor="invite-role" className="text-sm font-medium">
					Membership role
				</label>
				<select
					id="invite-role"
					name="role"
					defaultValue={defaultRole}
					disabled={pending || inviteableRoles.length === 0}
					className={fieldClassName}
				>
					{inviteableRoles.map((role) => (
						<option key={role} value={role}>
							{ROLE_LABELS[role]}
						</option>
					))}
				</select>
			</div>

			<button
				type="submit"
				disabled={pending || inviteableRoles.length === 0}
				className="bg-primary text-primary-foreground h-9 rounded-md px-4 text-sm font-medium disabled:opacity-50"
			>
				{pending ? "Sending invitation…" : "Send invitation"}
			</button>

			{state?.ok === true ? (
				<p className="text-sm text-muted-foreground" role="status">
					Invitation sent to{" "}
					<code className="text-foreground">{state.data.email}</code>. They join
					via the email link at{" "}
					<code className="text-foreground">{joinPath}?invitationId=…</code>.
				</p>
			) : null}

			{state?.ok === false ? (
				<p className="text-sm text-destructive" role="alert">
					{state.message}
				</p>
			) : null}
		</form>
	);
}
