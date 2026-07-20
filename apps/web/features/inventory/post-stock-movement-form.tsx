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
	type PostStockMovementActionState,
	postStockMovementAction,
} from "@/app/actions/post-stock-movement";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: PostStockMovementActionState = null;

type PostStockMovementFormProps = {
	canManage: boolean;
};

/**
 * Post draft stock movement — applies ledger and balance effects.
 */
export function PostStockMovementForm({
	canManage,
}: PostStockMovementFormProps) {
	const [state, formAction, pending] = useActionState(
		postStockMovementAction,
		initialState,
	);

	if (!canManage) {
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
			<FormField
				label="Movement id"
				required
				fieldId="stock-post-movement"
				error={movementError}
			>
				<Input
					id="stock-post-movement"
					name="movementId"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Expected version"
				required
				fieldId="stock-post-version"
				error={versionError}
			>
				<Input
					id="stock-post-version"
					name="expectedVersion"
					type="number"
					min="1"
					required
					disabled={pending}
				/>
			</FormField>
			<Button type="submit" disabled={pending}>
				{pending ? <Spinner /> : null}
				Post movement
			</Button>
		</form>
	);
}
