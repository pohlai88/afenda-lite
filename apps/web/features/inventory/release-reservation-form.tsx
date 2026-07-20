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
	type ReleaseReservationActionState,
	releaseReservationAction,
} from "@/app/actions/release-reservation";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: ReleaseReservationActionState = null;

type ReleaseReservationFormProps = {
	canManage: boolean;
};

/**
 * Release active reservation — CAPABLE when `inventory.manage` is granted.
 */
export function ReleaseReservationForm({
	canManage,
}: ReleaseReservationFormProps) {
	const [state, formAction, pending] = useActionState(
		releaseReservationAction,
		initialState,
	);

	if (!canManage) {
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

	const codeError = actionFieldMessage(state, "code");
	const reservationError = actionFieldMessage(state, "reservationId");
	const versionError = actionFieldMessage(state, "expectedVersion");
	const showFormError =
		!pending &&
		state?.ok === false &&
		codeError === undefined &&
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
						{state.data.movement.code} · reservation_release posted.
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField
				label="Release movement code"
				required
				fieldId="stock-release-code"
				error={codeError}
			>
				<Input
					id="stock-release-code"
					name="code"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
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
