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

type PostSalesOrderFormProps = {
	canPost: boolean;
};

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
						{state.data.order.code} · party {state.data.order.partyCode} ·{" "}
						{state.data.order.currencyCode}{" "}
						{state.data.order.documentTotal ?? "0"} ·{" "}
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
				fieldId="sales-post-order"
				error={orderError}
			>
				<Input
					id="sales-post-order"
					name="orderId"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Expected version"
				required
				fieldId="sales-post-version"
				error={versionError}
			>
				<Input
					id="sales-post-version"
					name="expectedVersion"
					type="number"
					min="1"
					required
					disabled={pending}
				/>
			</FormField>
			<FormField label="Tax total (optional)" fieldId="sales-post-tax">
				<Input
					id="sales-post-tax"
					name="taxTotal"
					type="number"
					step="any"
					min="0"
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
