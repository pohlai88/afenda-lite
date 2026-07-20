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
import type { ComponentProps } from "react";
import { useActionState } from "react";

import { addPaymentApplicationInstructionAction } from "@/app/actions/add-payment-application-instruction";
import { createAndPostPaymentTransferAction } from "@/app/actions/create-and-post-payment-transfer";
import { createDraftPaymentAction } from "@/app/actions/create-draft-payment";
import { createPaymentAccountAction } from "@/app/actions/create-payment-account";
import { getPaymentApplicationAvailabilityAction } from "@/app/actions/get-payment-application-availability";
import { postPaymentAction } from "@/app/actions/post-payment";
import { postRefundAction } from "@/app/actions/post-refund";
import { reversePaymentAction } from "@/app/actions/reverse-payment";
import type { ActionResult } from "@/modules/platform/schemas/action-result";

type Field = {
	name: string;
	label: string;
	type?: ComponentProps<"input">["type"];
	required?: boolean;
	step?: string;
	min?: string;
};

function ManageUnavailable({ operation }: { operation: string }) {
	return (
		<Alert role="status">
			<AlertTitle>{operation} unavailable</AlertTitle>
			<AlertDescription>
				You can view payments but cannot manage them in this organization.
			</AlertDescription>
		</Alert>
	);
}

function PaymentsActionForm({
	action,
	pending,
	state,
	fields,
	submitLabel,
	successTitle,
	successDescription = "The payment record is up to date.",
}: {
	action: ComponentProps<"form">["action"];
	pending: boolean;
	state: ActionResult<unknown> | null;
	fields: readonly Field[];
	submitLabel: string;
	successTitle: string;
	successDescription?: string;
}) {
	return (
		<form
			action={action}
			aria-busy={pending}
			className="flex max-w-md flex-col gap-(--field-gap)"
		>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>{successTitle}</AlertTitle>
					<AlertDescription>{successDescription}</AlertDescription>
				</Alert>
			) : null}
			{!pending && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			{fields.map((field) => {
				const id = `payments-${field.name}`;
				return (
					<FormField
						key={field.name}
						label={field.label}
						required={field.required}
						fieldId={id}
					>
						<Input
							id={id}
							name={field.name}
							type={field.type}
							required={field.required}
							step={field.step}
							min={field.min}
							autoComplete="off"
							disabled={pending}
						/>
					</FormField>
				);
			})}
			<Button type="submit" disabled={pending}>
				{pending ? <Spinner /> : null}
				{submitLabel}
			</Button>
		</form>
	);
}

const versionFields = [
	{ name: "paymentId", label: "Payment id", required: true },
	{
		name: "expectedVersion",
		label: "Expected version",
		type: "number",
		min: "1",
		required: true,
	},
] as const satisfies readonly Field[];

type ActionFormProps = { canManage: boolean };

export function CreateDraftPaymentForm({ canManage }: ActionFormProps) {
	const [state, action, pending] = useActionState(
		createDraftPaymentAction,
		null,
	);
	if (!canManage) return <ManageUnavailable operation="Create payment" />;
	return (
		<PaymentsActionForm
			action={action}
			pending={pending}
			state={state}
			fields={[
				{ name: "code", label: "Payment code", required: true },
				{
					name: "direction",
					label: "Direction (receipt or disbursement)",
					required: true,
				},
				{
					name: "paymentAccountId",
					label: "Payment account id",
					required: true,
				},
				{ name: "purpose", label: "Purpose", required: true },
				{ name: "counterpartyId", label: "Counterparty id" },
				{ name: "currencyCode", label: "Currency code", required: true },
				{
					name: "amount",
					label: "Amount",
					type: "number",
					step: "any",
					min: "0.000001",
					required: true,
				},
				{ name: "reference", label: "Reference" },
			]}
			submitLabel="Create draft payment"
			successTitle="Payment created"
		/>
	);
}

export function AddPaymentApplicationInstructionForm({
	canManage,
}: ActionFormProps) {
	const [state, action, pending] = useActionState(
		addPaymentApplicationInstructionAction,
		null,
	);
	if (!canManage)
		return <ManageUnavailable operation="Add application instruction" />;
	return (
		<PaymentsActionForm
			action={action}
			pending={pending}
			state={state}
			fields={[
				{ name: "paymentId", label: "Payment id", required: true },
				{
					name: "targetModule",
					label: "Target module (receivables or payables)",
					required: true,
				},
				{
					name: "targetDocumentType",
					label: "Document type (customer_invoice or supplier_invoice)",
					required: true,
				},
				{
					name: "targetDocumentId",
					label: "Target document id",
					required: true,
				},
				{
					name: "intendedAmount",
					label: "Intended amount",
					type: "number",
					step: "any",
					min: "0.000001",
					required: true,
				},
				{ name: "currencyCode", label: "Currency code", required: true },
			]}
			submitLabel="Add application instruction"
			successTitle="Application instruction added"
		/>
	);
}

export function CreatePaymentAccountForm({ canManage }: ActionFormProps) {
	const [state, action, pending] = useActionState(
		createPaymentAccountAction,
		null,
	);
	if (!canManage)
		return <ManageUnavailable operation="Create payment account" />;
	return (
		<PaymentsActionForm
			action={action}
			pending={pending}
			state={state}
			fields={[
				{ name: "code", label: "Account code", required: true },
				{ name: "name", label: "Account name", required: true },
				{
					name: "kind",
					label: "Kind (bank, cash, gateway, or clearing)",
					required: true,
				},
				{ name: "currencyCode", label: "Currency code", required: true },
			]}
			submitLabel="Create payment account"
			successTitle="Payment account created"
		/>
	);
}

export function CreateAndPostPaymentTransferForm({
	canManage,
}: ActionFormProps) {
	const [state, action, pending] = useActionState(
		createAndPostPaymentTransferAction,
		null,
	);
	if (!canManage)
		return <ManageUnavailable operation="Create payment transfer" />;
	return (
		<PaymentsActionForm
			action={action}
			pending={pending}
			state={state}
			fields={[
				{ name: "code", label: "Transfer code", required: true },
				{
					name: "fromPaymentAccountId",
					label: "Source payment account id",
					required: true,
				},
				{
					name: "toPaymentAccountId",
					label: "Destination payment account id",
					required: true,
				},
				{ name: "currencyCode", label: "Currency code", required: true },
				{
					name: "amount",
					label: "Amount",
					type: "number",
					step: "any",
					min: "0.000001",
					required: true,
				},
				{ name: "reference", label: "Reference" },
			]}
			submitLabel="Create and post transfer"
			successTitle="Payment transfer posted"
		/>
	);
}

export function PostPaymentForm({ canManage }: ActionFormProps) {
	const [state, action, pending] = useActionState(postPaymentAction, null);
	if (!canManage) return <ManageUnavailable operation="Post payment" />;
	return (
		<PaymentsActionForm
			action={action}
			pending={pending}
			state={state}
			fields={versionFields}
			submitLabel="Post payment"
			successTitle="Payment posted"
		/>
	);
}

export function ReversePaymentForm({ canManage }: ActionFormProps) {
	const [state, action, pending] = useActionState(reversePaymentAction, null);
	if (!canManage) return <ManageUnavailable operation="Reverse payment" />;
	return (
		<PaymentsActionForm
			action={action}
			pending={pending}
			state={state}
			fields={[
				...versionFields,
				{ name: "reason", label: "Reversal reason", required: true },
			]}
			submitLabel="Reverse payment"
			successTitle="Payment reversed"
		/>
	);
}

export function PostRefundForm({ canManage }: ActionFormProps) {
	const [state, action, pending] = useActionState(postRefundAction, null);
	if (!canManage) return <ManageUnavailable operation="Post refund" />;
	return (
		<PaymentsActionForm
			action={action}
			pending={pending}
			state={state}
			fields={[
				{ name: "code", label: "Refund code", required: true },
				{
					name: "originalPaymentId",
					label: "Original payment id",
					required: true,
				},
				{
					name: "paymentAccountId",
					label: "Payment account id",
					required: true,
				},
				{ name: "refundSource", label: "Refund source", required: true },
				{
					name: "amount",
					label: "Refund amount",
					type: "number",
					step: "any",
					min: "0.000001",
					required: true,
				},
				{ name: "reference", label: "Reference" },
			]}
			submitLabel="Post refund"
			successTitle="Refund posted"
		/>
	);
}

export function GetPaymentApplicationAvailabilityForm({
	canManage,
}: ActionFormProps) {
	const [state, action, pending] = useActionState(
		getPaymentApplicationAvailabilityAction,
		null,
	);
	if (!canManage) {
		return <ManageUnavailable operation="Read application availability" />;
	}
	const availability = state?.ok === true ? state.data.availability : null;
	return (
		<PaymentsActionForm
			action={action}
			pending={pending}
			state={state}
			fields={[{ name: "paymentId", label: "Payment id", required: true }]}
			submitLabel="Load availability"
			successTitle="Availability loaded"
			successDescription={
				availability === null
					? "Availability loaded."
					: `Posted ${availability.currencyCode} ${availability.postedAmount} · intended ${availability.intendedAmount} · refunded ${availability.refundedAmount} · available ${availability.availableToApply}`
			}
		/>
	);
}
