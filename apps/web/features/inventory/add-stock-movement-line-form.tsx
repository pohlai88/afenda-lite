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
	type AddStockMovementLineActionState,
	addStockMovementLineAction,
} from "@/app/actions/add-stock-movement-line";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: AddStockMovementLineActionState = null;

type AddStockMovementLineFormProps = {
	canManage: boolean;
};

/**
 * Add line to draft stock movement — CAPABLE when `inventory.manage` is granted.
 */
export function AddStockMovementLineForm({
	canManage,
}: AddStockMovementLineFormProps) {
	const [state, formAction, pending] = useActionState(
		addStockMovementLineAction,
		initialState,
	);

	if (!canManage) {
		return (
			<Alert role="status">
				<AlertTitle>Add line unavailable</AlertTitle>
				<AlertDescription>
					You can view stock movements but cannot add lines in this
					organization.
				</AlertDescription>
			</Alert>
		);
	}

	const movementError = actionFieldMessage(state, "movementId");
	const itemError = actionFieldMessage(state, "itemId");
	const quantityError = actionFieldMessage(state, "quantity");
	const showFormError =
		!pending &&
		state?.ok === false &&
		movementError === undefined &&
		itemError === undefined &&
		quantityError === undefined;

	return (
		<form
			action={formAction}
			aria-busy={pending}
			className="flex max-w-md flex-col gap-(--field-gap)"
		>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Line added</AlertTitle>
					<AlertDescription>
						Line {state.data.line.lineNo} · {state.data.line.itemCode} · qty{" "}
						{state.data.line.quantity}.
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField
				label="Movement id"
				required
				fieldId="stock-line-movement"
				error={movementError}
			>
				<Input
					id="stock-line-movement"
					name="movementId"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Item id"
				required
				fieldId="stock-line-item"
				error={itemError}
			>
				<Input
					id="stock-line-item"
					name="itemId"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Quantity"
				required
				fieldId="stock-line-quantity"
				error={quantityError}
			>
				<Input
					id="stock-line-quantity"
					name="quantity"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<Button type="submit" disabled={pending}>
				{pending ? <Spinner /> : null}
				Add line
			</Button>
		</form>
	);
}
