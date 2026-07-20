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

import {
	type AddSalesInvoiceLineActionState,
	addSalesInvoiceLineAction,
} from "@/app/actions/add-sales-invoice-line";
import {
	type AllocateCustomerReceiptActionState,
	allocateCustomerReceiptAction,
} from "@/app/actions/allocate-customer-receipt";
import {
	type CancelSalesInvoiceActionState,
	cancelSalesInvoiceAction,
} from "@/app/actions/cancel-sales-invoice";
import {
	type CreateDraftSalesInvoiceActionState,
	createDraftSalesInvoiceAction,
} from "@/app/actions/create-draft-sales-invoice";
import {
	type IssueCreditNoteActionState,
	issueCreditNoteAction,
} from "@/app/actions/issue-credit-note";
import {
	type PostSalesInvoiceActionState,
	postSalesInvoiceAction,
} from "@/app/actions/post-sales-invoice";
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
				You can view receivables but cannot manage them in this organization.
			</AlertDescription>
		</Alert>
	);
}

function ReceivablesActionForm({
	action,
	pending,
	state,
	fields,
	submitLabel,
	successTitle,
}: {
	action: ComponentProps<"form">["action"];
	pending: boolean;
	state: ActionResult<unknown> | null;
	fields: readonly Field[];
	submitLabel: string;
	successTitle: string;
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
					<AlertDescription>
						The receivables record is up to date.
					</AlertDescription>
				</Alert>
			) : null}
			{!pending && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			{fields.map((field) => {
				const id = `receivables-${field.name}`;
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

const customerFields = [
	{ name: "code", label: "Document code", required: true },
	{ name: "customerId", label: "Customer id", required: true },
	{ name: "customerCode", label: "Customer code", required: true },
	{ name: "customerName", label: "Customer name", required: true },
	{ name: "currencyCode", label: "Currency code", required: true },
] as const;

const invoiceVersionFields = [
	{ name: "invoiceId", label: "Invoice id", required: true },
	{
		name: "expectedVersion",
		label: "Expected version",
		type: "number",
		min: "1",
		required: true,
	},
] as const satisfies readonly Field[];

export function CreateDraftSalesInvoiceForm({
	canManage,
}: {
	canManage: boolean;
}) {
	const [state, action, pending] = useActionState(
		createDraftSalesInvoiceAction,
		null satisfies CreateDraftSalesInvoiceActionState,
	);
	if (!canManage) return <ManageUnavailable operation="Create invoice" />;
	return (
		<ReceivablesActionForm
			action={action}
			pending={pending}
			state={state}
			fields={customerFields}
			submitLabel="Create draft sales invoice"
			successTitle="Sales invoice created"
		/>
	);
}

export function AddSalesInvoiceLineForm({ canManage }: { canManage: boolean }) {
	const [state, action, pending] = useActionState(
		addSalesInvoiceLineAction,
		null satisfies AddSalesInvoiceLineActionState,
	);
	if (!canManage) return <ManageUnavailable operation="Add invoice line" />;
	return (
		<ReceivablesActionForm
			action={action}
			pending={pending}
			state={state}
			fields={[
				{ name: "invoiceId", label: "Invoice id", required: true },
				{ name: "itemId", label: "Item id", required: true },
				{ name: "description", label: "Description", required: true },
				{
					name: "quantity",
					label: "Quantity",
					type: "number",
					step: "any",
					min: "0.000001",
					required: true,
				},
				{
					name: "unitPrice",
					label: "Unit price",
					type: "number",
					step: "any",
					min: "0.000001",
					required: true,
				},
			]}
			submitLabel="Add sales invoice line"
			successTitle="Invoice line added"
		/>
	);
}

export function PostSalesInvoiceForm({ canManage }: { canManage: boolean }) {
	const [state, action, pending] = useActionState(
		postSalesInvoiceAction,
		null satisfies PostSalesInvoiceActionState,
	);
	if (!canManage) return <ManageUnavailable operation="Post invoice" />;
	return (
		<ReceivablesActionForm
			action={action}
			pending={pending}
			state={state}
			fields={invoiceVersionFields}
			submitLabel="Post sales invoice"
			successTitle="Sales invoice posted"
		/>
	);
}

export function IssueCreditNoteForm({ canManage }: { canManage: boolean }) {
	const [state, action, pending] = useActionState(
		issueCreditNoteAction,
		null satisfies IssueCreditNoteActionState,
	);
	if (!canManage) return <ManageUnavailable operation="Issue credit note" />;
	return (
		<ReceivablesActionForm
			action={action}
			pending={pending}
			state={state}
			fields={[
				...customerFields,
				{
					name: "amount",
					label: "Credit amount",
					type: "number",
					step: "any",
					min: "0.01",
					required: true,
				},
			]}
			submitLabel="Issue credit note"
			successTitle="Credit note issued"
		/>
	);
}

export function AllocateCustomerReceiptForm({
	canManage,
}: {
	canManage: boolean;
}) {
	const [state, action, pending] = useActionState(
		allocateCustomerReceiptAction,
		null satisfies AllocateCustomerReceiptActionState,
	);
	if (!canManage) return <ManageUnavailable operation="Allocate receipt" />;
	return (
		<ReceivablesActionForm
			action={action}
			pending={pending}
			state={state}
			fields={[
				{ name: "invoiceId", label: "Invoice id", required: true },
				{
					name: "amount",
					label: "Allocation amount",
					type: "number",
					step: "any",
					min: "0.01",
					required: true,
				},
				{ name: "paymentId", label: "Payment id (optional)" },
			]}
			submitLabel="Allocate customer receipt"
			successTitle="Receipt allocated"
		/>
	);
}

export function CancelSalesInvoiceForm({ canManage }: { canManage: boolean }) {
	const [state, action, pending] = useActionState(
		cancelSalesInvoiceAction,
		null satisfies CancelSalesInvoiceActionState,
	);
	if (!canManage) return <ManageUnavailable operation="Cancel invoice" />;
	return (
		<ReceivablesActionForm
			action={action}
			pending={pending}
			state={state}
			fields={invoiceVersionFields}
			submitLabel="Cancel sales invoice"
			successTitle="Sales invoice cancelled"
		/>
	);
}
