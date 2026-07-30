// biome-ignore-all lint/performance/noJsxPropsBind: The enabled React Compiler stabilizes JSX callback props.
"use client";

import { cancelReservationAction } from "@/app/actions/cancel-reservation";
import { ReservationLifecycleForm } from "@/features/inventory/reservation-lifecycle-form";

interface CancelReservationFormProps {
	canRelease: boolean;
	defaultExpectedVersion?: number | undefined;
	defaultReservationId?: string | undefined;
}

export function CancelReservationForm({
	canRelease,
	defaultReservationId,
	defaultExpectedVersion,
}: CancelReservationFormProps) {
	return (
		<ReservationLifecycleForm
			action={cancelReservationAction}
			canRelease={canRelease}
			defaultExpectedVersion={defaultExpectedVersion}
			defaultReservationId={defaultReservationId}
			fieldIdPrefix="stock-cancel"
			idempotencyPrefix="cancel-rsv"
			submitLabel="Cancel reservation"
			successDetail={(reservation) =>
				`${reservation.code} · ${reservation.status}.`
			}
			successTitle="Reservation cancelled"
			unavailableBody="You can view inventory but cannot cancel reservations in this organization."
			unavailableTitle="Cancel unavailable"
		/>
	);
}
