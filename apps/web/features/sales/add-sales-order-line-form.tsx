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
	type AddSalesOrderLineActionState,
	addSalesOrderLineAction,
} from "@/app/actions/add-sales-order-line";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: AddSalesOrderLineActionState = null;

type AddSalesOrderLineFormProps = {
	canUpdate: boolean;
};

/**
 * Add line to draft sales order — CAPABLE when `sales.order.update` is granted.
 */
export function AddSalesOrderLineForm({
	canUpdate,
}: AddSalesOrderLineFormProps) {
	const [state, formAction, pending] = useActionState(
		addSalesOrderLineAction,
		initialState,
	);

	if (!canUpdate) {
		return (
			<Alert role="status">
				<AlertTitle>Add line unavailable</AlertTitle>
				<AlertDescription>
					You can view sales orders but cannot add lines in this organization.
				</AlertDescription>
			</Alert>
		);
	}

	const orderError = actionFieldMessage(state, "orderId");
	const versionError = actionFieldMessage(state, "expectedVersion");
	const itemError = actionFieldMessage(state, "itemId");
	const qtyError = actionFieldMessage(state, "quantity");
	const priceError = actionFieldMessage(state, "unitPrice");
	const showFormError =
		!pending &&
		state?.ok === false &&
		orderError === undefined &&
		versionError === undefined &&
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
				fieldId="sales-line-order"
				error={orderError}
			>
				<Input
					id="sales-line-order"
					name="orderId"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Expected version"
				required
				fieldId="sales-line-version"
				error={versionError}
			>
				<Input
					id="sales-line-version"
					name="expectedVersion"
					type="number"
					min="1"
					required
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Item id"
				required
				fieldId="sales-line-item"
				error={itemError}
			>
				<Input
					id="sales-line-item"
					name="itemId"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Quantity"
				required
				fieldId="sales-line-qty"
				error={qtyError}
			>
				<Input
					id="sales-line-qty"
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
				fieldId="sales-line-price"
				error={priceError}
			>
				<Input
					id="sales-line-price"
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
				fieldId="sales-line-discount"
			>
				<Input
					id="sales-line-discount"
					name="discountAmount"
					type="number"
					step="any"
					min="0"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Tax classification (optional)"
				fieldId="sales-line-tax"
			>
				<Input
					id="sales-line-tax"
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
