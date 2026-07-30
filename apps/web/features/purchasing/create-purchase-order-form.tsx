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
	type CreatePurchaseOrderActionState,
	createPurchaseOrderAction,
} from "@/app/actions/create-purchase-order";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: CreatePurchaseOrderActionState = null;

interface CreatePurchaseOrderFormProps {
	canCreate: boolean;
}

/**
 * Draft purchase order create — CAPABLE when `purchasing.order.create` is granted.
 */
export function CreatePurchaseOrderForm({
	canCreate,
}: CreatePurchaseOrderFormProps) {
	const [state, formAction, pending] = useActionState(
		createPurchaseOrderAction,
		initialState,
	);

	if (!canCreate) {
		return (
			<Alert role="status">
				<AlertTitle>Create unavailable</AlertTitle>
				<AlertDescription>
					You can view purchase orders but cannot create them in this
					organization.
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
				error={codeError}
				fieldId="purchase-order-code"
				label="Code"
				required
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="purchase-order-code"
					name="code"
					required
				/>
			</FormField>
			<FormField
				error={partyError}
				fieldId="purchase-order-party"
				label="Party id"
				required
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="purchase-order-party"
					name="partyId"
					required
				/>
			</FormField>
			<FormField
				error={currencyError}
				fieldId="purchase-order-currency"
				label="Currency code"
				required
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="purchase-order-currency"
					maxLength={3}
					name="currencyCode"
					placeholder="USD"
					required
				/>
			</FormField>
			<FormField fieldId="purchase-order-fx" label="Exchange rate (optional)">
				<Input
					disabled={pending}
					id="purchase-order-fx"
					min="0"
					name="exchangeRate"
					step="any"
					type="number"
				/>
			</FormField>
			<FormField
				fieldId="purchase-order-term"
				label="Payment term id (optional)"
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="purchase-order-term"
					name="paymentTermId"
				/>
			</FormField>
			<FormField
				fieldId="purchase-order-warehouse"
				label="Warehouse id (optional)"
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="purchase-order-warehouse"
					name="warehouseId"
				/>
			</FormField>
			<Button disabled={pending} type="submit">
				{pending ? <Spinner /> : null}
				Create draft order
			</Button>
		</form>
	);
}
