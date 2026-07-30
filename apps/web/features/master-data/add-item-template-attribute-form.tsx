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
	type AddItemTemplateAttributeActionState,
	addItemTemplateAttributeAction,
} from "@/app/actions/add-item-template-attribute";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: AddItemTemplateAttributeActionState = null;

interface AddItemTemplateAttributeFormProps {
	canManage: boolean;
	draftTemplates: Array<{ id: string; label: string }>;
	valueKinds: readonly string[];
}

/** Add attribute while template is draft. */
export function AddItemTemplateAttributeForm({
	canManage,
	draftTemplates,
	valueKinds,
}: AddItemTemplateAttributeFormProps) {
	const [state, formAction, pending] = useActionState(
		addItemTemplateAttributeAction,
		initialState,
	);

	if (!canManage) {
		return null;
	}

	if (draftTemplates.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				No draft templates — create a template before adding attributes.
			</p>
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
					<AlertTitle>Attribute added</AlertTitle>
					<AlertDescription>
						{state.data.attribute.code} · {state.data.attribute.valueKind}
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField fieldId="attr-template" label="Draft template" required>
				<NativeSelect disabled={pending} name="templateId" required>
					{draftTemplates.map((template) => (
						<NativeSelectOption key={template.id} value={template.id}>
							{template.label}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>
			<FormField error={codeError} fieldId="attr-code" label="Code" required>
				<Input autoComplete="off" disabled={pending} name="code" required />
			</FormField>
			<FormField error={nameError} fieldId="attr-name" label="Name" required>
				<Input autoComplete="off" disabled={pending} name="name" required />
			</FormField>
			<FormField fieldId="attr-kind" label="Value kind" required>
				<NativeSelect disabled={pending} name="valueKind" required>
					{valueKinds.map((kind) => (
						<NativeSelectOption key={kind} value={kind}>
							{kind}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>
			<Button disabled={pending} type="submit">
				{pending ? (
					<>
						<Spinner className="size-4" /> Adding…
					</>
				) : (
					"Add attribute"
				)}
			</Button>
		</form>
	);
}
