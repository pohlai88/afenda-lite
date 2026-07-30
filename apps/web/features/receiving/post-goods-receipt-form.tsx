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
	type PostGoodsReceiptActionState,
	postGoodsReceiptAction,
} from "@/app/actions/post-goods-receipt";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: PostGoodsReceiptActionState = null;

export function PostGoodsReceiptForm({ canManage }: { canManage: boolean }) {
	const [state, formAction, pending] = useActionState(
		postGoodsReceiptAction,
		initialState,
	);
	if (!canManage) {
		return (
			<Alert role="status">
				<AlertTitle>Post unavailable</AlertTitle>
				<AlertDescription>
					You can view goods receipts but cannot post them in this organization.
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
					<AlertTitle>Receipt posted</AlertTitle>
					<AlertDescription>
						{state.data.receipt.code} · {state.data.receipt.lines.length}{" "}
						line(s) posted.
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField
				error={receiptError}
				fieldId="receipt-post-id"
				label="Receipt id"
				required
			>
				<Input
					disabled={pending}
					id="receipt-post-id"
					name="receiptId"
					required
				/>
			</FormField>
			<FormField
				error={versionError}
				fieldId="receipt-post-version"
				label="Expected version"
				required
			>
				<Input
					disabled={pending}
					id="receipt-post-version"
					min="1"
					name="expectedVersion"
					required
					type="number"
				/>
			</FormField>
			<Button disabled={pending} type="submit">
				{pending ? <Spinner /> : null}
				Post receipt
			</Button>
		</form>
	);
}
