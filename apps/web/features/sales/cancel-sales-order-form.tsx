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
	type CancelSalesOrderActionState,
	cancelSalesOrderAction,
} from "@/app/actions/cancel-sales-order";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: CancelSalesOrderActionState = null;

interface CancelSalesOrderFormProps {
	canCancel: boolean;
}

/**
 * Cancel draft or posted sales order — optimistic version check.
 * CAPABLE when `sales.order.cancel` is granted.
 */
export function CancelSalesOrderForm({ canCancel }: CancelSalesOrderFormProps) {
	const [state, formAction, pending] = useActionState(
		cancelSalesOrderAction,
		initialState,
	);

	if (!canCancel) {
		return (
			<Alert role="status">
				<AlertTitle>Cancel unavailable</AlertTitle>
				<AlertDescription>
					You can view sales orders but cannot cancel them in this organization.
				</AlertDescription>
			</Alert>
		);
	}

	const orderError = actionFieldMessage(state, "orderId");
	const versionError = actionFieldMessage(state, "expectedVersion");
	const showFormError =
		!pending &&
		state?.ok === false &&
		orderError === undefined &&
		versionError === undefined;

	return (
		<form
			action={formAction}
			aria-busy={pending}
			className="flex max-w-md flex-col gap-(--field-gap)"
		>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Order cancelled</AlertTitle>
					<AlertDescription>
						{state.data.order.code} · {state.data.order.status} · v
						{state.data.order.version}.
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField
				error={orderError}
				fieldId="sales-cancel-order"
				label="Order id"
				required
			>
				<Input
					disabled={pending}
					id="sales-cancel-order"
					name="orderId"
					placeholder="UUID"
					required
				/>
			</FormField>
			<FormField
				error={versionError}
				fieldId="sales-cancel-version"
				label="Expected version"
				required
			>
				<Input
					disabled={pending}
					id="sales-cancel-version"
					min={1}
					name="expectedVersion"
					required
					type="number"
				/>
			</FormField>
			<Button disabled={pending} type="submit">
				{pending ? (
					<>
						<Spinner className="size-4" />
						Cancelling…
					</>
				) : (
					"Cancel order"
				)}
			</Button>
		</form>
	);
}
