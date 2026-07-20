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
	type CreateSalesOrderActionState,
	createSalesOrderAction,
} from "@/app/actions/create-sales-order";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: CreateSalesOrderActionState = null;

type CreateSalesOrderFormProps = {
	canCreate: boolean;
};

/**
 * Draft sales order create — CAPABLE when `sales.order.create` is granted.
 */
export function CreateSalesOrderForm({ canCreate }: CreateSalesOrderFormProps) {
	const [state, formAction, pending] = useActionState(
		createSalesOrderAction,
		initialState,
	);

	if (!canCreate) {
		return (
			<Alert role="status">
				<AlertTitle>Create unavailable</AlertTitle>
				<AlertDescription>
					You can view sales orders but cannot create them in this organization.
				</AlertDescription>
			</Alert>
		);
	}

	const codeError = actionFieldMessage(state, "code");
	const partyError = actionFieldMessage(state, "partyId");
	const currencyError = actionFieldMessage(state, "currencyCode");
	const showFormError =
		!pending &&
		state?.ok === false &&
		codeError === undefined &&
		partyError === undefined &&
		currencyError === undefined;

	return (
		<form
			action={formAction}
			aria-busy={pending}
			className="flex max-w-md flex-col gap-(--field-gap)"
		>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Order created</AlertTitle>
					<AlertDescription>
						{state.data.order.code} · party {state.data.order.partyCode} (
						{state.data.order.partyName}) · {state.data.order.currencyCode} ·
						draft.
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField
				label="Code"
				required
				fieldId="sales-order-code"
				error={codeError}
			>
				<Input
					id="sales-order-code"
					name="code"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Party id"
				required
				fieldId="sales-order-party"
				error={partyError}
			>
				<Input
					id="sales-order-party"
					name="partyId"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Currency code"
				required
				fieldId="sales-order-currency"
				error={currencyError}
			>
				<Input
					id="sales-order-currency"
					name="currencyCode"
					required
					maxLength={3}
					autoComplete="off"
					disabled={pending}
					placeholder="USD"
				/>
			</FormField>
			<FormField
				label="Exchange rate (optional)"
				fieldId="sales-order-fx"
			>
				<Input
					id="sales-order-fx"
					name="exchangeRate"
					type="number"
					step="any"
					min="0"
					disabled={pending}
				/>
			</FormField>
			<FormField label="Bill-to address (optional)" fieldId="sales-order-bill">
				<Input
					id="sales-order-bill"
					name="billToAddressSnapshot"
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField label="Ship-to address (optional)" fieldId="sales-order-ship">
				<Input
					id="sales-order-ship"
					name="shipToAddressSnapshot"
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField label="Payment term id (optional)" fieldId="sales-order-term">
				<Input
					id="sales-order-term"
					name="paymentTermId"
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<Button type="submit" disabled={pending}>
				{pending ? <Spinner /> : null}
				Create draft order
			</Button>
		</form>
	);
}
