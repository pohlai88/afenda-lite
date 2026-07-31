"use client";

import type { Result as ActionResult } from "@afenda/errors";
import type { StockReservation } from "@afenda/inventory";
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
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

type ReservationLifecycleActionState = ActionResult<{
	reservation: StockReservation;
}> | null;

interface ReservationLifecycleFormProps {
	action: (
		prev: ReservationLifecycleActionState,
		formData: FormData,
	) => Promise<ReservationLifecycleActionState>;
	canRelease: boolean;
	defaultExpectedVersion?: number | undefined;
	defaultReservationId?: string | undefined;
	fieldIdPrefix: string;
	idempotencyPrefix: string;
	submitLabel: string;
	successDetail: (reservation: StockReservation) => string;
	successTitle: string;
	unavailableBody: string;
	unavailableTitle: string;
}

/**
 * Shared release / expire / cancel reservation form (action injected by kind).
 */
export function ReservationLifecycleForm({
	canRelease,
	unavailableTitle,
	unavailableBody,
	successTitle,
	successDetail,
	submitLabel,
	fieldIdPrefix,
	idempotencyPrefix,
	defaultReservationId,
	defaultExpectedVersion,
	action,
}: ReservationLifecycleFormProps) {
	const [state, formAction, pending] = useActionState(action, null);
	// biome-ignore lint/correctness/useExhaustiveDependencies: Rotate the key after each completed action state.
	const idempotencyKey = useMemo(
		() => `${idempotencyPrefix}:${crypto.randomUUID()}`,
		[state, idempotencyPrefix],
	);

	if (!canRelease) {
		return (
			<Alert role="status">
				<AlertTitle>{unavailableTitle}</AlertTitle>
				<AlertDescription>{unavailableBody}</AlertDescription>
			</Alert>
		);
	}

	const reservationError = actionFieldMessage(state, "reservationId");
	const versionError = actionFieldMessage(state, "expectedVersion");
	const showFormError =
		!pending &&
		state?.ok === false &&
		reservationError === undefined &&
		versionError === undefined;

	const reservationIdField = `${fieldIdPrefix}-reservation`;
	const versionField = `${fieldIdPrefix}-version`;

	return (
		<form
			action={formAction}
			aria-busy={pending}
			className="flex max-w-md flex-col gap-(--field-gap)"
		>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>{successTitle}</AlertTitle>
					<AlertDescription>
						{successDetail(state.data.reservation)}
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
				error={reservationError}
				fieldId={reservationIdField}
				label="Reservation id"
				required
			>
				<Input
					autoComplete="off"
					defaultValue={defaultReservationId ?? ""}
					disabled={pending}
					id={reservationIdField}
					name="reservationId"
					required
				/>
			</FormField>
			<FormField
				error={versionError}
				fieldId={versionField}
				label="Expected reservation version"
				required
			>
				<Input
					defaultValue={
						defaultExpectedVersion === undefined
							? undefined
							: String(defaultExpectedVersion)
					}
					disabled={pending}
					id={versionField}
					min="1"
					name="expectedVersion"
					required
					type="number"
				/>
			</FormField>
			<Button disabled={pending} type="submit">
				{pending ? <Spinner /> : null}
				{submitLabel}
			</Button>
		</form>
	);
}
