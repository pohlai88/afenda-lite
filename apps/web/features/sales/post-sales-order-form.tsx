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
	type PostSalesOrderActionState,
	postSalesOrderAction,
} from "@/app/actions/post-sales-order";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: PostSalesOrderActionState = null;

interface PostSalesOrderFormProps {
	canPost: boolean;
}

/**
 * Post draft sales order — freezes party/item/payment snapshots.
 * CAPABLE when `sales.order.post` is granted.
 */
export function PostSalesOrderForm({ canPost }: PostSalesOrderFormProps) {
	const [state, formAction, pending] = useActionState(
		postSalesOrderAction,
		initialState,
	);

	if (!canPost) {
		return (
			<Alert role="status">
				<AlertTitle>Post unavailable</AlertTitle>
				<AlertDescription>
					You can view sales orders but cannot post them in this organization.
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
						{state.data.order.code} · party {state.data.order.customer.code} ·{" "}
						{state.data.order.currencyCode} {state.data.order.documentTotal} ·
						released.
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField
				error={orderError}
				fieldId="sales-post-order"
				label="Order id"
				required
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="sales-post-order"
					name="orderId"
					required
				/>
			</FormField>
			<FormField
				error={versionError}
				fieldId="sales-post-version"
				label="Expected version"
				required
			>
				<Input
					disabled={pending}
					id="sales-post-version"
					min="1"
					name="expectedVersion"
					required
					type="number"
				/>
			</FormField>
			<FormField fieldId="sales-post-tax" label="Tax total (optional)">
				<Input
					disabled={pending}
					id="sales-post-tax"
					min="0"
					name="taxTotal"
					step="any"
					type="number"
				/>
			</FormField>
			<Button disabled={pending} type="submit">
				{pending ? <Spinner /> : null}
				Post order
			</Button>
		</form>
	);
}
