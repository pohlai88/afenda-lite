"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	Code,
	Combobox,
	FormError,
	FormField,
	NativeSelect,
	NativeSelectOption,
	Spinner,
} from "@afenda/ui-system";
import { useActionState, useEffect, useMemo, useState } from "react";

import {
	type AssignOrgRoleActionState,
	assignOrgRoleAction,
} from "@/app/actions/assign-org-role";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: AssignOrgRoleActionState = null;

export type AssignableRoleOption = {
	id: string;
	name: string;
};

export type AssignableMemberOption = {
	id: string;
	label: string;
};

export type MemberDirectoryState =
	| { status: "ready"; options: AssignableMemberOption[] }
	| { status: "empty"; options: [] }
	| { status: "unavailable"; options: [] };

type AssignOrgRoleFormProps = {
	roles: AssignableRoleOption[];
	memberDirectory: MemberDirectoryState;
};

/**
 * Org-admin assign form — CAPABLE when assignable roles and the org member
 * directory are available (GUIDE-018 I3.4 cut A · UI-CAP-07 Combobox).
 */
export function AssignOrgRoleForm({
	roles,
	memberDirectory,
}: AssignOrgRoleFormProps) {
	const [state, formAction, pending] = useActionState(
		assignOrgRoleAction,
		initialState,
	);
	const [selectedUserId, setSelectedUserId] = useState("");

	useEffect(() => {
		if (state?.ok === true) {
			setSelectedUserId("");
		}
	}, [state]);

	const comboboxOptions = useMemo(
		() =>
			memberDirectory.options.map((member) => ({
				value: member.id,
				label: member.label,
			})),
		[memberDirectory.options],
	);

	if (roles.length === 0) {
		return (
			<Alert role="status">
				<AlertTitle>Assignment unavailable</AlertTitle>
				<AlertDescription>
					No assignable platform roles are available for this organization.
				</AlertDescription>
			</Alert>
		);
	}

	if (memberDirectory.status === "unavailable") {
		return (
			<Alert>
				<AlertTitle>Member directory unavailable</AlertTitle>
				<AlertDescription>
					Organization members could not be loaded. Role assignment stays closed
					until the directory is available again.
				</AlertDescription>
			</Alert>
		);
	}

	if (memberDirectory.status === "empty") {
		return (
			<Alert role="status">
				<AlertTitle>No organization members</AlertTitle>
				<AlertDescription>
					Invite a Neon Auth member to this organization before assigning a
					platform role.
				</AlertDescription>
			</Alert>
		);
	}

	const defaultRoleId = roles[0]?.id;
	const userIdError = actionFieldMessage(state, "userId");
	const roleIdError = actionFieldMessage(state, "roleId");
	const showFormError =
		!pending &&
		state?.ok === false &&
		userIdError === undefined &&
		roleIdError === undefined;

	return (
		<form
			action={formAction}
			aria-busy={pending}
			className="flex w-full flex-col gap-(--field-gap)"
		>
			<FormField
				label="Organization member"
				required
				fieldId="assign-user-id"
				error={userIdError}
				description="Search and select an active Neon Auth member of this organization."
			>
				<Combobox
					name="userId"
					options={comboboxOptions}
					value={selectedUserId}
					onValueChange={setSelectedUserId}
					placeholder="Select a member…"
					searchPlaceholder="Search members…"
					emptyMessage="No matching members."
					disabled={pending}
					aria-label="Organization member"
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

			<Button type="submit" disabled={pending || selectedUserId.length === 0}>
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

			{state?.ok === true && !pending ? (
				<Alert role="status">
					<AlertTitle>
						{state.data.reactivated ? "Assignment restored" : "Role assigned"}
					</AlertTitle>
					<AlertDescription>
						User <Code>{state.data.userId}</Code> · assignment{" "}
						<Code>{state.data.assignmentId}</Code>. Audit{" "}
						<Code>{state.data.auditId}</Code> recorded for this org.
					</AlertDescription>
				</Alert>
			) : null}

			{showFormError ? <FormError message={state.message} /> : null}
		</form>
	);
}
