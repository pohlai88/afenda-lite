// biome-ignore-all lint/performance/noJsxPropsBind: The enabled React Compiler stabilizes JSX callback props.
"use client";

import { expireReservationAction } from "@/app/actions/expire-reservation";
import { ReservationLifecycleForm } from "@/features/inventory/reservation-lifecycle-form";

interface ExpireReservationFormProps {
	canRelease: boolean;
	defaultExpectedVersion?: number | undefined;
	defaultReservationId?: string | undefined;
}

export function ExpireReservationForm({
	canRelease,
	defaultReservationId,
	defaultExpectedVersion,
}: ExpireReservationFormProps) {
	return (
		<ReservationLifecycleForm
			action={expireReservationAction}
			canRelease={canRelease}
			defaultExpectedVersion={defaultExpectedVersion}
			defaultReservationId={defaultReservationId}
			fieldIdPrefix="stock-expire"
			idempotencyPrefix="expire"
			submitLabel="Expire reservation"
			successDetail={(reservation) =>
				`${reservation.code} · ${reservation.status}.`
			}
			successTitle="Reservation expired"
			unavailableBody="You can view inventory but cannot expire reservations in this organization."
			unavailableTitle="Expire unavailable"
		/>
	);
}
