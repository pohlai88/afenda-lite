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

type CreatePurchaseOrderFormProps = {
	canCreate: boolean;
};

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
				label="Code"
				required
				fieldId="purchase-order-code"
				error={codeError}
			>
				<Input
					id="purchase-order-code"
					name="code"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Party id"
				required
				fieldId="purchase-order-party"
				error={partyError}
			>
				<Input
					id="purchase-order-party"
					name="partyId"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Currency code"
				required
				fieldId="purchase-order-currency"
				error={currencyError}
			>
				<Input
					id="purchase-order-currency"
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
				fieldId="purchase-order-fx"
			>
				<Input
					id="purchase-order-fx"
					name="exchangeRate"
					type="number"
					step="any"
					min="0"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Payment term id (optional)"
				fieldId="purchase-order-term"
			>
				<Input
					id="purchase-order-term"
					name="paymentTermId"
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Warehouse id (optional)"
				fieldId="purchase-order-warehouse"
			>
				<Input
					id="purchase-order-warehouse"
					name="warehouseId"
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
