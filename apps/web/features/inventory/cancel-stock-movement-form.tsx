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
	type CancelStockMovementActionState,
	cancelStockMovementAction,
} from "@/app/actions/cancel-stock-movement";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: CancelStockMovementActionState = null;

interface CancelStockMovementFormProps {
	canCancel: boolean;
	defaultExpectedVersion?: number | undefined;
	defaultMovementId?: string | undefined;
}

export function CancelStockMovementForm({
	canCancel,
	defaultMovementId,
	defaultExpectedVersion,
}: CancelStockMovementFormProps) {
	const [state, formAction, pending] = useActionState(
		cancelStockMovementAction,
		initialState,
	);
	// biome-ignore lint/correctness/useExhaustiveDependencies: Rotate the key after each completed action state.
	const idempotencyKey = useMemo(
		() => `cancel:${crypto.randomUUID()}`,
		[state],
	);

	if (!canCancel) {
		return (
			<Alert role="status">
				<AlertTitle>Cancel unavailable</AlertTitle>
				<AlertDescription>
					You can view inventory but cannot cancel draft movements in this
					organization.
				</AlertDescription>
			</Alert>
		);
	}

	const movementError = actionFieldMessage(state, "movementId");
	const versionError = actionFieldMessage(state, "expectedVersion");
	const showFormError =
		!pending &&
		state?.ok === false &&
		movementError === undefined &&
		versionError === undefined;

	return (
		<form
			action={formAction}
			aria-busy={pending}
			className="flex max-w-md flex-col gap-(--field-gap)"
		>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Movement cancelled</AlertTitle>
					<AlertDescription>
						{state.data.movement.code} · {state.data.movement.status}.
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
				fieldId="stock-cancel-movement"
				label="Movement id"
				required
			>
				<Input
					autoComplete="off"
					defaultValue={defaultMovementId ?? ""}
					disabled={pending}
					id="stock-cancel-movement"
					name="movementId"
					required
				/>
			</FormField>
			<FormField
				error={versionError}
				fieldId="stock-cancel-version"
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
					id="stock-cancel-version"
					min="1"
					name="expectedVersion"
					required
					type="number"
				/>
			</FormField>
			<Button disabled={pending} type="submit">
				{pending ? <Spinner /> : null}
				Cancel draft movement
			</Button>
		</form>
	);
}
