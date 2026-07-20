"use client";

import { releaseReservationAction } from "@/app/actions/release-reservation";
import { ReservationLifecycleForm } from "@/features/inventory/reservation-lifecycle-form";

type ReleaseReservationFormProps = {
	canRelease: boolean;
	defaultReservationId?: string;
	defaultExpectedVersion?: number;
};

/**
 * Release active reservation — returns the released `StockReservation`.
 */
export function ReleaseReservationForm({
	canRelease,
	defaultReservationId,
	defaultExpectedVersion,
}: ReleaseReservationFormProps) {
	return (
		<ReservationLifecycleForm
			canRelease={canRelease}
			unavailableTitle="Release unavailable"
			unavailableBody="You can view inventory but cannot release reservations in this organization."
			successTitle="Reservation released"
			successDetail={(reservation) =>
				`${reservation.code} · ${reservation.status} · released.`
			}
			submitLabel="Release reservation"
			fieldIdPrefix="stock-release"
			idempotencyPrefix="release"
			defaultReservationId={defaultReservationId}
			defaultExpectedVersion={defaultExpectedVersion}
			action={releaseReservationAction}
		/>
	);
}
