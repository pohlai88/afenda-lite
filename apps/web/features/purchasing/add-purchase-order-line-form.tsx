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
	type AddPurchaseOrderLineActionState,
	addPurchaseOrderLineAction,
} from "@/app/actions/add-purchase-order-line";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: AddPurchaseOrderLineActionState = null;

type AddPurchaseOrderLineFormProps = {
	canUpdate: boolean;
};

/**
 * Add line to draft purchase order — CAPABLE when `purchasing.order.update` is granted.
 */
export function AddPurchaseOrderLineForm({
	canUpdate,
}: AddPurchaseOrderLineFormProps) {
	const [state, formAction, pending] = useActionState(
		addPurchaseOrderLineAction,
		initialState,
	);

	if (!canUpdate) {
		return (
			<Alert role="status">
				<AlertTitle>Add line unavailable</AlertTitle>
				<AlertDescription>
					You can view purchase orders but cannot add lines in this
					organization.
				</AlertDescription>
			</Alert>
		);
	}

	const orderError = actionFieldMessage(state, "orderId");
	const itemError = actionFieldMessage(state, "itemId");
	const qtyError = actionFieldMessage(state, "quantity");
	const priceError = actionFieldMessage(state, "unitPrice");
	const showFormError =
		!pending &&
		state?.ok === false &&
		orderError === undefined &&
		itemError === undefined &&
		qtyError === undefined &&
		priceError === undefined;

	return (
		<form
			action={formAction}
			aria-busy={pending}
			className="flex max-w-md flex-col gap-(--field-gap)"
		>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Line added</AlertTitle>
					<AlertDescription>
						Line {state.data.line.lineNo} · {state.data.line.itemCode} ×{" "}
						{state.data.line.quantity} {state.data.line.baseUomCode} @{" "}
						{state.data.line.unitPrice} = {state.data.line.lineAmount}.
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField
				label="Order id"
				required
				fieldId="purchase-line-order"
				error={orderError}
			>
				<Input
					id="purchase-line-order"
					name="orderId"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Item id"
				required
				fieldId="purchase-line-item"
				error={itemError}
			>
				<Input
					id="purchase-line-item"
					name="itemId"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Quantity"
				required
				fieldId="purchase-line-qty"
				error={qtyError}
			>
				<Input
					id="purchase-line-qty"
					name="quantity"
					type="number"
					step="any"
					min="0.000001"
					required
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Unit price"
				required
				fieldId="purchase-line-price"
				error={priceError}
			>
				<Input
					id="purchase-line-price"
					name="unitPrice"
					type="number"
					step="any"
					min="0"
					required
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Discount amount (optional)"
				fieldId="purchase-line-discount"
			>
				<Input
					id="purchase-line-discount"
					name="discountAmount"
					type="number"
					step="any"
					min="0"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Tax classification (optional)"
				fieldId="purchase-line-tax"
			>
				<Input
					id="purchase-line-tax"
					name="taxClassification"
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<Button type="submit" disabled={pending}>
				{pending ? <Spinner /> : null}
				Add line
			</Button>
		</form>
	);
}
