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

interface CreateItemFormProps {
	baseUomId: string;
	canManage: boolean;
	itemGroups: Array<{ id: string; label: string }>;
	itemTypes: readonly string[];
}

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
			<input name="baseUomId" type="hidden" value={baseUomId} />
			<FormField error={codeError} fieldId="item-code" label="Code" required>
				<Input autoComplete="off" disabled={pending} name="code" required />
			</FormField>
			<FormField error={nameError} fieldId="item-name" label="Name" required>
				<Input autoComplete="off" disabled={pending} name="name" required />
			</FormField>
			<FormField fieldId="item-type" label="Type" required>
				<NativeSelect disabled={pending} name="itemType" required>
					{itemTypes.map((type) => (
						<option key={type} value={type}>
							{type}
						</option>
					))}
				</NativeSelect>
			</FormField>
			<FormField fieldId="item-group" label="Item group" required>
				<NativeSelect disabled={pending} name="itemGroupId" required>
					<option value="">Select group</option>
					{itemGroups.map((group) => (
						<option key={group.id} value={group.id}>
							{group.label}
						</option>
					))}
				</NativeSelect>
			</FormField>
			<Button disabled={pending || itemGroups.length === 0} type="submit">
				{pending ? <Spinner /> : null}
				Create item
			</Button>
		</form>
	);
}
