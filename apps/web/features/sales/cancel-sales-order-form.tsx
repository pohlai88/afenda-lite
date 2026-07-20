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

type CancelSalesOrderFormProps = {
	canCancel: boolean;
};

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
				label="Order id"
				required
				fieldId="sales-cancel-order"
				error={orderError}
			>
				<Input
					id="sales-cancel-order"
					name="orderId"
					required
					disabled={pending}
					placeholder="UUID"
				/>
			</FormField>
			<FormField
				label="Expected version"
				required
				fieldId="sales-cancel-version"
				error={versionError}
			>
				<Input
					id="sales-cancel-version"
					name="expectedVersion"
					type="number"
					min={1}
					required
					disabled={pending}
				/>
			</FormField>
			<Button type="submit" disabled={pending}>
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
