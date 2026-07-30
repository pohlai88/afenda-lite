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

interface CancelPurchaseOrderFormProps {
	canCancel: boolean;
}

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
				error={orderError}
				fieldId="purchase-cancel-order"
				label="Order id"
				required
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="purchase-cancel-order"
					name="orderId"
					required
				/>
			</FormField>
			<FormField
				error={versionError}
				fieldId="purchase-cancel-version"
				label="Expected version"
				required
			>
				<Input
					disabled={pending}
					id="purchase-cancel-version"
					min="1"
					name="expectedVersion"
					required
					type="number"
				/>
			</FormField>
			<Button disabled={pending} type="submit">
				{pending ? <Spinner /> : null}
				Cancel draft order
			</Button>
		</form>
	);
}
