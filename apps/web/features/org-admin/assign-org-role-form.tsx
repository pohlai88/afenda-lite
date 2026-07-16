"use client";

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
import { useActionState } from "react";

import {
	type AssignOrgRoleActionState,
	assignOrgRoleAction,
} from "@/app/actions/assign-org-role";

const initialState: AssignOrgRoleActionState = null;

export type AssignableRoleOption = {
	id: string;
	name: string;
};

type AssignOrgRoleFormProps = {
	roles: AssignableRoleOption[];
};

type FieldErrors = {
	fieldErrors?: Record<string, string[] | undefined>;
};

function fieldMessage(
	state: AssignOrgRoleActionState,
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

/**
 * Org-admin assign form — CAPABLE when assignable roles exist (GUIDE-018 I3.1).
 * Neon `userId` text field until a member-directory port ships (not a fake CTA).
 */
export function AssignOrgRoleForm({ roles }: AssignOrgRoleFormProps) {
	const [state, formAction, pending] = useActionState(
		assignOrgRoleAction,
		initialState,
	);

	if (roles.length === 0) {
		return (
			<Alert>
				<AlertTitle>Assignment unavailable</AlertTitle>
				<AlertDescription>
					No assignable platform roles are available for this organization.
				</AlertDescription>
			</Alert>
		);
	}

	const defaultRoleId = roles[0]?.id;
	const userIdError = fieldMessage(state, "userId");
	const roleIdError = fieldMessage(state, "roleId");
	const showFormError =
		state?.ok === false &&
		userIdError === undefined &&
		roleIdError === undefined;

	return (
		<form
			action={formAction}
			aria-busy={pending}
			className="flex max-w-md flex-col gap-(--field-gap)"
		>
			<FormField
				label="User ID"
				required
				fieldId="assign-user-id"
				error={userIdError}
				description="Neon Auth user id for the member receiving the platform role."
			>
				<Input
					name="userId"
					type="text"
					autoComplete="off"
					required
					disabled={pending}
					placeholder="user id"
					spellCheck={false}
				/>
			</FormField>

			<FormField
				label="Platform role"
				required
				fieldId="assign-role-id"
				error={roleIdError}
			>
				<NativeSelect
					name="roleId"
					defaultValue={defaultRoleId}
					disabled={pending}
				>
					{roles.map((role) => (
						<NativeSelectOption key={role.id} value={role.id}>
							{role.name}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>

			<Button type="submit" disabled={pending}>
				{pending ? (
					<>
						<Spinner
							size="sm"
							label="Assigning role"
							className="text-primary-foreground"
						/>
						Assigning role…
					</>
				) : (
					"Assign role"
				)}
			</Button>

			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>
						{state.data.reactivated ? "Assignment restored" : "Role assigned"}
					</AlertTitle>
					<AlertDescription>
						User{" "}
						<code className="font-mono text-sm text-foreground-tertiary">
							{state.data.userId}
						</code>{" "}
						· assignment{" "}
						<code className="font-mono text-sm text-foreground-tertiary">
							{state.data.assignmentId}
						</code>
						. Audit{" "}
						<code className="font-mono text-sm text-foreground-tertiary">
							{state.data.auditId}
						</code>{" "}
						recorded for this org.
					</AlertDescription>
				</Alert>
			) : null}

			{showFormError ? <FormError message={state.message} /> : null}
		</form>
	);
}
