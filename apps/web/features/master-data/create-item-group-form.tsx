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
			<FormField label="Code" required fieldId="item-group-code" error={codeError}>
				<Input name="code" required autoComplete="off" disabled={pending} />
			</FormField>
			<FormField label="Name" required fieldId="item-group-name" error={nameError}>
				<Input name="name" required autoComplete="off" disabled={pending} />
			</FormField>
			<Button type="submit" disabled={pending}>
				{pending ? <Spinner /> : null}
				Create item group
			</Button>
		</form>
	);
}
