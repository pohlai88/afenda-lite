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

export function ReverseGoodsReceiptForm({
	canReverse,
}: {
	canReverse: boolean;
}) {
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
				error={receiptError}
				fieldId="receipt-reverse-id"
				label="Posted receipt id"
				required
			>
				<Input
					disabled={pending}
					id="receipt-reverse-id"
					name="receiptId"
					required
				/>
			</FormField>
			<FormField
				error={versionError}
				fieldId="receipt-reverse-version"
				label="Expected version"
				required
			>
				<Input
					disabled={pending}
					id="receipt-reverse-version"
					min="1"
					name="expectedVersion"
					required
					type="number"
				/>
			</FormField>
			<FormField
				error={reasonError}
				fieldId="receipt-reverse-reason"
				label="Reason"
				required
			>
				<Input
					disabled={pending}
					id="receipt-reverse-reason"
					name="reason"
					required
				/>
			</FormField>
			<Button disabled={pending} type="submit">
				{pending ? <Spinner /> : null}
				Reverse posted receipt
			</Button>
		</form>
	);
}
