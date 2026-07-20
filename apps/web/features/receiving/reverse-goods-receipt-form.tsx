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
	type ReverseGoodsReceiptActionState,
	reverseGoodsReceiptAction,
} from "@/app/actions/reverse-goods-receipt";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: ReverseGoodsReceiptActionState = null;

export function ReverseGoodsReceiptForm({ canReverse }: { canReverse: boolean }) {
	const [state, formAction, pending] = useActionState(
		reverseGoodsReceiptAction,
		initialState,
	);
	if (!canReverse) {
		return (
			<Alert role="status">
				<AlertTitle>Reverse unavailable</AlertTitle>
				<AlertDescription>
					You can view goods receipts but cannot reverse posted receipts in this
					organization.
				</AlertDescription>
			</Alert>
		);
	}
	const receiptError = actionFieldMessage(state, "receiptId");
	const versionError = actionFieldMessage(state, "expectedVersion");
	const reasonError = actionFieldMessage(state, "reason");
	const showFormError =
		!pending &&
		state?.ok === false &&
		receiptError === undefined &&
		versionError === undefined &&
		reasonError === undefined;

	return (
		<form
			action={formAction}
			aria-busy={pending}
			className="flex max-w-md flex-col gap-(--field-gap)"
		>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Receipt reversed</AlertTitle>
					<AlertDescription>
						Compensating receipt {state.data.receipt.code} · v
						{state.data.receipt.version}.
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField
				label="Posted receipt id"
				required
				fieldId="receipt-reverse-id"
				error={receiptError}
			>
				<Input
					id="receipt-reverse-id"
					name="receiptId"
					required
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Expected version"
				required
				fieldId="receipt-reverse-version"
				error={versionError}
			>
				<Input
					id="receipt-reverse-version"
					name="expectedVersion"
					type="number"
					min="1"
					required
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Reason"
				required
				fieldId="receipt-reverse-reason"
				error={reasonError}
			>
				<Input
					id="receipt-reverse-reason"
					name="reason"
					required
					disabled={pending}
				/>
			</FormField>
			<Button type="submit" disabled={pending}>
				{pending ? <Spinner /> : null}
				Reverse posted receipt
			</Button>
		</form>
	);
}
