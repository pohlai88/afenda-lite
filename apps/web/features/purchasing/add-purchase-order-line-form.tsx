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

interface AddPurchaseOrderLineFormProps {
	canUpdate: boolean;
}

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
				error={orderError}
				fieldId="purchase-line-order"
				label="Order id"
				required
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="purchase-line-order"
					name="orderId"
					required
				/>
			</FormField>
			<FormField
				error={itemError}
				fieldId="purchase-line-item"
				label="Item id"
				required
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="purchase-line-item"
					name="itemId"
					required
				/>
			</FormField>
			<FormField
				error={qtyError}
				fieldId="purchase-line-qty"
				label="Quantity"
				required
			>
				<Input
					disabled={pending}
					id="purchase-line-qty"
					min="0.000001"
					name="quantity"
					required
					step="any"
					type="number"
				/>
			</FormField>
			<FormField
				error={priceError}
				fieldId="purchase-line-price"
				label="Unit price"
				required
			>
				<Input
					disabled={pending}
					id="purchase-line-price"
					min="0"
					name="unitPrice"
					required
					step="any"
					type="number"
				/>
			</FormField>
			<FormField
				fieldId="purchase-line-discount"
				label="Discount amount (optional)"
			>
				<Input
					disabled={pending}
					id="purchase-line-discount"
					min="0"
					name="discountAmount"
					step="any"
					type="number"
				/>
			</FormField>
			<FormField
				fieldId="purchase-line-tax"
				label="Tax classification (optional)"
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="purchase-line-tax"
					name="taxClassification"
				/>
			</FormField>
			<Button disabled={pending} type="submit">
				{pending ? <Spinner /> : null}
				Add line
			</Button>
		</form>
	);
}
