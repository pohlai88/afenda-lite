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
	canManage: boolean;
};

/**
 * Draft sales order create — CAPABLE when `sales.manage` is granted.
 */
export function CreateSalesOrderForm({ canManage }: CreateSalesOrderFormProps) {
	const [state, formAction, pending] = useActionState(
		createSalesOrderAction,
		initialState,
	);

	if (!canManage) {
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
	const showFormError =
		!pending &&
		state?.ok === false &&
		codeError === undefined &&
		partyError === undefined;

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
						{state.data.order.partyName}) · draft.
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
