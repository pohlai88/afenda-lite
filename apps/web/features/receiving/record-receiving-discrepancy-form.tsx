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
				label="Receipt id"
				required
				fieldId="discrepancy-receipt"
				error={receiptError}
			>
				<Input
					id="discrepancy-receipt"
					name="receiptId"
					required
					disabled={pending}
				/>
			</FormField>
			<FormField label="Receipt line id (optional)" fieldId="discrepancy-line">
				<Input id="discrepancy-line" name="receiptLineId" disabled={pending} />
			</FormField>
			<FormField
				label="Discrepancy type"
				required
				fieldId="discrepancy-type"
				error={typeError}
			>
				<Input
					id="discrepancy-type"
					name="discrepancyType"
					required
					defaultValue="short_quantity"
					list="discrepancy-types"
					disabled={pending}
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
				label="Quantity"
				required
				fieldId="discrepancy-quantity"
				error={quantityError}
			>
				<Input
					id="discrepancy-quantity"
					name="quantity"
					type="number"
					step="any"
					min="0.000001"
					required
					disabled={pending}
				/>
			</FormField>
			<FormField label="Notes (optional)" fieldId="discrepancy-notes">
				<Input id="discrepancy-notes" name="notes" disabled={pending} />
			</FormField>
			<Button type="submit" disabled={pending}>
				{pending ? <Spinner /> : null}
				Record discrepancy
			</Button>
		</form>
	);
}
