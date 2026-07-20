"use client";

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

import {
	type ActionResult,
	actionFieldMessage,
} from "@/modules/platform/schemas/action-result";

type ReservationLifecycleActionState = ActionResult<{
	reservation: StockReservation;
}> | null;

type ReservationLifecycleFormProps = {
	canRelease: boolean;
	unavailableTitle: string;
	unavailableBody: string;
	successTitle: string;
	successDetail: (reservation: StockReservation) => string;
	submitLabel: string;
	fieldIdPrefix: string;
	idempotencyPrefix: string;
	defaultReservationId?: string;
	defaultExpectedVersion?: number;
	action: (
		prev: ReservationLifecycleActionState,
		formData: FormData,
	) => Promise<ReservationLifecycleActionState>;
};

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
				type="hidden"
				name="idempotencyKey"
				value={idempotencyKey}
				readOnly
			/>
			<FormField
				label="Reservation id"
				required
				fieldId={reservationIdField}
				error={reservationError}
			>
				<Input
					id={reservationIdField}
					name="reservationId"
					required
					autoComplete="off"
					disabled={pending}
					defaultValue={defaultReservationId ?? ""}
				/>
			</FormField>
			<FormField
				label="Expected reservation version"
				required
				fieldId={versionField}
				error={versionError}
			>
				<Input
					id={versionField}
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
				{submitLabel}
			</Button>
		</form>
	);
}
