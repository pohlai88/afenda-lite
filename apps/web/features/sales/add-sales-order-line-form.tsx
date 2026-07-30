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

interface AddSalesOrderLineFormProps {
	canUpdate: boolean;
}

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
						Line {state.data.line.lineNo} · {state.data.line.item.code} ×{" "}
						{state.data.line.quantity} {state.data.line.item.baseUomCode} @{" "}
						{state.data.line.unitPrice} = {state.data.line.lineAmount}.
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField
				error={orderError}
				fieldId="sales-line-order"
				label="Order id"
				required
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="sales-line-order"
					name="orderId"
					required
				/>
			</FormField>
			<FormField
				error={versionError}
				fieldId="sales-line-version"
				label="Expected version"
				required
			>
				<Input
					disabled={pending}
					id="sales-line-version"
					min="1"
					name="expectedVersion"
					required
					type="number"
				/>
			</FormField>
			<FormField
				error={itemError}
				fieldId="sales-line-item"
				label="Item id"
				required
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="sales-line-item"
					name="itemId"
					required
				/>
			</FormField>
			<FormField
				error={qtyError}
				fieldId="sales-line-qty"
				label="Quantity"
				required
			>
				<Input
					disabled={pending}
					id="sales-line-qty"
					min="0.000001"
					name="quantity"
					required
					step="any"
					type="number"
				/>
			</FormField>
			<FormField
				error={priceError}
				fieldId="sales-line-price"
				label="Unit price"
				required
			>
				<Input
					disabled={pending}
					id="sales-line-price"
					min="0"
					name="unitPrice"
					required
					step="any"
					type="number"
				/>
			</FormField>
			<FormField
				fieldId="sales-line-discount"
				label="Discount amount (optional)"
			>
				<Input
					disabled={pending}
					id="sales-line-discount"
					min="0"
					name="discountAmount"
					step="any"
					type="number"
				/>
			</FormField>
			<FormField fieldId="sales-line-tax" label="Tax classification (optional)">
				<Input
					autoComplete="off"
					disabled={pending}
					id="sales-line-tax"
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
