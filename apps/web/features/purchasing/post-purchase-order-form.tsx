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
	type PostPurchaseOrderActionState,
	postPurchaseOrderAction,
} from "@/app/actions/post-purchase-order";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: PostPurchaseOrderActionState = null;

type PostPurchaseOrderFormProps = {
	canManage: boolean;
};

/**
 * Post draft purchase order — freezes party/item/payment/warehouse snapshots.
 */
export function PostPurchaseOrderForm({
	canManage,
}: PostPurchaseOrderFormProps) {
	const [state, formAction, pending] = useActionState(
		postPurchaseOrderAction,
		initialState,
	);

	if (!canManage) {
		return (
			<Alert role="status">
				<AlertTitle>Post unavailable</AlertTitle>
				<AlertDescription>
					You can view purchase orders but cannot post them in this
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
					<AlertTitle>Order posted</AlertTitle>
					<AlertDescription>
						{state.data.order.code} · party {state.data.order.partyCode} ·{" "}
						{state.data.order.lines.length} line(s) frozen.
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField
				label="Order id"
				required
				fieldId="purchase-post-order"
				error={orderError}
			>
				<Input
					id="purchase-post-order"
					name="orderId"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Expected version"
				required
				fieldId="purchase-post-version"
				error={versionError}
			>
				<Input
					id="purchase-post-version"
					name="expectedVersion"
					type="number"
					min="1"
					required
					disabled={pending}
				/>
			</FormField>
			<Button type="submit" disabled={pending}>
				{pending ? <Spinner /> : null}
				Post order
			</Button>
		</form>
	);
}
