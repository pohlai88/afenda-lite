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
import { useActionState, useMemo } from "react";

import {
	type CreateReversalMovementActionState,
	createReversalMovementAction,
} from "@/app/actions/create-reversal-movement";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: CreateReversalMovementActionState = null;

type CreateReversalMovementFormProps = {
	canPost: boolean;
	defaultMovementId?: string;
	defaultExpectedVersion?: number;
};

export function CreateReversalMovementForm({
	canPost,
	defaultMovementId,
	defaultExpectedVersion,
}: CreateReversalMovementFormProps) {
	const [state, formAction, pending] = useActionState(
		createReversalMovementAction,
		initialState,
	);
	const idempotencyKey = useMemo(
		() => `reversal:${crypto.randomUUID()}`,
		[state],
	);

	if (!canPost) {
		return (
			<Alert role="status">
				<AlertTitle>Reversal unavailable</AlertTitle>
				<AlertDescription>
					You can view inventory but cannot post reversal movements in this
					organization.
				</AlertDescription>
			</Alert>
		);
	}

	const movementError = actionFieldMessage(state, "movementId");
	const codeError = actionFieldMessage(state, "code");
	const versionError = actionFieldMessage(state, "expectedVersion");
	const showFormError =
		!pending &&
		state?.ok === false &&
		movementError === undefined &&
		codeError === undefined &&
		versionError === undefined;

	return (
		<form
			action={formAction}
			aria-busy={pending}
			className="flex max-w-md flex-col gap-(--field-gap)"
		>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Reversal posted</AlertTitle>
					<AlertDescription>
						{state.data.movement.code} · reverses{" "}
						{state.data.movement.reversesMovementId}.
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<input
				type="hidden"
				name="idempotencyKey"
				value={idempotencyKey}
				readOnly
			/>
			<FormField
				label="Posted movement id"
				required
				fieldId="stock-reversal-movement"
				error={movementError}
			>
				<Input
					id="stock-reversal-movement"
					name="movementId"
					required
					autoComplete="off"
					disabled={pending}
					defaultValue={defaultMovementId ?? ""}
				/>
			</FormField>
			<FormField
				label="Reversal code"
				required
				fieldId="stock-reversal-code"
				error={codeError}
			>
				<Input
					id="stock-reversal-code"
					name="code"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Expected version"
				required
				fieldId="stock-reversal-version"
				error={versionError}
			>
				<Input
					id="stock-reversal-version"
					name="expectedVersion"
					type="number"
					min="1"
					required
					disabled={pending}
					defaultValue={
						defaultExpectedVersion !== undefined
							? String(defaultExpectedVersion)
							: undefined
					}
				/>
			</FormField>
			<Button type="submit" disabled={pending}>
				{pending ? <Spinner /> : null}
				Create reversal movement
			</Button>
		</form>
	);
}
