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
	type ReleaseReservationActionState,
	releaseReservationAction,
} from "@/app/actions/release-reservation";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: ReleaseReservationActionState = null;

type ReleaseReservationFormProps = {
	canRelease: boolean;
};

/**
 * Release active reservation — returns the released `StockReservation`.
 */
export function ReleaseReservationForm({
	canRelease,
}: ReleaseReservationFormProps) {
	const [state, formAction, pending] = useActionState(
		releaseReservationAction,
		initialState,
	);
	const idempotencyKey = useMemo(
		() => `release:${crypto.randomUUID()}`,
		[state],
	);

	if (!canRelease) {
		return (
			<Alert role="status">
				<AlertTitle>Release unavailable</AlertTitle>
				<AlertDescription>
					You can view inventory but cannot release reservations in this
					organization.
				</AlertDescription>
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

	return (
		<form
			action={formAction}
			aria-busy={pending}
			className="flex max-w-md flex-col gap-(--field-gap)"
		>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Reservation released</AlertTitle>
					<AlertDescription>
						{state.data.reservation.code} · {state.data.reservation.status} ·
						released.
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<input type="hidden" name="idempotencyKey" value={idempotencyKey} readOnly />
			<FormField
				label="Reservation id"
				required
				fieldId="stock-release-reservation"
				error={reservationError}
			>
				<Input
					id="stock-release-reservation"
					name="reservationId"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Expected reservation version"
				required
				fieldId="stock-release-version"
				error={versionError}
			>
				<Input
					id="stock-release-version"
					name="expectedVersion"
					type="number"
					min="1"
					required
					disabled={pending}
				/>
			</FormField>
			<Button type="submit" disabled={pending}>
				{pending ? <Spinner /> : null}
				Release reservation
			</Button>
		</form>
	);
}
