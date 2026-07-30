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

interface CreateReversalMovementFormProps {
	canPost: boolean;
	defaultExpectedVersion?: number | undefined;
	defaultMovementId?: string | undefined;
}

export function CreateReversalMovementForm({
	canPost,
	defaultMovementId,
	defaultExpectedVersion,
}: CreateReversalMovementFormProps) {
	const [state, formAction, pending] = useActionState(
		createReversalMovementAction,
		initialState,
	);
	// biome-ignore lint/correctness/useExhaustiveDependencies: Rotate the key after each completed action state.
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
				name="idempotencyKey"
				readOnly
				type="hidden"
				value={idempotencyKey}
			/>
			<FormField
				error={movementError}
				fieldId="stock-reversal-movement"
				label="Posted movement id"
				required
			>
				<Input
					autoComplete="off"
					defaultValue={defaultMovementId ?? ""}
					disabled={pending}
					id="stock-reversal-movement"
					name="movementId"
					required
				/>
			</FormField>
			<FormField
				error={codeError}
				fieldId="stock-reversal-code"
				label="Reversal code"
				required
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="stock-reversal-code"
					name="code"
					required
				/>
			</FormField>
			<FormField
				error={versionError}
				fieldId="stock-reversal-version"
				label="Expected version"
				required
			>
				<Input
					defaultValue={
						defaultExpectedVersion === undefined
							? undefined
							: String(defaultExpectedVersion)
					}
					disabled={pending}
					id="stock-reversal-version"
					min="1"
					name="expectedVersion"
					required
					type="number"
				/>
			</FormField>
			<Button disabled={pending} type="submit">
				{pending ? <Spinner /> : null}
				Create reversal movement
			</Button>
		</form>
	);
}
