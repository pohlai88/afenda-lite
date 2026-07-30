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
	type AddItemTemplateAttributeOptionActionState,
	addItemTemplateAttributeOptionAction,
} from "@/app/actions/add-item-template-attribute-option";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: AddItemTemplateAttributeOptionActionState = null;

interface DraftOptionAttribute {
	id: string;
	label: string;
}

interface AddItemTemplateAttributeOptionFormProps {
	canManage: boolean;
	draftOptionAttributes: DraftOptionAttribute[];
}

/** Add closed option while template (and attribute) remain draft. */
export function AddItemTemplateAttributeOptionForm({
	canManage,
	draftOptionAttributes,
}: AddItemTemplateAttributeOptionFormProps) {
	const [state, formAction, pending] = useActionState(
		addItemTemplateAttributeOptionAction,
		initialState,
	);

	if (!canManage) {
		return null;
	}

	if (draftOptionAttributes.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				No draft option-attributes — add an attribute with value kind
				&quot;option&quot; first.
			</p>
		);
	}

	const codeError = actionFieldMessage(state, "code");
	const labelError = actionFieldMessage(state, "label");
	const showFormError =
		!pending &&
		state?.ok === false &&
		codeError === undefined &&
		labelError === undefined;

	return (
		<form
			action={formAction}
			aria-busy={pending}
			className="flex max-w-md flex-col gap-(--field-gap)"
		>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Option added</AlertTitle>
					<AlertDescription>
						{state.data.option.code} · {state.data.option.label}
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField fieldId="opt-attribute" label="Option attribute" required>
				<NativeSelect disabled={pending} name="attributeId" required>
					{draftOptionAttributes.map((attribute) => (
						<NativeSelectOption key={attribute.id} value={attribute.id}>
							{attribute.label}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>
			<FormField error={codeError} fieldId="opt-code" label="Code" required>
				<Input autoComplete="off" disabled={pending} name="code" required />
			</FormField>
			<FormField error={labelError} fieldId="opt-label" label="Label" required>
				<Input autoComplete="off" disabled={pending} name="label" required />
			</FormField>
			<Button disabled={pending} type="submit">
				{pending ? (
					<>
						<Spinner className="size-4" /> Adding…
					</>
				) : (
					"Add option"
				)}
			</Button>
		</form>
	);
}
