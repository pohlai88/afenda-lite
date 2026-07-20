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
	type CreateStockMovementActionState,
	createStockMovementAction,
} from "@/app/actions/create-stock-movement";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: CreateStockMovementActionState = null;

type CreateStockMovementFormProps = {
	canManage: boolean;
};

/**
 * Draft stock movement create — CAPABLE when `inventory.manage` is granted.
 */
export function CreateStockMovementForm({
	canManage,
}: CreateStockMovementFormProps) {
	const [state, formAction, pending] = useActionState(
		createStockMovementAction,
		initialState,
	);

	if (!canManage) {
		return (
			<Alert role="status">
				<AlertTitle>Create unavailable</AlertTitle>
				<AlertDescription>
					You can view stock movements but cannot create them in this
					organization.
				</AlertDescription>
			</Alert>
		);
	}

	const codeError = actionFieldMessage(state, "code");
	const typeError = actionFieldMessage(state, "movementType");
	const showFormError =
		!pending &&
		state?.ok === false &&
		codeError === undefined &&
		typeError === undefined;

	return (
		<form
			action={formAction}
			aria-busy={pending}
			className="flex max-w-md flex-col gap-(--field-gap)"
		>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Movement created</AlertTitle>
					<AlertDescription>
						{state.data.movement.code} · {state.data.movement.movementType} ·
						draft.
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField
				label="Code"
				required
				fieldId="stock-movement-code"
				error={codeError}
			>
				<Input
					id="stock-movement-code"
					name="code"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Movement type"
				required
				fieldId="stock-movement-type"
				error={typeError}
			>
				<Input
					id="stock-movement-type"
					name="movementType"
					required
					placeholder="receipt | issue | transfer | adjustment | reservation | reservation_release"
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField label="Warehouse id" fieldId="stock-movement-warehouse">
				<Input
					id="stock-movement-warehouse"
					name="warehouseId"
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="From warehouse id (transfer)"
				fieldId="stock-movement-from"
			>
				<Input
					id="stock-movement-from"
					name="fromWarehouseId"
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField label="To warehouse id (transfer)" fieldId="stock-movement-to">
				<Input
					id="stock-movement-to"
					name="toWarehouseId"
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<Button type="submit" disabled={pending}>
				{pending ? <Spinner /> : null}
				Create draft movement
			</Button>
		</form>
	);
}
