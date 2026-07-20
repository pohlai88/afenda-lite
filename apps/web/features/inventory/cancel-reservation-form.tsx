"use client";

import { cancelReservationAction } from "@/app/actions/cancel-reservation";
import { ReservationLifecycleForm } from "@/features/inventory/reservation-lifecycle-form";

type CancelReservationFormProps = {
	canRelease: boolean;
	defaultReservationId?: string;
	defaultExpectedVersion?: number;
};

export function CancelReservationForm({
	canRelease,
	defaultReservationId,
	defaultExpectedVersion,
}: CancelReservationFormProps) {
	return (
		<ReservationLifecycleForm
			canRelease={canRelease}
			unavailableTitle="Cancel unavailable"
			unavailableBody="You can view inventory but cannot cancel reservations in this organization."
			successTitle="Reservation cancelled"
			successDetail={(reservation) =>
				`${reservation.code} · ${reservation.status}.`
			}
			submitLabel="Cancel reservation"
			fieldIdPrefix="stock-cancel"
			idempotencyPrefix="cancel-rsv"
			defaultReservationId={defaultReservationId}
			defaultExpectedVersion={defaultExpectedVersion}
			action={cancelReservationAction}
		/>
	);
}
