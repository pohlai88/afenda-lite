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
	type CreateWarehouseActionState,
	createWarehouseAction,
} from "@/app/actions/create-warehouse";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: CreateWarehouseActionState = null;

type CreateWarehouseFormProps = {
	canManage: boolean;
	locationTypes: readonly string[];
};

export function CreateWarehouseForm({
	canManage,
	locationTypes,
}: CreateWarehouseFormProps) {
	const [state, formAction, pending] = useActionState(
		createWarehouseAction,
		initialState,
	);
	if (!canManage) {
		return (
			<Alert role="status">
				<AlertTitle>Create unavailable</AlertTitle>
				<AlertDescription>
					You can view master data but cannot create warehouses.
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
					<AlertTitle>Warehouse created</AlertTitle>
					<AlertDescription>
						{state.data.warehouse.code} · {state.data.warehouse.name} (draft).
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField label="Code" required fieldId="warehouse-code" error={codeError}>
				<Input name="code" required autoComplete="off" disabled={pending} />
			</FormField>
			<FormField label="Name" required fieldId="warehouse-name" error={nameError}>
				<Input name="name" required autoComplete="off" disabled={pending} />
			</FormField>
			<FormField label="Location type" required fieldId="warehouse-location">
				<NativeSelect name="locationType" required disabled={pending}>
					{locationTypes.map((type) => (
						<option key={type} value={type}>
							{type}
						</option>
					))}
				</NativeSelect>
			</FormField>
			<Button type="submit" disabled={pending}>
				{pending ? <Spinner /> : null}
				Create warehouse
			</Button>
		</form>
	);
}
