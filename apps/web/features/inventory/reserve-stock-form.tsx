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

type ReserveStockFormProps = {
	canReserve: boolean;
	warehouses: InventoryMasterOption[];
	items: InventoryMasterOption[];
};

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
				type="hidden"
				name="idempotencyKey"
				value={idempotencyKey}
				readOnly
			/>
			<FormField
				label="Reservation code"
				required
				fieldId="stock-reserve-code"
				error={codeError}
			>
				<Input
					id="stock-reserve-code"
					name="code"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Warehouse"
				required
				fieldId="stock-reserve-warehouse"
				error={warehouseError}
			>
				<NativeSelect
					id="stock-reserve-warehouse"
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
			<FormField
				label="Item"
				required
				fieldId="stock-reserve-item"
				error={itemError}
			>
				<NativeSelect
					id="stock-reserve-item"
					name="itemId"
					required
					disabled={pending || items.length === 0}
					defaultValue=""
				>
					<NativeSelectOption value="" disabled>
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
				label="Quantity"
				required
				fieldId="stock-reserve-quantity"
				error={quantityError}
			>
				<Input
					id="stock-reserve-quantity"
					name="quantity"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<Button
				type="submit"
				disabled={pending || warehouses.length === 0 || items.length === 0}
			>
				{pending ? <Spinner /> : null}
				Reserve stock
			</Button>
		</form>
	);
}
