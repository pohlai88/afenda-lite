"use client";

import {
	Button,
	FormError,
	FormField,
	Input,
	NativeSelect,
	NativeSelectOption,
} from "@afenda/ui-system";
import { useActionState } from "react";

import {
	type InviteOrgMemberActionState,
	inviteOrgMemberAction,
} from "@/app/actions/invite-org-member";

const initialState: InviteOrgMemberActionState = null;

type InviteRole = "admin" | "operator" | "client";

const ROLE_LABELS: Record<InviteRole, string> = {
	client: "Client",
	operator: "Operator",
	admin: "Admin",
};

type InviteMemberFormProps = {
	inviteableRoles: InviteRole[];
	joinPath: string;
};

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

	const disabled = pending || inviteableRoles.length === 0;

	return (
		<form
			action={formAction}
			className="flex max-w-md flex-col gap-[var(--field-gap)]"
		>
			<FormField label="Email" required>
				<Input
					name="email"
					type="email"
					autoComplete="email"
					required
					disabled={disabled}
					placeholder="member@example.com"
				/>
			</FormField>

			<FormField label="Membership role" required>
				<NativeSelect
					name="role"
					defaultValue={defaultRole}
					disabled={disabled}
					className="w-full"
				>
					{inviteableRoles.map((role) => (
						<NativeSelectOption key={role} value={role}>
							{ROLE_LABELS[role]}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>

			<Button type="submit" disabled={disabled}>
				{pending ? "Sending invitation…" : "Send invitation"}
			</Button>

			{state?.ok === true ? (
				<p className="text-sm text-muted-foreground" role="status">
					Invitation sent to{" "}
					<code className="text-foreground">{state.data.email}</code>. Audit{" "}
					<code className="text-foreground">{state.data.auditId}</code> recorded
					for this org. They join via the email link at{" "}
					<code className="text-foreground">{joinPath}?invitationId=…</code>.
				</p>
			) : null}

			{state?.ok === false ? <FormError message={state.message} /> : null}
		</form>
	);
}
