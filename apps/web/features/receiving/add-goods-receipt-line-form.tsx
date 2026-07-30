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
				error={receiptError}
				fieldId="receipt-line-receipt"
				label="Receipt id"
				required
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="receipt-line-receipt"
					name="receiptId"
					required
				/>
			</FormField>
			<FormField
				error={itemError}
				fieldId="receipt-line-item"
				label="Item id"
				required
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="receipt-line-item"
					name="itemId"
					required
				/>
			</FormField>
			<FormField
				fieldId="receipt-line-ordered"
				label="Ordered quantity (optional)"
			>
				<Input
					disabled={pending}
					id="receipt-line-ordered"
					min="0.000001"
					name="quantityOrdered"
					step="any"
					type="number"
				/>
			</FormField>
			<FormField
				error={receivedError}
				fieldId="receipt-line-received"
				label="Received quantity"
				required
			>
				<Input
					disabled={pending}
					id="receipt-line-received"
					min="0.000001"
					name="quantityReceived"
					required
					step="any"
					type="number"
				/>
			</FormField>
			<FormField
				fieldId="receipt-line-purchase-order"
				label="Purchase order line id (optional)"
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="receipt-line-purchase-order"
					name="purchaseOrderLineId"
				/>
			</FormField>
			<Button disabled={pending} type="submit">
				{pending ? <Spinner /> : null}
				Add line
			</Button>
		</form>
	);
}
