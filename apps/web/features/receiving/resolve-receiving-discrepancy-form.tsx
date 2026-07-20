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
	type ResolveReceivingDiscrepancyActionState,
	resolveReceivingDiscrepancyAction,
} from "@/app/actions/resolve-receiving-discrepancy";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: ResolveReceivingDiscrepancyActionState = null;

export function ResolveReceivingDiscrepancyForm({
	canResolve,
}: {
	canResolve: boolean;
}) {
	const [state, formAction, pending] = useActionState(
		resolveReceivingDiscrepancyAction,
		initialState,
	);
	if (!canResolve) {
		return (
			<Alert role="status">
				<AlertTitle>Resolve unavailable</AlertTitle>
				<AlertDescription>
					You can view discrepancies but cannot resolve them in this
					organization.
				</AlertDescription>
			</Alert>
		);
	}
	const receiptError = actionFieldMessage(state, "receiptId");
	const discrepancyError = actionFieldMessage(state, "discrepancyId");
	const versionError = actionFieldMessage(state, "expectedVersion");
	const resolutionError = actionFieldMessage(state, "resolution");
	const showFormError =
		!pending &&
		state?.ok === false &&
		receiptError === undefined &&
		discrepancyError === undefined &&
		versionError === undefined &&
		resolutionError === undefined;

	return (
		<form
			action={formAction}
			aria-busy={pending}
			className="flex max-w-md flex-col gap-(--field-gap)"
		>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Discrepancy resolved</AlertTitle>
					<AlertDescription>
						{state.data.discrepancy.discrepancyType} ·{" "}
						{state.data.discrepancy.status}.
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField
				label="Receipt id"
				required
				fieldId="disc-resolve-receipt"
				error={receiptError}
			>
				<Input
					id="disc-resolve-receipt"
					name="receiptId"
					required
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Discrepancy id"
				required
				fieldId="disc-resolve-id"
				error={discrepancyError}
			>
				<Input
					id="disc-resolve-id"
					name="discrepancyId"
					required
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Expected version"
				required
				fieldId="disc-resolve-version"
				error={versionError}
			>
				<Input
					id="disc-resolve-version"
					name="expectedVersion"
					type="number"
					min="1"
					required
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Resolution"
				required
				fieldId="disc-resolve-resolution"
				error={resolutionError}
			>
				<Input
					id="disc-resolve-resolution"
					name="resolution"
					required
					disabled={pending}
				/>
			</FormField>
			<Button type="submit" disabled={pending}>
				{pending ? <Spinner /> : null}
				Resolve discrepancy
			</Button>
		</form>
	);
}
