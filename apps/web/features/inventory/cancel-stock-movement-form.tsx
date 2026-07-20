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

type CancelStockMovementFormProps = {
	canCancel: boolean;
	defaultMovementId?: string;
	defaultExpectedVersion?: number;
};

export function CancelStockMovementForm({
	canCancel,
	defaultMovementId,
	defaultExpectedVersion,
}: CancelStockMovementFormProps) {
	const [state, formAction, pending] = useActionState(
		cancelStockMovementAction,
		initialState,
	);
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
				type="hidden"
				name="idempotencyKey"
				value={idempotencyKey}
				readOnly
			/>
			<FormField
				label="Movement id"
				required
				fieldId="stock-cancel-movement"
				error={movementError}
			>
				<Input
					id="stock-cancel-movement"
					name="movementId"
					required
					autoComplete="off"
					disabled={pending}
					defaultValue={defaultMovementId ?? ""}
				/>
			</FormField>
			<FormField
				label="Expected version"
				required
				fieldId="stock-cancel-version"
				error={versionError}
			>
				<Input
					id="stock-cancel-version"
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
				Cancel draft movement
			</Button>
		</form>
	);
}
