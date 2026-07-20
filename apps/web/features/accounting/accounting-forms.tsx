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

import { addJournalLineAction } from "@/app/actions/add-journal-line";
import { closeAccountingPeriodAction } from "@/app/actions/close-accounting-period";
import { createDraftJournalAction } from "@/app/actions/create-draft-journal";
import { openAccountingPeriodAction } from "@/app/actions/open-accounting-period";
import { postJournalAction } from "@/app/actions/post-journal";
import { reopenAccountingPeriodAction } from "@/app/actions/reopen-accounting-period";
import { reverseJournalAction } from "@/app/actions/reverse-journal";
import { softCloseAccountingPeriodAction } from "@/app/actions/soft-close-accounting-period";
import type { ActionResult } from "@/modules/platform/schemas/action-result";

type Field = {
	name: string;
	label: string;
	type?: ComponentProps<"input">["type"];
	required?: boolean;
	step?: string;
	min?: string;
};

type ActionFormProps = { canManage: boolean };

function ManageUnavailable({ operation }: { operation: string }) {
	return (
		<Alert role="status">
			<AlertTitle>{operation} unavailable</AlertTitle>
			<AlertDescription>
				You can view accounting records but cannot manage them in this
				organization.
			</AlertDescription>
		</Alert>
	);
}

function AccountingActionForm({
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
						The accounting register is up to date.
					</AlertDescription>
				</Alert>
			) : null}
			{!pending && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			{fields.map((field) => {
				const id = `accounting-${field.name}`;
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

const journalVersionFields = [
	{ name: "journalId", label: "Journal id", required: true },
	{
		name: "expectedVersion",
		label: "Expected version",
		type: "number",
		min: "1",
		required: true,
	},
] as const satisfies readonly Field[];

export function OpenAccountingPeriodForm({ canManage }: ActionFormProps) {
	const [state, action, pending] = useActionState(
		openAccountingPeriodAction,
		null,
	);
	if (!canManage) return <ManageUnavailable operation="Open period" />;
	return (
		<AccountingActionForm
			action={action}
			pending={pending}
			state={state}
			fields={[
				{ name: "code", label: "Period code", required: true },
				{
					name: "startDate",
					label: "Start date",
					type: "date",
					required: true,
				},
				{ name: "endDate", label: "End date", type: "date", required: true },
			]}
			submitLabel="Open accounting period"
			successTitle="Accounting period opened"
		/>
	);
}

export function CloseAccountingPeriodForm({ canManage }: ActionFormProps) {
	const [state, action, pending] = useActionState(
		closeAccountingPeriodAction,
		null,
	);
	if (!canManage) return <ManageUnavailable operation="Close period" />;
	return (
		<AccountingActionForm
			action={action}
			pending={pending}
			state={state}
			fields={[
				{ name: "periodId", label: "Period id", required: true },
				{
					name: "expectedVersion",
					label: "Expected version",
					type: "number",
					min: "1",
					required: true,
				},
			]}
			submitLabel="Close accounting period"
			successTitle="Accounting period closed"
		/>
	);
}

export function CreateDraftJournalForm({ canManage }: ActionFormProps) {
	const [state, action, pending] = useActionState(
		createDraftJournalAction,
		null,
	);
	if (!canManage) return <ManageUnavailable operation="Create journal" />;
	return (
		<AccountingActionForm
			action={action}
			pending={pending}
			state={state}
			fields={[
				{ name: "periodId", label: "Period id", required: true },
				{ name: "code", label: "Journal code", required: true },
				{ name: "currencyCode", label: "Currency code", required: true },
				{ name: "description", label: "Description" },
			]}
			submitLabel="Create draft journal"
			successTitle="Journal created"
		/>
	);
}

export function AddJournalLineForm({ canManage }: ActionFormProps) {
	const [state, action, pending] = useActionState(addJournalLineAction, null);
	if (!canManage) return <ManageUnavailable operation="Add journal line" />;
	return (
		<AccountingActionForm
			action={action}
			pending={pending}
			state={state}
			fields={[
				{ name: "journalId", label: "Journal id", required: true },
				{ name: "accountCode", label: "Account code", required: true },
				{ name: "description", label: "Description" },
				{
					name: "debit",
					label: "Debit",
					type: "number",
					step: "any",
					min: "0",
					required: true,
				},
				{
					name: "credit",
					label: "Credit",
					type: "number",
					step: "any",
					min: "0",
					required: true,
				},
			]}
			submitLabel="Add journal line"
			successTitle="Journal line added"
		/>
	);
}

export function PostJournalForm({ canManage }: ActionFormProps) {
	const [state, action, pending] = useActionState(postJournalAction, null);
	if (!canManage) return <ManageUnavailable operation="Post journal" />;
	return (
		<AccountingActionForm
			action={action}
			pending={pending}
			state={state}
			fields={journalVersionFields}
			submitLabel="Post journal"
			successTitle="Journal posted"
		/>
	);
}

export function ReverseJournalForm({ canManage }: ActionFormProps) {
	const [state, action, pending] = useActionState(reverseJournalAction, null);
	if (!canManage) return <ManageUnavailable operation="Reverse journal" />;
	return (
		<AccountingActionForm
			action={action}
			pending={pending}
			state={state}
			fields={[
				...journalVersionFields,
				{ name: "reason", label: "Reversal reason", required: true },
			]}
			submitLabel="Reverse journal"
			successTitle="Journal reversed"
		/>
	);
}

export function SoftCloseAccountingPeriodForm({ canManage }: ActionFormProps) {
	const [state, action, pending] = useActionState(
		softCloseAccountingPeriodAction,
		null,
	);
	if (!canManage) return <ManageUnavailable operation="Soft-close period" />;
	return (
		<AccountingActionForm
			action={action}
			pending={pending}
			state={state}
			fields={[
				{ name: "periodId", label: "Period id", required: true },
				{
					name: "expectedVersion",
					label: "Expected version",
					type: "number",
					min: "1",
					required: true,
				},
			]}
			submitLabel="Soft-close accounting period"
			successTitle="Accounting period soft-closed"
		/>
	);
}

export function ReopenAccountingPeriodForm({ canManage }: ActionFormProps) {
	const [state, action, pending] = useActionState(
		reopenAccountingPeriodAction,
		null,
	);
	if (!canManage) return <ManageUnavailable operation="Reopen period" />;
	return (
		<AccountingActionForm
			action={action}
			pending={pending}
			state={state}
			fields={[
				{ name: "periodId", label: "Period id", required: true },
				{
					name: "expectedVersion",
					label: "Expected version",
					type: "number",
					min: "1",
					required: true,
				},
				{ name: "reason", label: "Reopen reason", required: true },
			]}
			submitLabel="Reopen accounting period"
			successTitle="Accounting period reopened"
		/>
	);
}
