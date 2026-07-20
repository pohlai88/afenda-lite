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
	type CreateGoodsReceiptActionState,
	createGoodsReceiptAction,
} from "@/app/actions/create-goods-receipt";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: CreateGoodsReceiptActionState = null;

export function CreateGoodsReceiptForm({ canManage }: { canManage: boolean }) {
	const [state, formAction, pending] = useActionState(
		createGoodsReceiptAction,
		initialState,
	);
	if (!canManage) {
		return (
			<Alert role="status">
				<AlertTitle>Create unavailable</AlertTitle>
				<AlertDescription>
					You can view goods receipts but cannot create them in this
					organization.
				</AlertDescription>
			</Alert>
		);
	}

	const codeError = actionFieldMessage(state, "code");
	const purchaseOrderError = actionFieldMessage(state, "purchaseOrderId");
	const warehouseError = actionFieldMessage(state, "warehouseId");
	const showFormError =
		!pending &&
		state?.ok === false &&
		codeError === undefined &&
		purchaseOrderError === undefined &&
		warehouseError === undefined;

	return (
		<form
			action={formAction}
			aria-busy={pending}
			className="flex max-w-md flex-col gap-(--field-gap)"
		>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Receipt created</AlertTitle>
					<AlertDescription>
						{state.data.receipt.code} · purchase_order · draft.
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField label="Code" required fieldId="receipt-code" error={codeError}>
				<Input
					id="receipt-code"
					name="code"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Purchase order id"
				required
				fieldId="receipt-po-id"
				error={purchaseOrderError}
			>
				<Input
					id="receipt-po-id"
					name="purchaseOrderId"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Warehouse id"
				required
				fieldId="receipt-warehouse"
				error={warehouseError}
			>
				<Input
					id="receipt-warehouse"
					name="warehouseId"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField label="Notes (optional)" fieldId="receipt-notes">
				<Input id="receipt-notes" name="notes" disabled={pending} />
			</FormField>
			<Button type="submit" disabled={pending}>
				{pending ? <Spinner /> : null}
				Create draft receipt
			</Button>
		</form>
	);
}
