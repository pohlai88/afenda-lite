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
	type RecordReceivingDiscrepancyActionState,
	recordReceivingDiscrepancyAction,
} from "@/app/actions/record-receiving-discrepancy";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: RecordReceivingDiscrepancyActionState = null;

export function RecordReceivingDiscrepancyForm({
	canManage,
}: {
	canManage: boolean;
}) {
	const [state, formAction, pending] = useActionState(
		recordReceivingDiscrepancyAction,
		initialState,
	);
	if (!canManage) {
		return (
			<Alert role="status">
				<AlertTitle>Record unavailable</AlertTitle>
				<AlertDescription>
					You can view goods receipts but cannot record discrepancies in this
					organization.
				</AlertDescription>
			</Alert>
		);
	}
	const receiptError = actionFieldMessage(state, "receiptId");
	const typeError = actionFieldMessage(state, "discrepancyType");
	const quantityError = actionFieldMessage(state, "quantity");
	const showFormError =
		!pending &&
		state?.ok === false &&
		receiptError === undefined &&
		typeError === undefined &&
		quantityError === undefined;

	return (
		<form
			action={formAction}
			aria-busy={pending}
			className="flex max-w-md flex-col gap-(--field-gap)"
		>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Discrepancy recorded</AlertTitle>
					<AlertDescription>
						{state.data.discrepancy.discrepancyType} · quantity{" "}
						{state.data.discrepancy.quantity}.
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField
				error={receiptError}
				fieldId="discrepancy-receipt"
				label="Receipt id"
				required
			>
				<Input
					disabled={pending}
					id="discrepancy-receipt"
					name="receiptId"
					required
				/>
			</FormField>
			<FormField fieldId="discrepancy-line" label="Receipt line id (optional)">
				<Input disabled={pending} id="discrepancy-line" name="receiptLineId" />
			</FormField>
			<FormField
				error={typeError}
				fieldId="discrepancy-type"
				label="Discrepancy type"
				required
			>
				<Input
					defaultValue="short_quantity"
					disabled={pending}
					id="discrepancy-type"
					list="discrepancy-types"
					name="discrepancyType"
					required
				/>
				<datalist id="discrepancy-types">
					<option value="short_quantity" />
					<option value="excess_quantity" />
					<option value="damaged" />
					<option value="quality_failure" />
					<option value="wrong_item" />
					<option value="wrong_uom" />
					<option value="documentation" />
					<option value="temperature" />
					<option value="other" />
				</datalist>
			</FormField>
			<FormField
				error={quantityError}
				fieldId="discrepancy-quantity"
				label="Quantity"
				required
			>
				<Input
					disabled={pending}
					id="discrepancy-quantity"
					min="0.000001"
					name="quantity"
					required
					step="any"
					type="number"
				/>
			</FormField>
			<FormField fieldId="discrepancy-notes" label="Notes (optional)">
				<Input disabled={pending} id="discrepancy-notes" name="notes" />
			</FormField>
			<Button disabled={pending} type="submit">
				{pending ? <Spinner /> : null}
				Record discrepancy
			</Button>
		</form>
	);
}
