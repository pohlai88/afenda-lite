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
	type CancelPurchaseOrderActionState,
	cancelPurchaseOrderAction,
} from "@/app/actions/cancel-purchase-order";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: CancelPurchaseOrderActionState = null;

type CancelPurchaseOrderFormProps = {
	canCancel: boolean;
};

/**
 * Cancel draft purchase order — CAPABLE when `purchasing.order.cancel` is granted.
 */
export function CancelPurchaseOrderForm({
	canCancel,
}: CancelPurchaseOrderFormProps) {
	const [state, formAction, pending] = useActionState(
		cancelPurchaseOrderAction,
		initialState,
	);

	if (!canCancel) {
		return (
			<Alert role="status">
				<AlertTitle>Cancel unavailable</AlertTitle>
				<AlertDescription>
					You can view purchase orders but cannot cancel them in this
					organization.
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
				fieldId="purchase-cancel-order"
				error={orderError}
			>
				<Input
					id="purchase-cancel-order"
					name="orderId"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Expected version"
				required
				fieldId="purchase-cancel-version"
				error={versionError}
			>
				<Input
					id="purchase-cancel-version"
					name="expectedVersion"
					type="number"
					min="1"
					required
					disabled={pending}
				/>
			</FormField>
			<Button type="submit" disabled={pending}>
				{pending ? <Spinner /> : null}
				Cancel draft order
			</Button>
		</form>
	);
}
