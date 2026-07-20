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
				label="Receipt id"
				required
				fieldId="receipt-post-id"
				error={receiptError}
			>
				<Input
					id="receipt-post-id"
					name="receiptId"
					required
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Expected version"
				required
				fieldId="receipt-post-version"
				error={versionError}
			>
				<Input
					id="receipt-post-version"
					name="expectedVersion"
					type="number"
					min="1"
					required
					disabled={pending}
				/>
			</FormField>
			<Button type="submit" disabled={pending}>
				{pending ? <Spinner /> : null}
				Post receipt
			</Button>
		</form>
	);
}
