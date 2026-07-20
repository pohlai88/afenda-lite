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
	type CancelGoodsReceiptActionState,
	cancelGoodsReceiptAction,
} from "@/app/actions/cancel-goods-receipt";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: CancelGoodsReceiptActionState = null;

export function CancelGoodsReceiptForm({ canManage }: { canManage: boolean }) {
	const [state, formAction, pending] = useActionState(
		cancelGoodsReceiptAction,
		initialState,
	);
	if (!canManage) {
		return (
			<Alert role="status">
				<AlertTitle>Cancel unavailable</AlertTitle>
				<AlertDescription>
					You can view goods receipts but cannot cancel them in this
					organization.
				</AlertDescription>
			</Alert>
		);
	}
	const receiptError = actionFieldMessage(state, "receiptId");
	const versionError = actionFieldMessage(state, "expectedVersion");
	const showFormError =
		!pending &&
		state?.ok === false &&
		receiptError === undefined &&
		versionError === undefined;

	return (
		<form
			action={formAction}
			aria-busy={pending}
			className="flex max-w-md flex-col gap-(--field-gap)"
		>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Receipt cancelled</AlertTitle>
					<AlertDescription>
						{state.data.receipt.code} · {state.data.receipt.status} · v
						{state.data.receipt.version}.
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField
				label="Receipt id"
				required
				fieldId="receipt-cancel-id"
				error={receiptError}
			>
				<Input
					id="receipt-cancel-id"
					name="receiptId"
					required
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Expected version"
				required
				fieldId="receipt-cancel-version"
				error={versionError}
			>
				<Input
					id="receipt-cancel-version"
					name="expectedVersion"
					type="number"
					min="1"
					required
					disabled={pending}
				/>
			</FormField>
			<Button type="submit" disabled={pending}>
				{pending ? <Spinner /> : null}
				Cancel receipt
			</Button>
		</form>
	);
}
