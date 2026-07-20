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
import { useActionState, useState } from "react";

import {
	type CreateItemVariantActionState,
	createItemVariantAction,
} from "@/app/actions/create-item-variant";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: CreateItemVariantActionState = null;

export type VariantTemplateOption = {
	id: string;
	label: string;
	attributes: Array<{
		id: string;
		code: string;
		name: string;
		valueKind: "text" | "option";
		options: Array<{ id: string; label: string }>;
	}>;
};

type CreateItemVariantFormProps = {
	canManage: boolean;
	templates: VariantTemplateOption[];
	itemGroups: Array<{ id: string; label: string }>;
	baseUomId: string;
	itemTypes: readonly string[];
};

/**
 * Concrete variant item form — own item code; typed attribute values (no JSON bag).
 * Renders one field per template attribute so combinations stay complete.
 */
export function CreateItemVariantForm({
	canManage,
	templates,
	itemGroups,
	baseUomId,
	itemTypes,
}: CreateItemVariantFormProps) {
	const [state, formAction, pending] = useActionState(
		createItemVariantAction,
		initialState,
	);
	const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
	const selected = templates.find((row) => row.id === templateId);
	const attributes = selected?.attributes ?? [];

	if (!canManage) {
		return (
			<Alert role="status">
				<AlertTitle>Create unavailable</AlertTitle>
				<AlertDescription>
					You can view master data but cannot create item variants.
				</AlertDescription>
			</Alert>
		);
	}

	if (templates.length === 0 || itemGroups.length === 0) {
		return (
			<Alert role="status">
				<AlertTitle>Prerequisites missing</AlertTitle>
				<AlertDescription>
					Create an active item template (with attributes/options) and an item
					group before adding variants.
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
			<input type="hidden" name="baseUomId" value={baseUomId} />
			{attributes.map((attribute) => (
				<input
					key={attribute.id}
					type="hidden"
					name="attributeIds"
					value={attribute.id}
				/>
			))}
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Variant created</AlertTitle>
					<AlertDescription>
						{state.data.variant.item.code} · {state.data.variant.item.name}{" "}
						(draft item).
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField label="Template" required fieldId="variant-template">
				<NativeSelect
					name="templateId"
					required
					disabled={pending}
					value={templateId}
					onChange={(event) => setTemplateId(event.target.value)}
				>
					{templates.map((template) => (
						<NativeSelectOption key={template.id} value={template.id}>
							{template.label}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>
			<FormField label="Code" required fieldId="variant-code" error={codeError}>
				<Input name="code" required autoComplete="off" disabled={pending} />
			</FormField>
			<FormField label="Name" required fieldId="variant-name" error={nameError}>
				<Input name="name" required autoComplete="off" disabled={pending} />
			</FormField>
			<FormField label="Item type" required fieldId="variant-item-type">
				<NativeSelect
					name="itemType"
					required
					disabled={pending}
					defaultValue="stock"
				>
					{itemTypes.map((type) => (
						<NativeSelectOption key={type} value={type}>
							{type}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>
			<FormField label="Item group" required fieldId="variant-item-group">
				<NativeSelect name="itemGroupId" required disabled={pending}>
					{itemGroups.map((group) => (
						<NativeSelectOption key={group.id} value={group.id}>
							{group.label}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>
			{attributes.map((attribute) =>
				attribute.valueKind === "option" ? (
					<FormField
						key={attribute.id}
						label={attribute.name}
						required
						fieldId={`variant-option-${attribute.id}`}
					>
						<NativeSelect
							name={`optionId_${attribute.id}`}
							required
							disabled={pending || attribute.options.length === 0}
						>
							{attribute.options.map((option) => (
								<NativeSelectOption key={option.id} value={option.id}>
									{option.label}
								</NativeSelectOption>
							))}
						</NativeSelect>
					</FormField>
				) : (
					<FormField
						key={attribute.id}
						label={attribute.name}
						required
						fieldId={`variant-text-${attribute.id}`}
					>
						<Input
							name={`valueText_${attribute.id}`}
							required
							autoComplete="off"
							disabled={pending}
						/>
					</FormField>
				),
			)}
			{attributes.length === 0 ? (
				<Alert variant="destructive" role="alert">
					<AlertTitle>No attributes</AlertTitle>
					<AlertDescription>
						Selected template has no attributes. Add attributes while the
						template is draft, then activate.
					</AlertDescription>
				</Alert>
			) : null}
			<Button type="submit" disabled={pending || attributes.length === 0}>
				{pending ? (
					<>
						<Spinner className="size-4" /> Creating…
					</>
				) : (
					"Create variant"
				)}
			</Button>
		</form>
	);
}
