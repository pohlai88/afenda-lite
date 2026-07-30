// biome-ignore-all lint/performance/noJsxPropsBind: The enabled React Compiler stabilizes JSX callback props.
"use client";

import { releaseReservationAction } from "@/app/actions/release-reservation";
import { ReservationLifecycleForm } from "@/features/inventory/reservation-lifecycle-form";

interface ReleaseReservationFormProps {
	canRelease: boolean;
	defaultExpectedVersion?: number | undefined;
	defaultReservationId?: string | undefined;
}

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
			action={releaseReservationAction}
			canRelease={canRelease}
			defaultExpectedVersion={defaultExpectedVersion}
			defaultReservationId={defaultReservationId}
			fieldIdPrefix="stock-release"
			idempotencyPrefix="release"
			submitLabel="Release reservation"
			successDetail={(reservation) =>
				`${reservation.code} · ${reservation.status} · released.`
			}
			successTitle="Reservation released"
			unavailableBody="You can view inventory but cannot release reservations in this organization."
			unavailableTitle="Release unavailable"
		/>
	);
}
