"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	Code,
	FormError,
	FormField,
	Input,
	NativeSelect,
	NativeSelectOption,
	Spinner,
} from "@afenda/ui-system";
import { useActionState, useState } from "react";

import {
	type CreateStockMovementActionState,
	createStockMovementAction,
} from "@/app/actions/create-stock-movement";
import type { InventoryMasterOption } from "@/features/inventory/inventory-master-option";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: CreateStockMovementActionState = null;

type MovementTypeOption = "receipt" | "transfer" | "adjustment";

function parseMovementTypeOption(
	value: string,
	options: { canCreate: boolean; canAdjust: boolean },
): MovementTypeOption | null {
	if (value === "receipt" && options.canCreate) {
		return "receipt";
	}
	if (value === "transfer" && options.canCreate) {
		return "transfer";
	}
	if (value === "adjustment" && options.canAdjust) {
		return "adjustment";
	}
	return null;
}

type CreateStockMovementFormProps = {
	canCreate: boolean;
	canAdjust: boolean;
	warehouses: InventoryMasterOption[];
};

/**
 * Draft stock movement create — UI path for opening-balance receipt, transfer, and adjustment.
 * Peer-sourced receipt/issue (receiving/fulfillment) must use peer packages with event linkage.
 */
export function CreateStockMovementForm({
	canCreate,
	canAdjust,
	warehouses,
}: CreateStockMovementFormProps) {
	const [state, formAction, pending] = useActionState(
		createStockMovementAction,
		initialState,
	);
	const defaultType: MovementTypeOption = canCreate ? "receipt" : "adjustment";
	const [movementType, setMovementType] =
		useState<MovementTypeOption>(defaultType);

	if (!canCreate && !canAdjust) {
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

	const source =
		movementType === "transfer"
			? "transfer"
			: movementType === "adjustment"
				? "manual_adjustment"
				: "opening_balance";

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
						{state.data.movement.code} · {state.data.movement.movementType} ·{" "}
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
				<NativeSelect
					id="stock-movement-type"
					name="movementType"
					value={movementType}
					onChange={(event) => {
						const next = parseMovementTypeOption(event.target.value, {
							canCreate,
							canAdjust,
						});
						if (next !== null) {
							setMovementType(next);
						}
					}}
					disabled={pending}
				>
					{canCreate ? (
						<>
							<NativeSelectOption value="receipt">receipt</NativeSelectOption>
							<NativeSelectOption value="transfer">transfer</NativeSelectOption>
						</>
					) : null}
					{canAdjust ? (
						<NativeSelectOption value="adjustment">
							adjustment
						</NativeSelectOption>
					) : null}
				</NativeSelect>
			</FormField>
			<input type="hidden" name="source" value={source} />
			{movementType === "transfer" ? (
				<>
					<FormField
						label="From warehouse"
						required
						fieldId="stock-movement-from"
						error={fromWarehouseError}
					>
						<NativeSelect
							id="stock-movement-from"
							name="fromWarehouseId"
							required
							disabled={pending || warehouses.length === 0}
							defaultValue=""
						>
							<NativeSelectOption value="" disabled>
								Select warehouse
							</NativeSelectOption>
							{warehouses.map((warehouse) => (
								<NativeSelectOption key={warehouse.id} value={warehouse.id}>
									{warehouse.code} · {warehouse.status}
								</NativeSelectOption>
							))}
						</NativeSelect>
					</FormField>
					<FormField
						label="To warehouse"
						required
						fieldId="stock-movement-to"
						error={toWarehouseError}
					>
						<NativeSelect
							id="stock-movement-to"
							name="toWarehouseId"
							required
							disabled={pending || warehouses.length === 0}
							defaultValue=""
						>
							<NativeSelectOption value="" disabled>
								Select warehouse
							</NativeSelectOption>
							{warehouses.map((warehouse) => (
								<NativeSelectOption key={warehouse.id} value={warehouse.id}>
									{warehouse.code} · {warehouse.status}
								</NativeSelectOption>
							))}
						</NativeSelect>
					</FormField>
				</>
			) : (
				<FormField
					label="Warehouse"
					required
					fieldId="stock-movement-warehouse"
					error={warehouseError}
				>
					<NativeSelect
						id="stock-movement-warehouse"
						name="warehouseId"
						required
						disabled={pending || warehouses.length === 0}
						defaultValue=""
					>
						<NativeSelectOption value="" disabled>
							Select warehouse
						</NativeSelectOption>
						{warehouses.map((warehouse) => (
							<NativeSelectOption key={warehouse.id} value={warehouse.id}>
								{warehouse.code} · {warehouse.status}
							</NativeSelectOption>
						))}
					</NativeSelect>
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
					<FormField label="Adjustment note" fieldId="stock-adjustment-note">
						<Input
							id="stock-adjustment-note"
							name="adjustmentNote"
							autoComplete="off"
							disabled={pending}
						/>
					</FormField>
				</>
			) : null}
			{canCreate && !canAdjust ? (
				<p className="text-sm text-muted-foreground">
					Adjustment create remains hidden until{" "}
					<Code>inventory.adjustment.post</Code> is granted.
				</p>
			) : null}
			<Button type="submit" disabled={pending || warehouses.length === 0}>
				{pending ? <Spinner /> : null}
				Create draft movement
			</Button>
		</form>
	);
}
