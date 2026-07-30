"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	FormError,
	FormField,
	Input,
	Spinner,
} from "@afenda/ui-system";
import { useActionState } from "react";

import {
	type CreateItemGroupActionState,
	createItemGroupAction,
} from "@/app/actions/create-item-group";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: CreateItemGroupActionState = null;

export function CreateItemGroupForm({ canManage }: { canManage: boolean }) {
	const [state, formAction, pending] = useActionState(
		createItemGroupAction,
		initialState,
	);
	if (!canManage) {
		return (
			<Alert role="status">
				<AlertTitle>Create unavailable</AlertTitle>
				<AlertDescription>
					You can view master data but cannot create item groups.
				</AlertDescription>
			</Alert>
		);
	}
	const codeError = actionFieldMessage(state, "code");
	const nameError = actionFieldMessage(state, "name");
	const showFormError =
		!pending &&
		state?.ok === false &&
		codeError === undefined &&
		nameError === undefined;
	return (
		<form
			action={formAction}
			aria-busy={pending}
			className="flex max-w-md flex-col gap-(--field-gap)"
		>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Item group created</AlertTitle>
					<AlertDescription>
						{state.data.itemGroup.code} · {state.data.itemGroup.name} (draft).
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField
				error={codeError}
				fieldId="item-group-code"
				label="Code"
				required
			>
				<Input autoComplete="off" disabled={pending} name="code" required />
			</FormField>
			<FormField
				error={nameError}
				fieldId="item-group-name"
				label="Name"
				required
			>
				<Input autoComplete="off" disabled={pending} name="name" required />
			</FormField>
			<Button disabled={pending} type="submit">
				{pending ? <Spinner /> : null}
				Create item group
			</Button>
		</form>
	);
}
