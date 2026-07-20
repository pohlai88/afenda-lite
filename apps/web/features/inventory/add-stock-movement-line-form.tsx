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
	type AddStockMovementLineActionState,
	addStockMovementLineAction,
} from "@/app/actions/add-stock-movement-line";
import type { InventoryMasterOption } from "@/features/inventory/inventory-master-option";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: AddStockMovementLineActionState = null;

type AddStockMovementLineFormProps = {
	canCreate: boolean;
	items: InventoryMasterOption[];
	defaultMovementId?: string;
	defaultExpectedVersion?: number;
};

/**
 * Add line to draft stock movement — gated by `inventory.movement.create`.
 */
export function AddStockMovementLineForm({
	canCreate,
	items,
	defaultMovementId,
	defaultExpectedVersion,
}: AddStockMovementLineFormProps) {
	const [state, formAction, pending] = useActionState(
		addStockMovementLineAction,
		initialState,
	);
	const idempotencyKey = useMemo(() => `line:${crypto.randomUUID()}`, [state]);

	if (!canCreate) {
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
	const versionError = actionFieldMessage(state, "expectedVersion");
	const showFormError =
		!pending &&
		state?.ok === false &&
		movementError === undefined &&
		itemError === undefined &&
		quantityError === undefined &&
		versionError === undefined;

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
			<input
				type="hidden"
				name="idempotencyKey"
				value={idempotencyKey}
				readOnly
			/>
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
					defaultValue={defaultMovementId ?? ""}
				/>
			</FormField>
			<FormField
				label="Item"
				required
				fieldId="stock-line-item"
				error={itemError}
			>
				<NativeSelect
					id="stock-line-item"
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
				label="Expected version"
				required
				fieldId="stock-line-version"
				error={versionError}
			>
				<Input
					id="stock-line-version"
					name="expectedVersion"
					type="number"
					min="1"
					required
					disabled={pending}
					defaultValue={
						defaultExpectedVersion !== undefined
							? String(defaultExpectedVersion)
							: undefined
					}
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
			<Button type="submit" disabled={pending || items.length === 0}>
				{pending ? <Spinner /> : null}
				Add line
			</Button>
		</form>
	);
}
