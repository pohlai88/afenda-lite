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

import { addSupplierCreditNoteLineAction } from "@/app/actions/add-supplier-credit-note-line";
import { addSupplierInvoiceLineAction } from "@/app/actions/add-supplier-invoice-line";
import { applySupplierCreditAction } from "@/app/actions/apply-supplier-credit";
import { applySupplierPaymentAction } from "@/app/actions/apply-supplier-payment";
import { cancelSupplierInvoiceAction } from "@/app/actions/cancel-supplier-invoice";
import { createDraftSupplierCreditNoteAction } from "@/app/actions/create-draft-supplier-credit-note";
import { createDraftSupplierInvoiceAction } from "@/app/actions/create-draft-supplier-invoice";
import { issueSupplierCreditNoteAction } from "@/app/actions/issue-supplier-credit-note";
import { matchSupplierInvoiceAction } from "@/app/actions/match-supplier-invoice";
import { postSupplierCreditNoteAction } from "@/app/actions/post-supplier-credit-note";
import { postSupplierInvoiceAction } from "@/app/actions/post-supplier-invoice";
import { reverseSupplierPaymentApplicationAction } from "@/app/actions/reverse-supplier-payment-application";
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
				You can view payables but cannot manage them in this organization.
			</AlertDescription>
		</Alert>
	);
}

function PayablesActionForm({
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
						The payables record is up to date.
					</AlertDescription>
				</Alert>
			) : null}
			{!pending && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			{fields.map((field) => {
				const id = `payables-${field.name}`;
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
							type={field.type ?? "text"}
							required={field.required}
							step={field.step}
							min={field.min}
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

const supplierFields = [
	{ name: "code", label: "Document code", required: true },
	{ name: "supplierId", label: "Supplier id", required: true },
	{ name: "supplierCode", label: "Supplier code", required: true },
	{ name: "supplierName", label: "Supplier name", required: true },
	{ name: "currencyCode", label: "Currency code", required: true },
] as const;

const versionFields = [
	{ name: "invoiceId", label: "Invoice id", required: true },
	{
		name: "expectedVersion",
		label: "Expected version",
		type: "number",
		min: "1",
		required: true,
	},
] as const satisfies readonly Field[];

type ActionFormProps = { canManage: boolean };

export function CreateDraftSupplierInvoiceForm({ canManage }: ActionFormProps) {
	const [state, action, pending] = useActionState(
		createDraftSupplierInvoiceAction,
		null,
	);
	if (!canManage) return <ManageUnavailable operation="Create invoice" />;
	return (
		<PayablesActionForm
			action={action}
			pending={pending}
			state={state}
			fields={supplierFields}
			submitLabel="Create draft supplier invoice"
			successTitle="Supplier invoice created"
		/>
	);
}

export function AddSupplierInvoiceLineForm({ canManage }: ActionFormProps) {
	const [state, action, pending] = useActionState(
		addSupplierInvoiceLineAction,
		null,
	);
	if (!canManage) return <ManageUnavailable operation="Add invoice line" />;
	return (
		<PayablesActionForm
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
			submitLabel="Add supplier invoice line"
			successTitle="Invoice line added"
		/>
	);
}

export function MatchSupplierInvoiceForm({ canManage }: ActionFormProps) {
	const [state, action, pending] = useActionState(
		matchSupplierInvoiceAction,
		null,
	);
	if (!canManage) return <ManageUnavailable operation="Match invoice" />;
	return (
		<PayablesActionForm
			action={action}
			pending={pending}
			state={state}
			fields={[
				{ name: "invoiceId", label: "Invoice id", required: true },
				{ name: "purchaseOrderId", label: "Purchase order id", required: true },
				{ name: "goodsReceiptId", label: "Goods receipt id", required: true },
				{
					name: "expectedVersion",
					label: "Expected version",
					type: "number",
					min: "1",
					required: true,
				},
			]}
			submitLabel="Match supplier invoice"
			successTitle="Supplier invoice matched"
		/>
	);
}

export function PostSupplierInvoiceForm({ canManage }: ActionFormProps) {
	const [state, action, pending] = useActionState(
		postSupplierInvoiceAction,
		null,
	);
	if (!canManage) return <ManageUnavailable operation="Post invoice" />;
	return (
		<PayablesActionForm
			action={action}
			pending={pending}
			state={state}
			fields={versionFields}
			submitLabel="Post supplier invoice"
			successTitle="Supplier invoice posted"
		/>
	);
}

export function CreateDraftSupplierCreditNoteForm({
	canManage,
}: ActionFormProps) {
	const [state, action, pending] = useActionState(
		createDraftSupplierCreditNoteAction,
		null,
	);
	if (!canManage) return <ManageUnavailable operation="Create credit draft" />;
	return (
		<PayablesActionForm
			action={action}
			pending={pending}
			state={state}
			fields={supplierFields}
			submitLabel="Create draft supplier credit note"
			successTitle="Supplier credit note draft created"
		/>
	);
}

export function AddSupplierCreditNoteLineForm({ canManage }: ActionFormProps) {
	const [state, action, pending] = useActionState(
		addSupplierCreditNoteLineAction,
		null,
	);
	if (!canManage) return <ManageUnavailable operation="Add credit line" />;
	return (
		<PayablesActionForm
			action={action}
			pending={pending}
			state={state}
			fields={[
				{ name: "creditNoteId", label: "Credit note id", required: true },
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
			submitLabel="Add supplier credit note line"
			successTitle="Credit note line added"
		/>
	);
}

export function PostSupplierCreditNoteForm({ canManage }: ActionFormProps) {
	const [state, action, pending] = useActionState(
		postSupplierCreditNoteAction,
		null,
	);
	if (!canManage) return <ManageUnavailable operation="Post credit note" />;
	return (
		<PayablesActionForm
			action={action}
			pending={pending}
			state={state}
			fields={[
				{ name: "creditNoteId", label: "Credit note id", required: true },
				{
					name: "expectedVersion",
					label: "Expected version",
					type: "number",
					min: "1",
					required: true,
				},
			]}
			submitLabel="Post supplier credit note"
			successTitle="Supplier credit note posted"
		/>
	);
}

export function IssueSupplierCreditNoteForm({ canManage }: ActionFormProps) {
	const [state, action, pending] = useActionState(
		issueSupplierCreditNoteAction,
		null,
	);
	if (!canManage) return <ManageUnavailable operation="Issue credit note" />;
	return (
		<PayablesActionForm
			action={action}
			pending={pending}
			state={state}
			fields={[
				...supplierFields,
				{ name: "itemId", label: "Item id", required: true },
				{
					name: "amount",
					label: "Credit amount",
					type: "number",
					step: "any",
					min: "0.01",
					required: true,
				},
			]}
			submitLabel="Issue supplier credit note"
			successTitle="Supplier credit note issued"
		/>
	);
}

export function ApplySupplierCreditForm({ canManage }: ActionFormProps) {
	const [state, action, pending] = useActionState(
		applySupplierCreditAction,
		null,
	);
	if (!canManage) return <ManageUnavailable operation="Apply credit" />;
	return (
		<PayablesActionForm
			action={action}
			pending={pending}
			state={state}
			fields={[
				{ name: "invoiceId", label: "Invoice id", required: true },
				{ name: "creditNoteId", label: "Credit note id", required: true },
				{
					name: "amount",
					label: "Application amount",
					type: "number",
					step: "any",
					min: "0.01",
					required: true,
				},
				{ name: "idempotencyKey", label: "Idempotency key", required: true },
			]}
			submitLabel="Apply supplier credit"
			successTitle="Supplier credit applied"
		/>
	);
}

export function ApplySupplierPaymentForm({ canManage }: ActionFormProps) {
	const [state, action, pending] = useActionState(
		applySupplierPaymentAction,
		null,
	);
	if (!canManage) return <ManageUnavailable operation="Apply payment" />;
	return (
		<PayablesActionForm
			action={action}
			pending={pending}
			state={state}
			fields={[
				{ name: "invoiceId", label: "Invoice id", required: true },
				{
					name: "amount",
					label: "Application amount",
					type: "number",
					step: "any",
					min: "0.01",
					required: true,
				},
				{ name: "paymentId", label: "Payment id", required: true },
				{
					name: "paymentApplicationInstructionId",
					label: "Payment application instruction id",
					required: true,
				},
				{ name: "idempotencyKey", label: "Idempotency key", required: true },
			]}
			submitLabel="Apply supplier payment"
			successTitle="Supplier payment applied"
		/>
	);
}

export function ReverseSupplierPaymentApplicationForm({
	canManage,
}: ActionFormProps) {
	const [state, action, pending] = useActionState(
		reverseSupplierPaymentApplicationAction,
		null,
	);
	if (!canManage) return <ManageUnavailable operation="Reverse application" />;
	return (
		<PayablesActionForm
			action={action}
			pending={pending}
			state={state}
			fields={[
				{ name: "paymentId", label: "Payment id", required: true },
				{ name: "idempotencyKey", label: "Idempotency key", required: true },
			]}
			submitLabel="Reverse supplier payment application"
			successTitle="Supplier payment application reversed"
		/>
	);
}

export function CancelSupplierInvoiceForm({ canManage }: ActionFormProps) {
	const [state, action, pending] = useActionState(
		cancelSupplierInvoiceAction,
		null,
	);
	if (!canManage) return <ManageUnavailable operation="Cancel invoice" />;
	return (
		<PayablesActionForm
			action={action}
			pending={pending}
			state={state}
			fields={versionFields}
			submitLabel="Cancel supplier invoice"
			successTitle="Supplier invoice cancelled"
		/>
	);
}
