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
import { useActionState, useMemo, useState } from "react";

import {
	type CreateStockMovementActionState,
	createStockMovementAction,
} from "@/app/actions/create-stock-movement";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: CreateStockMovementActionState = null;

type CreateStockMovementFormProps = {
	canCreate: boolean;
	canAdjust: boolean;
};

/**
 * Draft stock movement create — UI path for receipt, transfer, and adjustment.
 */
export function CreateStockMovementForm({
	canCreate,
	canAdjust,
}: CreateStockMovementFormProps) {
	const [state, formAction, pending] = useActionState(
		createStockMovementAction,
		initialState,
	);
	const [movementType, setMovementType] = useState<
		"receipt" | "transfer" | "adjustment"
	>("receipt");
	const [receiptSource, setReceiptSource] = useState<
		"opening_balance" | "receiving"
	>("opening_balance");

	const source = useMemo(() => {
		switch (movementType) {
			case "transfer":
				return "transfer";
			case "adjustment":
				return "manual_adjustment";
			case "receipt":
			default:
				return receiptSource;
		}
	}, [movementType, receiptSource]);

	if (!canCreate) {
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
	const sourceError = actionFieldMessage(state, "source");
	const warehouseError = actionFieldMessage(state, "warehouseId");
	const fromWarehouseError = actionFieldMessage(state, "fromWarehouseId");
	const toWarehouseError = actionFieldMessage(state, "toWarehouseId");
	const reasonError = actionFieldMessage(state, "adjustmentReasonCode");
	const showFormError =
		!pending &&
		state?.ok === false &&
		codeError === undefined &&
		typeError === undefined &&
		sourceError === undefined &&
		warehouseError === undefined &&
		fromWarehouseError === undefined &&
		toWarehouseError === undefined &&
		reasonError === undefined;

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
						{state.data.movement.source} · draft.
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
				<select
					id="stock-movement-type"
					name="movementType"
					className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
					value={movementType}
					onChange={(event) =>
						setMovementType(
							event.target.value as "receipt" | "transfer" | "adjustment",
						)
					}
					disabled={pending}
				>
					<option value="receipt">receipt</option>
					<option value="transfer">transfer</option>
					{canAdjust ? <option value="adjustment">adjustment</option> : null}
				</select>
			</FormField>
			<FormField
				label="Source"
				required
				fieldId="stock-movement-source"
				error={sourceError}
			>
				<select
					id="stock-movement-source"
					name="source"
					className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
					value={source}
					onChange={(event) =>
						setReceiptSource(
							event.target.value as "opening_balance" | "receiving",
						)
					}
					disabled={pending}
				>
					{movementType === "receipt" ? (
						<>
							<option value="opening_balance">opening_balance</option>
							<option value="receiving">receiving</option>
						</>
					) : (
						<option value={source}>{source}</option>
					)}
				</select>
			</FormField>
			{movementType === "transfer" ? (
				<>
					<FormField
						label="From warehouse id"
						required
						fieldId="stock-movement-from"
						error={fromWarehouseError}
					>
						<Input
							id="stock-movement-from"
							name="fromWarehouseId"
							required
							autoComplete="off"
							disabled={pending}
						/>
					</FormField>
					<FormField
						label="To warehouse id"
						required
						fieldId="stock-movement-to"
						error={toWarehouseError}
					>
						<Input
							id="stock-movement-to"
							name="toWarehouseId"
							required
							autoComplete="off"
							disabled={pending}
						/>
					</FormField>
				</>
			) : (
				<FormField
					label="Warehouse id"
					required
					fieldId="stock-movement-warehouse"
					error={warehouseError}
				>
					<Input
						id="stock-movement-warehouse"
						name="warehouseId"
						required
						autoComplete="off"
						disabled={pending}
					/>
				</FormField>
			)}
			{movementType === "adjustment" ? (
				<>
					<FormField
						label="Adjustment reason code"
						required
						fieldId="stock-adjustment-reason"
						error={reasonError}
					>
						<Input
							id="stock-adjustment-reason"
							name="adjustmentReasonCode"
							required
							autoComplete="off"
							disabled={pending}
						/>
					</FormField>
					<FormField
						label="Adjustment note"
						fieldId="stock-adjustment-note"
					>
						<Input
							id="stock-adjustment-note"
							name="adjustmentNote"
							autoComplete="off"
							disabled={pending}
						/>
					</FormField>
				</>
			) : null}
			{!canAdjust ? (
				<p className="text-sm text-muted-foreground">
					Adjustment create remains hidden until
					{" "}
					<code>inventory.adjustment.post</code> is granted.
				</p>
			) : null}
			<Button type="submit" disabled={pending}>
				{pending ? <Spinner /> : null}
				Create draft movement
			</Button>
		</form>
	);
}
