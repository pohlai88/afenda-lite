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

type AddItemTemplateAttributeFormProps = {
	canManage: boolean;
	draftTemplates: Array<{ id: string; label: string }>;
	valueKinds: readonly string[];
};

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
			<p className="text-sm text-muted-foreground">
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
			<FormField label="Draft template" required fieldId="attr-template">
				<NativeSelect name="templateId" required disabled={pending}>
					{draftTemplates.map((template) => (
						<NativeSelectOption key={template.id} value={template.id}>
							{template.label}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>
			<FormField label="Code" required fieldId="attr-code" error={codeError}>
				<Input name="code" required autoComplete="off" disabled={pending} />
			</FormField>
			<FormField label="Name" required fieldId="attr-name" error={nameError}>
				<Input name="name" required autoComplete="off" disabled={pending} />
			</FormField>
			<FormField label="Value kind" required fieldId="attr-kind">
				<NativeSelect name="valueKind" required disabled={pending}>
					{valueKinds.map((kind) => (
						<NativeSelectOption key={kind} value={kind}>
							{kind}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>
			<Button type="submit" disabled={pending}>
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
