"use client";

import type { Role } from "@afenda/auth/client";
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	FormError,
	FormField,
	Input,
	NativeSelect,
	NativeSelectOption,
	Spinner,
} from "@afenda/ui-system";
import Link from "next/link";
import { useActionState } from "react";

import {
	type InviteOrgMemberActionState,
	inviteOrgMemberAction,
} from "@/app/actions/invite-org-member";

const initialState: InviteOrgMemberActionState = null;

const ROLE_LABELS: Record<Role, string> = {
	client: "Client",
	operator: "Operator",
	admin: "Admin",
};

type InviteMemberFormProps = {
	inviteableRoles: Role[];
	joinPath: string;
};

type FieldErrors = {
	fieldErrors?: Record<string, string[] | undefined>;
};

function fieldMessage(
	state: InviteOrgMemberActionState,
	field: string,
): string | undefined {
	if (!state || state.ok || state.details === undefined) {
		return undefined;
	}
	if (typeof state.details !== "object" || state.details === null) {
		return undefined;
	}
	const messages = (state.details as FieldErrors).fieldErrors?.[field];
	return messages?.[0];
}

export function InviteMemberForm({
	inviteableRoles,
	joinPath,
}: InviteMemberFormProps) {
	const [state, formAction, pending] = useActionState(
		inviteOrgMemberAction,
		initialState,
	);

	if (inviteableRoles.length === 0) {
		return (
			<Alert>
				<AlertTitle>Invitations unavailable</AlertTitle>
				<AlertDescription>
					Your membership role cannot invite members for this organization.
					Lists below remain available read-only.
				</AlertDescription>
			</Alert>
		);
	}

	const defaultRole = inviteableRoles.includes("client")
		? "client"
		: inviteableRoles[0];
	const emailError = fieldMessage(state, "email");
	const roleError = fieldMessage(state, "role");
	const showFormError =
		state?.ok === false && emailError === undefined && roleError === undefined;

	return (
		<form
			action={formAction}
			aria-busy={pending}
			className="flex max-w-md flex-col gap-(--field-gap)"
		>
			<FormField
				label="Email"
				required
				fieldId="invite-email"
				error={emailError}
			>
				<Input
					name="email"
					type="email"
					autoComplete="email"
					required
					disabled={pending}
					placeholder="member@example.com"
				/>
			</FormField>

			<FormField
				label="Membership role"
				required
				fieldId="invite-role"
				error={roleError}
			>
				<NativeSelect name="role" defaultValue={defaultRole} disabled={pending}>
					{inviteableRoles.map((role) => (
						<NativeSelectOption key={role} value={role}>
							{ROLE_LABELS[role]}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>

			<Button type="submit" disabled={pending}>
				{pending ? (
					<>
						<Spinner
							size="sm"
							label="Sending invitation"
							className="text-primary-foreground"
						/>
						Sending invitation…
					</>
				) : (
					"Send invitation"
				)}
			</Button>

			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Invitation sent</AlertTitle>
					<AlertDescription>
						Sent to{" "}
						<code className="font-mono text-sm text-foreground-tertiary">
							{state.data.email}
						</code>
						. Audit{" "}
						<code className="font-mono text-sm text-foreground-tertiary">
							{state.data.auditId}
						</code>{" "}
						recorded for this org.{" "}
						{state.data.joinUrl ? (
							<>
								Join link:{" "}
								<Button
									asChild
									variant="link"
									className="h-auto p-0 font-mono text-sm"
								>
									<Link href={state.data.joinUrl} data-testid="invite-join-url">
										{state.data.joinUrl}
									</Link>
								</Button>
								.
							</>
						) : (
							<>
								They join via the email link at{" "}
								<code className="font-mono text-sm text-foreground-tertiary">
									{joinPath}?invitationId=…
								</code>
								.
							</>
						)}
					</AlertDescription>
				</Alert>
			) : null}

			{showFormError ? <FormError message={state.message} /> : null}
		</form>
	);
}
