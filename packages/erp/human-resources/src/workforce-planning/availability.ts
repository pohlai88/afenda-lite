import type {
	HeadcountLineAvailability,
	HeadcountPlanLine,
	HeadcountReservation,
} from "../types";

export type { HeadcountLineAvailability };

function sumReservations(
	reservations: HeadcountReservation[],
	status: HeadcountReservation["status"],
): { fte: number; headcount: number } {
	let fte = 0;
	let headcount = 0;
	for (const reservation of reservations) {
		if (reservation.status !== status) {
			continue;
		}
		fte += Number(reservation.reservedFte);
		headcount += reservation.reservedHeadcount;
	}
	return { fte, headcount };
}

export function computeLineAvailability(input: {
	line: HeadcountPlanLine;
	reservations: HeadcountReservation[];
}): HeadcountLineAvailability {
	const active = sumReservations(input.reservations, "active");
	const consumed = sumReservations(input.reservations, "consumed");
	const plannedFte = Number(input.line.plannedFte);
	const availableFte = Math.max(0, plannedFte - active.fte - consumed.fte);
	const availableHeadcount = Math.max(
		0,
		input.line.plannedHeadcount - active.headcount - consumed.headcount,
	);
	return {
		planLineId: input.line.id,
		plannedFte: input.line.plannedFte,
		plannedHeadcount: input.line.plannedHeadcount,
		reservedFte: active.fte.toFixed(4),
		reservedHeadcount: active.headcount,
		consumedFte: consumed.fte.toFixed(4),
		consumedHeadcount: consumed.headcount,
		availableFte: availableFte.toFixed(4),
		availableHeadcount,
	};
}
