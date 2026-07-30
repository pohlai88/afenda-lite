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
import { useActionState, useMemo } from "react";

import {
	type ReserveStockActionState,
	reserveStockAction,
} from "@/app/actions/reserve-stock";
import type { InventoryMasterOption } from "@/features/inventory/inventory-master-option";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: ReserveStockActionState = null;

interface ReserveStockFormProps {
	canReserve: boolean;
	items: InventoryMasterOption[];
	warehouses: InventoryMasterOption[];
}

/**
 * One-shot reserve stock — returns a `StockReservation`.
 */
export function ReserveStockForm({
	canReserve,
	warehouses,
	items,
}: ReserveStockFormProps) {
	const [state, formAction, pending] = useActionState(
		reserveStockAction,
		initialState,
	);
	// biome-ignore lint/correctness/useExhaustiveDependencies: Rotate the key after each completed action state.
	const idempotencyKey = useMemo(
		() => `reserve:${crypto.randomUUID()}`,
		[state],
	);

	if (!canReserve) {
		return (
			<Alert role="status">
				<AlertTitle>Reserve unavailable</AlertTitle>
				<AlertDescription>
					You can view inventory but cannot reserve stock in this organization.
				</AlertDescription>
			</Alert>
		);
	}

	const codeError = actionFieldMessage(state, "code");
	const warehouseError = actionFieldMessage(state, "warehouseId");
	const itemError = actionFieldMessage(state, "itemId");
	const quantityError = actionFieldMessage(state, "quantity");
	const showFormError =
		!pending &&
		state?.ok === false &&
		codeError === undefined &&
		warehouseError === undefined &&
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
					<AlertTitle>Stock reserved</AlertTitle>
					<AlertDescription>
						{state.data.reservation.code} · {state.data.reservation.status} ·
						qty {state.data.reservation.quantity}.
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<input
				name="idempotencyKey"
				readOnly
				type="hidden"
				value={idempotencyKey}
			/>
			<FormField
				error={codeError}
				fieldId="stock-reserve-code"
				label="Reservation code"
				required
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="stock-reserve-code"
					name="code"
					required
				/>
			</FormField>
			<FormField
				error={warehouseError}
				fieldId="stock-reserve-warehouse"
				label="Warehouse"
				required
			>
				<NativeSelect
					defaultValue=""
					disabled={pending || warehouses.length === 0}
					id="stock-reserve-warehouse"
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
			<FormField
				error={itemError}
				fieldId="stock-reserve-item"
				label="Item"
				required
			>
				<NativeSelect
					defaultValue=""
					disabled={pending || items.length === 0}
					id="stock-reserve-item"
					name="itemId"
					required
				>
					<NativeSelectOption disabled value="">
						Select item
					</NativeSelectOption>
					{items.map((item) => (
						<NativeSelectOption key={item.id} value={item.id}>
							{item.code} · {item.status}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>
			<FormField
				error={quantityError}
				fieldId="stock-reserve-quantity"
				label="Quantity"
				required
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="stock-reserve-quantity"
					name="quantity"
					required
				/>
			</FormField>
			<Button
				disabled={pending || warehouses.length === 0 || items.length === 0}
				type="submit"
			>
				{pending ? <Spinner /> : null}
				Reserve stock
			</Button>
		</form>
	);
}
