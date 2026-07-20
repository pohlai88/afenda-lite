"use client";

import { expireReservationAction } from "@/app/actions/expire-reservation";
import { ReservationLifecycleForm } from "@/features/inventory/reservation-lifecycle-form";

type ExpireReservationFormProps = {
	canRelease: boolean;
	defaultReservationId?: string;
	defaultExpectedVersion?: number;
};

export function ExpireReservationForm({
	canRelease,
	defaultReservationId,
	defaultExpectedVersion,
}: ExpireReservationFormProps) {
	return (
		<ReservationLifecycleForm
			canRelease={canRelease}
			unavailableTitle="Expire unavailable"
			unavailableBody="You can view inventory but cannot expire reservations in this organization."
			successTitle="Reservation expired"
			successDetail={(reservation) =>
				`${reservation.code} · ${reservation.status}.`
			}
			submitLabel="Expire reservation"
			fieldIdPrefix="stock-expire"
			idempotencyPrefix="expire"
			defaultReservationId={defaultReservationId}
			defaultExpectedVersion={defaultExpectedVersion}
			action={expireReservationAction}
		/>
	);
}
