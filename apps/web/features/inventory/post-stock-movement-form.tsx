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
	type PostStockMovementActionState,
	postStockMovementAction,
} from "@/app/actions/post-stock-movement";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: PostStockMovementActionState = null;

interface PostStockMovementFormProps {
	canPost: boolean;
	defaultExpectedVersion?: number | undefined;
	defaultMovementId?: string | undefined;
}

/**
 * Post draft stock movement — applies ledger and balance effects.
 */
export function PostStockMovementForm({
	canPost,
	defaultMovementId,
	defaultExpectedVersion,
}: PostStockMovementFormProps) {
	const [state, formAction, pending] = useActionState(
		postStockMovementAction,
		initialState,
	);
	// biome-ignore lint/correctness/useExhaustiveDependencies: Rotate the key after each completed action state.
	const idempotencyKey = useMemo(() => `post:${crypto.randomUUID()}`, [state]);

	if (!canPost) {
		return (
			<Alert role="status">
				<AlertTitle>Post unavailable</AlertTitle>
				<AlertDescription>
					You can view stock movements but cannot post them in this
					organization.
				</AlertDescription>
			</Alert>
		);
	}

	const movementError = actionFieldMessage(state, "movementId");
	const versionError = actionFieldMessage(state, "expectedVersion");
	const idempotencyError = actionFieldMessage(state, "idempotencyKey");
	const showFormError =
		!pending &&
		state?.ok === false &&
		movementError === undefined &&
		versionError === undefined &&
		idempotencyError === undefined;

	return (
		<form
			action={formAction}
			aria-busy={pending}
			className="flex max-w-md flex-col gap-(--field-gap)"
		>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Movement posted</AlertTitle>
					<AlertDescription>
						{state.data.movement.code} · {state.data.movement.movementType} ·{" "}
						{state.data.movement.lines.length} line(s).
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
				fieldId="stock-post-movement"
				label="Movement id"
				required
			>
				<Input
					autoComplete="off"
					defaultValue={defaultMovementId ?? ""}
					disabled={pending}
					id="stock-post-movement"
					name="movementId"
					required
				/>
			</FormField>
			<FormField
				error={versionError}
				fieldId="stock-post-version"
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
					id="stock-post-version"
					min="1"
					name="expectedVersion"
					required
					type="number"
				/>
			</FormField>
			<Button disabled={pending} type="submit">
				{pending ? <Spinner /> : null}
				Post movement
			</Button>
		</form>
	);
}
