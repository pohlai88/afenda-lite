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
	type AddGoodsReceiptLineActionState,
	addGoodsReceiptLineAction,
} from "@/app/actions/add-goods-receipt-line";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: AddGoodsReceiptLineActionState = null;

export function AddGoodsReceiptLineForm({ canManage }: { canManage: boolean }) {
	const [state, formAction, pending] = useActionState(
		addGoodsReceiptLineAction,
		initialState,
	);
	if (!canManage) {
		return (
			<Alert role="status">
				<AlertTitle>Add line unavailable</AlertTitle>
				<AlertDescription>
					You can view goods receipts but cannot add lines in this organization.
				</AlertDescription>
			</Alert>
		);
	}

	const receiptError = actionFieldMessage(state, "receiptId");
	const itemError = actionFieldMessage(state, "itemId");
	const receivedError = actionFieldMessage(state, "quantityReceived");
	const showFormError =
		!pending &&
		state?.ok === false &&
		receiptError === undefined &&
		itemError === undefined &&
		receivedError === undefined;

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
						{state.data.line.quantityReceived} {state.data.line.baseUomCode}.
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField
				label="Receipt id"
				required
				fieldId="receipt-line-receipt"
				error={receiptError}
			>
				<Input
					id="receipt-line-receipt"
					name="receiptId"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Item id"
				required
				fieldId="receipt-line-item"
				error={itemError}
			>
				<Input
					id="receipt-line-item"
					name="itemId"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Ordered quantity (optional)"
				fieldId="receipt-line-ordered"
			>
				<Input
					id="receipt-line-ordered"
					name="quantityOrdered"
					type="number"
					step="any"
					min="0.000001"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Received quantity"
				required
				fieldId="receipt-line-received"
				error={receivedError}
			>
				<Input
					id="receipt-line-received"
					name="quantityReceived"
					type="number"
					step="any"
					min="0.000001"
					required
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Purchase order line id (optional)"
				fieldId="receipt-line-purchase-order"
			>
				<Input
					id="receipt-line-purchase-order"
					name="purchaseOrderLineId"
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
