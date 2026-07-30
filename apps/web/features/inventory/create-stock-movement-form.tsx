// biome-ignore-all lint/performance/noJsxPropsBind: The enabled React Compiler stabilizes JSX callback props.
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

interface CreateStockMovementFormProps {
	canAdjust: boolean;
	canCreate: boolean;
	warehouses: InventoryMasterOption[];
}

/**
 * Draft stock movement create — UI path for opening-balance receipt, transfer, and adjustment.
 * Peer-sourced receipt/issue (receiving/fulfillment) must use peer packages with event linkage.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Movement-type fields share one atomic form and action contract.
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

	if (!(canCreate || canAdjust)) {
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
				error={codeError}
				fieldId="stock-movement-code"
				label="Code"
				required
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="stock-movement-code"
					name="code"
					required
				/>
			</FormField>
			<FormField
				error={typeError}
				fieldId="stock-movement-type"
				label="Movement type"
				required
			>
				<NativeSelect
					disabled={pending}
					id="stock-movement-type"
					name="movementType"
					onChange={(event) => {
						const next = parseMovementTypeOption(event.target.value, {
							canCreate,
							canAdjust,
						});
						if (next !== null) {
							setMovementType(next);
						}
					}}
					value={movementType}
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
			<input name="source" type="hidden" value={source} />
			{movementType === "transfer" ? (
				<>
					<FormField
						error={fromWarehouseError}
						fieldId="stock-movement-from"
						label="From warehouse"
						required
					>
						<NativeSelect
							defaultValue=""
							disabled={pending || warehouses.length === 0}
							id="stock-movement-from"
							name="fromWarehouseId"
							required
						>
							<NativeSelectOption disabled value="">
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
						error={toWarehouseError}
						fieldId="stock-movement-to"
						label="To warehouse"
						required
					>
						<NativeSelect
							defaultValue=""
							disabled={pending || warehouses.length === 0}
							id="stock-movement-to"
							name="toWarehouseId"
							required
						>
							<NativeSelectOption disabled value="">
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
					error={warehouseError}
					fieldId="stock-movement-warehouse"
					label="Warehouse"
					required
				>
					<NativeSelect
						defaultValue=""
						disabled={pending || warehouses.length === 0}
						id="stock-movement-warehouse"
						name="warehouseId"
						required
					>
						<NativeSelectOption disabled value="">
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
						error={reasonError}
						fieldId="stock-adjustment-reason"
						label="Adjustment reason code"
						required
					>
						<Input
							autoComplete="off"
							disabled={pending}
							id="stock-adjustment-reason"
							name="adjustmentReasonCode"
							required
						/>
					</FormField>
					<FormField fieldId="stock-adjustment-note" label="Adjustment note">
						<Input
							autoComplete="off"
							disabled={pending}
							id="stock-adjustment-note"
							name="adjustmentNote"
						/>
					</FormField>
				</>
			) : null}
			{canCreate && !canAdjust ? (
				<p className="text-muted-foreground text-sm">
					Adjustment create remains hidden until{" "}
					<Code>inventory.adjustment.post</Code> is granted.
				</p>
			) : null}
			<Button disabled={pending || warehouses.length === 0} type="submit">
				{pending ? <Spinner /> : null}
				Create draft movement
			</Button>
		</form>
	);
}
// biome-ignore-all lint/style/noNestedTernary: Exhaustive status and tri-state view mappings remain explicit at their use sites.
