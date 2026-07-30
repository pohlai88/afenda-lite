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
	type CreatePaymentTermActionState,
	createPaymentTermAction,
} from "@/app/actions/create-payment-term";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: CreatePaymentTermActionState = null;

interface CreatePaymentTermFormProps {
	canManage: boolean;
}

/**
 * Payment term create form — CAPABLE when `master_data.manage` is granted.
 */
export function CreatePaymentTermForm({
	canManage,
}: CreatePaymentTermFormProps) {
	const [state, formAction, pending] = useActionState(
		createPaymentTermAction,
		initialState,
	);

	if (!canManage) {
		return (
			<Alert role="status">
				<AlertTitle>Create unavailable</AlertTitle>
				<AlertDescription>
					You can view master data but cannot create payment terms in this
					organization.
				</AlertDescription>
			</Alert>
		);
	}

	const codeError = actionFieldMessage(state, "code");
	const nameError = actionFieldMessage(state, "name");
	const netDaysError = actionFieldMessage(state, "netDays");
	const showFormError =
		!pending &&
		state?.ok === false &&
		codeError === undefined &&
		nameError === undefined &&
		netDaysError === undefined;

	return (
		<form
			action={formAction}
			aria-busy={pending}
			className="flex max-w-md flex-col gap-(--field-gap)"
		>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Payment term created</AlertTitle>
					<AlertDescription>
						{state.data.paymentTerm.code} · {state.data.paymentTerm.name} · net{" "}
						{state.data.paymentTerm.netDays} days (draft).
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField
				error={codeError}
				fieldId="payment-term-code"
				label="Code"
				required
			>
				<Input autoComplete="off" disabled={pending} name="code" required />
			</FormField>
			<FormField
				error={nameError}
				fieldId="payment-term-name"
				label="Name"
				required
			>
				<Input autoComplete="off" disabled={pending} name="name" required />
			</FormField>
			<FormField
				error={netDaysError}
				fieldId="payment-term-net-days"
				label="Net days"
				required
			>
				<Input
					defaultValue={30}
					disabled={pending}
					min={0}
					name="netDays"
					required
					step={1}
					type="number"
				/>
			</FormField>
			<Button disabled={pending} type="submit">
				{pending ? <Spinner /> : null}
				Create payment term
			</Button>
		</form>
	);
}
