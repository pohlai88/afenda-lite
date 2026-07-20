"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	FormError,
	FormField,
	NativeSelect,
	NativeSelectOption,
	Spinner,
} from "@afenda/ui-system";
import { useActionState } from "react";

import {
	type CreatePartyRoleActionState,
	createPartyRoleAction,
} from "@/app/actions/create-party-role";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: CreatePartyRoleActionState = null;

type PartyOption = {
	id: string;
	label: string;
};

type CreatePartyRoleFormProps = {
	canManage: boolean;
	parties: PartyOption[];
	roleCodes: readonly string[];
};

/**
 * Party role create — closed catalog passed from RSC (package is server-only).
 */
export function CreatePartyRoleForm({
	canManage,
	parties,
	roleCodes,
}: CreatePartyRoleFormProps) {
	const [state, formAction, pending] = useActionState(
		createPartyRoleAction,
		initialState,
	);

	if (!canManage) {
		return null;
	}

	if (parties.length === 0) {
		return (
			<Alert role="status">
				<AlertTitle>No parties yet</AlertTitle>
				<AlertDescription>
					Create a party before assigning a commercial role.
				</AlertDescription>
			</Alert>
		);
	}

	const partyError = actionFieldMessage(state, "partyId");
	const roleError = actionFieldMessage(state, "roleCode");
	const showFormError =
		!pending &&
		state?.ok === false &&
		partyError === undefined &&
		roleError === undefined;

	return (
		<form
			action={formAction}
			aria-busy={pending}
			className="flex max-w-md flex-col gap-(--field-gap)"
		>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Role added</AlertTitle>
					<AlertDescription>
						{state.data.partyRole.roleCode} · status{" "}
						{state.data.partyRole.status}
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField label="Party" required fieldId="role-party" error={partyError}>
				<NativeSelect
					name="partyId"
					disabled={pending}
					defaultValue={parties[0]?.id}
				>
					{parties.map((party) => (
						<NativeSelectOption key={party.id} value={party.id}>
							{party.label}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>
			<FormField label="Role" required fieldId="role-code" error={roleError}>
				<NativeSelect
					name="roleCode"
					disabled={pending}
					defaultValue={roleCodes[0]}
				>
					{roleCodes.map((code) => (
						<NativeSelectOption key={code} value={code}>
							{code}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>
			<Button type="submit" disabled={pending}>
				{pending ? <Spinner /> : null}
				Add role
			</Button>
		</form>
	);
}
