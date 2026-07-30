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

interface PostPurchaseOrderFormProps {
	canPost: boolean;
}

/**
 * Post draft purchase order — CAPABLE when `purchasing.order.post` is granted.
 */
export function PostPurchaseOrderForm({ canPost }: PostPurchaseOrderFormProps) {
	const [state, formAction, pending] = useActionState(
		postPurchaseOrderAction,
		initialState,
	);

	if (!canPost) {
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
						{state.data.order.currencyCode} · {state.data.order.lines.length}{" "}
						line(s) · total {state.data.order.documentTotal ?? "—"}.
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField
				error={orderError}
				fieldId="purchase-post-order"
				label="Order id"
				required
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="purchase-post-order"
					name="orderId"
					required
				/>
			</FormField>
			<FormField
				error={versionError}
				fieldId="purchase-post-version"
				label="Expected version"
				required
			>
				<Input
					disabled={pending}
					id="purchase-post-version"
					min="1"
					name="expectedVersion"
					required
					type="number"
				/>
			</FormField>
			<FormField fieldId="purchase-post-tax" label="Tax total (optional)">
				<Input
					disabled={pending}
					id="purchase-post-tax"
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
