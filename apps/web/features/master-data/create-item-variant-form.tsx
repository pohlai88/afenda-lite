// biome-ignore-all lint/performance/noJsxPropsBind: The enabled React Compiler stabilizes JSX callback props.
"use client";

import type { ItemTemplateAttributeDataType } from "@afenda/master-data";
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

export interface VariantTemplateOption {
	attributes: Array<{
		id: string;
		code: string;
		name: string;
		dataType: ItemTemplateAttributeDataType;
		options: Array<{ id: string; label: string }>;
	}>;
	id: string;
	label: string;
}

interface CreateItemVariantFormProps {
	baseUomId: string;
	canManage: boolean;
	itemGroups: Array<{ id: string; label: string }>;
	itemTypes: readonly string[];
	templates: VariantTemplateOption[];
}

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
	// biome-ignore lint/suspicious/noUnnecessaryConditions: The templates array can be empty at runtime despite unchecked index typing.
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
			<input name="baseUomId" type="hidden" value={baseUomId} />
			{attributes.map((attribute) => (
				<input
					key={attribute.id}
					name="attributeIds"
					type="hidden"
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
			<FormField fieldId="variant-template" label="Template" required>
				<NativeSelect
					disabled={pending}
					name="templateId"
					onChange={(event) => setTemplateId(event.target.value)}
					required
					value={templateId}
				>
					{templates.map((template) => (
						<NativeSelectOption key={template.id} value={template.id}>
							{template.label}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>
			<FormField error={codeError} fieldId="variant-code" label="Code" required>
				<Input autoComplete="off" disabled={pending} name="code" required />
			</FormField>
			<FormField error={nameError} fieldId="variant-name" label="Name" required>
				<Input autoComplete="off" disabled={pending} name="name" required />
			</FormField>
			<FormField fieldId="variant-item-type" label="Item type" required>
				<NativeSelect
					defaultValue="stock"
					disabled={pending}
					name="itemType"
					required
				>
					{itemTypes.map((type) => (
						<NativeSelectOption key={type} value={type}>
							{type}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>
			<FormField fieldId="variant-item-group" label="Item group" required>
				<NativeSelect disabled={pending} name="itemGroupId" required>
					{itemGroups.map((group) => (
						<NativeSelectOption key={group.id} value={group.id}>
							{group.label}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>
			{attributes.map((attribute) =>
				attribute.dataType === "single_option" ||
				attribute.dataType === "multiple_option" ? (
					<FormField
						fieldId={`variant-option-${attribute.id}`}
						key={attribute.id}
						label={attribute.name}
						required
					>
						<NativeSelect
							disabled={pending || attribute.options.length === 0}
							name={`optionId_${attribute.id}`}
							required
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
						fieldId={`variant-text-${attribute.id}`}
						key={attribute.id}
						label={attribute.name}
						required
					>
						<Input
							autoComplete="off"
							disabled={pending}
							name={`textValue_${attribute.id}`}
							required
						/>
					</FormField>
				),
			)}
			{attributes.length === 0 ? (
				<Alert role="alert" variant="destructive">
					<AlertTitle>No attributes</AlertTitle>
					<AlertDescription>
						Selected template has no attributes. Add attributes while the
						template is draft, then activate.
					</AlertDescription>
				</Alert>
			) : null}
			<Button disabled={pending || attributes.length === 0} type="submit">
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
