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
	Spinner,
} from "@afenda/ui-system";
import { useActionState } from "react";

import {
	type CreateItemActionState,
	createItemAction,
} from "@/app/actions/create-item";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: CreateItemActionState = null;

type CreateItemFormProps = {
	canManage: boolean;
	itemTypes: readonly string[];
	baseUomId: string;
	itemGroups: Array<{ id: string; label: string }>;
};

export function CreateItemForm({
	canManage,
	itemTypes,
	baseUomId,
	itemGroups,
}: CreateItemFormProps) {
	const [state, formAction, pending] = useActionState(
		createItemAction,
		initialState,
	);
	if (!canManage) {
		return (
			<Alert role="status">
				<AlertTitle>Create unavailable</AlertTitle>
				<AlertDescription>
					You can view master data but cannot create items.
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
					<AlertTitle>Item created</AlertTitle>
					<AlertDescription>
						{state.data.item.code} · {state.data.item.name} (draft).
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<input type="hidden" name="baseUomId" value={baseUomId} />
			<FormField label="Code" required fieldId="item-code" error={codeError}>
				<Input name="code" required autoComplete="off" disabled={pending} />
			</FormField>
			<FormField label="Name" required fieldId="item-name" error={nameError}>
				<Input name="name" required autoComplete="off" disabled={pending} />
			</FormField>
			<FormField label="Type" required fieldId="item-type">
				<NativeSelect name="itemType" required disabled={pending}>
					{itemTypes.map((type) => (
						<option key={type} value={type}>
							{type}
						</option>
					))}
				</NativeSelect>
			</FormField>
			<FormField label="Item group" required fieldId="item-group">
				<NativeSelect name="itemGroupId" required disabled={pending}>
					<option value="">Select group</option>
					{itemGroups.map((group) => (
						<option key={group.id} value={group.id}>
							{group.label}
						</option>
					))}
				</NativeSelect>
			</FormField>
			<Button type="submit" disabled={pending || itemGroups.length === 0}>
				{pending ? <Spinner /> : null}
				Create item
			</Button>
		</form>
	);
}
