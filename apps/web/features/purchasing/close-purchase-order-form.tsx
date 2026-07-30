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
	type ClosePurchaseOrderActionState,
	closePurchaseOrderAction,
} from "@/app/actions/close-purchase-order";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: ClosePurchaseOrderActionState = null;

interface ClosePurchaseOrderFormProps {
	canClose: boolean;
}

/**
 * Close posted purchase order — CAPABLE when `purchasing.order.close` is granted.
 */
export function ClosePurchaseOrderForm({
	canClose,
}: ClosePurchaseOrderFormProps) {
	const [state, formAction, pending] = useActionState(
		closePurchaseOrderAction,
		initialState,
	);

	if (!canClose) {
		return (
			<Alert role="status">
				<AlertTitle>Close unavailable</AlertTitle>
				<AlertDescription>
					You can view purchase orders but cannot close them in this
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
					<AlertTitle>Order closed</AlertTitle>
					<AlertDescription>
						{state.data.order.code} · {state.data.order.status} · v
						{state.data.order.version}. Remaining commitment terminated.
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField
				error={orderError}
				fieldId="purchase-close-order"
				label="Order id"
				required
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="purchase-close-order"
					name="orderId"
					required
				/>
			</FormField>
			<FormField
				error={versionError}
				fieldId="purchase-close-version"
				label="Expected version"
				required
			>
				<Input
					disabled={pending}
					id="purchase-close-version"
					min="1"
					name="expectedVersion"
					required
					type="number"
				/>
			</FormField>
			<Button disabled={pending} type="submit">
				{pending ? <Spinner /> : null}
				Close posted order
			</Button>
		</form>
	);
}
