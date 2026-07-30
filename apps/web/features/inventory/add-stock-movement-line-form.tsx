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

interface AddStockMovementLineFormProps {
	canCreate: boolean;
	defaultExpectedVersion?: number | undefined;
	defaultMovementId?: string | undefined;
	items: InventoryMasterOption[];
}

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
	// biome-ignore lint/correctness/useExhaustiveDependencies: Rotate the key after each completed action state.
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
				name="idempotencyKey"
				readOnly
				type="hidden"
				value={idempotencyKey}
			/>
			<FormField
				error={movementError}
				fieldId="stock-line-movement"
				label="Movement id"
				required
			>
				<Input
					autoComplete="off"
					defaultValue={defaultMovementId ?? ""}
					disabled={pending}
					id="stock-line-movement"
					name="movementId"
					required
				/>
			</FormField>
			<FormField
				error={itemError}
				fieldId="stock-line-item"
				label="Item"
				required
			>
				<NativeSelect
					defaultValue=""
					disabled={pending || items.length === 0}
					id="stock-line-item"
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
				error={versionError}
				fieldId="stock-line-version"
				label="Expected version"
				required
			>
				<Input
					defaultValue={
						defaultExpectedVersion === undefined
							? undefined
							: String(defaultExpectedVersion)
					}
					disabled={pending}
					id="stock-line-version"
					min="1"
					name="expectedVersion"
					required
					type="number"
				/>
			</FormField>
			<FormField
				error={quantityError}
				fieldId="stock-line-quantity"
				label="Quantity"
				required
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="stock-line-quantity"
					name="quantity"
					required
				/>
			</FormField>
			<Button disabled={pending || items.length === 0} type="submit">
				{pending ? <Spinner /> : null}
				Add line
			</Button>
		</form>
	);
}
