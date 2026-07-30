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
				error={receiptError}
				fieldId="disc-resolve-receipt"
				label="Receipt id"
				required
			>
				<Input
					disabled={pending}
					id="disc-resolve-receipt"
					name="receiptId"
					required
				/>
			</FormField>
			<FormField
				error={discrepancyError}
				fieldId="disc-resolve-id"
				label="Discrepancy id"
				required
			>
				<Input
					disabled={pending}
					id="disc-resolve-id"
					name="discrepancyId"
					required
				/>
			</FormField>
			<FormField
				error={versionError}
				fieldId="disc-resolve-version"
				label="Expected version"
				required
			>
				<Input
					disabled={pending}
					id="disc-resolve-version"
					min="1"
					name="expectedVersion"
					required
					type="number"
				/>
			</FormField>
			<FormField
				error={resolutionError}
				fieldId="disc-resolve-resolution"
				label="Resolution"
				required
			>
				<Input
					disabled={pending}
					id="disc-resolve-resolution"
					name="resolution"
					required
				/>
			</FormField>
			<Button disabled={pending} type="submit">
				{pending ? <Spinner /> : null}
				Resolve discrepancy
			</Button>
		</form>
	);
}
