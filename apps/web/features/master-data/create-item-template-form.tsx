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
	type CreateItemTemplateActionState,
	createItemTemplateAction,
} from "@/app/actions/create-item-template";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: CreateItemTemplateActionState = null;

type CreateItemTemplateFormProps = {
	canManage: boolean;
};

/** Draft item template create — attributes added while draft. */
export function CreateItemTemplateForm({
	canManage,
}: CreateItemTemplateFormProps) {
	const [state, formAction, pending] = useActionState(
		createItemTemplateAction,
		initialState,
	);

	if (!canManage) {
		return (
			<Alert role="status">
				<AlertTitle>Create unavailable</AlertTitle>
				<AlertDescription>
					You can view master data but cannot create item templates.
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
					<AlertTitle>Template created</AlertTitle>
					<AlertDescription>
						{state.data.template.code} · {state.data.template.name} (draft). Add
						attributes, then activate.
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField
				label="Code"
				required
				fieldId="item-template-code"
				error={codeError}
			>
				<Input name="code" required autoComplete="off" disabled={pending} />
			</FormField>
			<FormField
				label="Name"
				required
				fieldId="item-template-name"
				error={nameError}
			>
				<Input name="name" required autoComplete="off" disabled={pending} />
			</FormField>
			<Button type="submit" disabled={pending}>
				{pending ? (
					<>
						<Spinner className="size-4" /> Creating…
					</>
				) : (
					"Create template"
				)}
			</Button>
		</form>
	);
}
