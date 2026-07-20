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
	const sourceTypeError = actionFieldMessage(state, "sourceType");
	const sourceIdError = actionFieldMessage(state, "sourceId");
	const warehouseError = actionFieldMessage(state, "warehouseId");
	const showFormError =
		!pending &&
		state?.ok === false &&
		codeError === undefined &&
		sourceTypeError === undefined &&
		sourceIdError === undefined &&
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
						{state.data.receipt.code} · {state.data.receipt.sourceType} · draft.
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
				label="Source type"
				required
				fieldId="receipt-source-type"
				error={sourceTypeError}
			>
				<Input
					id="receipt-source-type"
					name="sourceType"
					required
					defaultValue="purchase_order"
					list="receipt-source-types"
					autoComplete="off"
					disabled={pending}
				/>
				<datalist id="receipt-source-types">
					<option value="purchase_order" />
					<option value="expected_receipt" />
					<option value="return_shipment" />
					<option value="unplanned" />
				</datalist>
			</FormField>
			<FormField
				label="Source id (required for purchase order)"
				fieldId="receipt-source-id"
				error={sourceIdError}
			>
				<Input
					id="receipt-source-id"
					name="sourceId"
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
