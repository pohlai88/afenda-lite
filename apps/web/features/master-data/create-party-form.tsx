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
	type CreatePartyActionState,
	createPartyAction,
} from "@/app/actions/create-party";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: CreatePartyActionState = null;

type CreatePartyFormProps = {
	canManage: boolean;
	partyKinds: readonly string[];
};

/**
 * Party create form — CAPABLE when `master_data.manage` is granted.
 * Kind catalog is passed from RSC (package is server-only).
 */
export function CreatePartyForm({
	canManage,
	partyKinds,
}: CreatePartyFormProps) {
	const [state, formAction, pending] = useActionState(
		createPartyAction,
		initialState,
	);

	if (!canManage) {
		return (
			<Alert role="status">
				<AlertTitle>Create unavailable</AlertTitle>
				<AlertDescription>
					You can view master data but cannot create parties in this
					organization.
				</AlertDescription>
			</Alert>
		);
	}

	const codeError = actionFieldMessage(state, "code");
	const nameError = actionFieldMessage(state, "name");
	const kindError = actionFieldMessage(state, "partyKind");
	const showFormError =
		!pending &&
		state?.ok === false &&
		codeError === undefined &&
		nameError === undefined &&
		kindError === undefined;

	return (
		<form
			action={formAction}
			aria-busy={pending}
			className="flex max-w-md flex-col gap-(--field-gap)"
		>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Party created</AlertTitle>
					<AlertDescription>
						{state.data.party.code} · {state.data.party.name} (draft). Add a
						role before activation.
						{state.data.duplicateWarnings.length > 0
							? ` Warnings: ${state.data.duplicateWarnings
									.map((warning) => warning.message)
									.join("; ")}`
							: ""}
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField label="Code" required fieldId="party-code" error={codeError}>
				<Input name="code" required autoComplete="off" disabled={pending} />
			</FormField>
			<FormField label="Name" required fieldId="party-name" error={nameError}>
				<Input
					name="name"
					required
					autoComplete="organization"
					disabled={pending}
				/>
			</FormField>
			<FormField label="Kind" required fieldId="party-kind" error={kindError}>
				<NativeSelect
					name="partyKind"
					defaultValue={partyKinds[0]}
					disabled={pending}
				>
					{partyKinds.map((kind) => (
						<NativeSelectOption key={kind} value={kind}>
							{kind}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>
			<Button type="submit" disabled={pending}>
				{pending ? <Spinner /> : null}
				Create party
			</Button>
		</form>
	);
}
