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
import { useActionState, useMemo } from "react";

import {
	type ReserveStockActionState,
	reserveStockAction,
} from "@/app/actions/reserve-stock";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: ReserveStockActionState = null;

type ReserveStockFormProps = {
	canReserve: boolean;
};

/**
 * One-shot reserve stock — returns a `StockReservation`.
 */
export function ReserveStockForm({ canReserve }: ReserveStockFormProps) {
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
	const showFormError =
		!pending && state?.ok === false && codeError === undefined;

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
						{state.data.reservation.code} · {state.data.reservation.status} · qty{" "}
						{state.data.reservation.quantity}.
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<input type="hidden" name="idempotencyKey" value={idempotencyKey} readOnly />
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
				label="Warehouse id"
				required
				fieldId="stock-reserve-warehouse"
			>
				<Input
					id="stock-reserve-warehouse"
					name="warehouseId"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField label="Item id" required fieldId="stock-reserve-item">
				<Input
					id="stock-reserve-item"
					name="itemId"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField label="Quantity" required fieldId="stock-reserve-quantity">
				<Input
					id="stock-reserve-quantity"
					name="quantity"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<Button type="submit" disabled={pending}>
				{pending ? <Spinner /> : null}
				Reserve stock
			</Button>
		</form>
	);
}
