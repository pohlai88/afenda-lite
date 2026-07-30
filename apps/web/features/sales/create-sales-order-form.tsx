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

interface CreateSalesOrderFormProps {
	canCreate: boolean;
}

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
						{state.data.order.code} · party {state.data.order.customer.code} (
						{state.data.order.customer.name}) · {state.data.order.currencyCode}{" "}
						· draft.
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField
				error={codeError}
				fieldId="sales-order-code"
				label="Code"
				required
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="sales-order-code"
					name="code"
					required
				/>
			</FormField>
			<FormField
				error={partyError}
				fieldId="sales-order-party"
				label="Party id"
				required
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="sales-order-party"
					name="partyId"
					required
				/>
			</FormField>
			<FormField
				error={currencyError}
				fieldId="sales-order-currency"
				label="Currency code"
				required
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="sales-order-currency"
					maxLength={3}
					name="currencyCode"
					placeholder="USD"
					required
				/>
			</FormField>
			<FormField fieldId="sales-order-fx" label="Exchange rate (optional)">
				<Input
					disabled={pending}
					id="sales-order-fx"
					min="0"
					name="exchangeRate"
					step="any"
					type="number"
				/>
			</FormField>
			<FormField fieldId="sales-order-bill" label="Bill-to address (optional)">
				<Input
					autoComplete="off"
					disabled={pending}
					id="sales-order-bill"
					name="billToAddressSnapshot"
				/>
			</FormField>
			<FormField fieldId="sales-order-ship" label="Ship-to address (optional)">
				<Input
					autoComplete="off"
					disabled={pending}
					id="sales-order-ship"
					name="shipToAddressSnapshot"
				/>
			</FormField>
			<FormField fieldId="sales-order-term" label="Payment term id (optional)">
				<Input
					autoComplete="off"
					disabled={pending}
					id="sales-order-term"
					name="paymentTermId"
				/>
			</FormField>
			<Button disabled={pending} type="submit">
				{pending ? <Spinner /> : null}
				Create draft order
			</Button>
		</form>
	);
}
