import { fail, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	humanResourcesErrorDetails,
} from "../error-codes";
import type { HeadcountPlanStatus } from "./workforce-planning-status";

const PLAN_TRANSITIONS: Record<
	HeadcountPlanStatus,
	readonly HeadcountPlanStatus[]
> = {
	draft: ["submitted", "rejected", "closed"],
	submitted: ["approved", "rejected", "draft"],
	approved: ["superseded", "closed"],
	rejected: [],
	superseded: [],
	closed: [],
};

export function assertHeadcountPlanStatusTransition(
	from: HeadcountPlanStatus,
	to: HeadcountPlanStatus,
): Result<void> {
	if (!PLAN_TRANSITIONS[from].includes(to)) {
		return fail(
			"BAD_REQUEST",
			`Cannot transition headcount plan from ${from} to ${to}.`,
			humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			),
		);
	}
	return { ok: true, data: undefined };
}

export function assertValidHeadcountPeriod(
	periodStart: string,
	periodEnd: string,
): Result<void> {
	if (periodEnd < periodStart) {
		return fail(
			"VALIDATION_ERROR",
			"Plan period end must be on or after period start.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return { ok: true, data: undefined };
}

export function assertNonNegativeCapacity(input: {
	plannedFte: string;
	plannedHeadcount: number;
}): Result<void> {
	const fte = Number(input.plannedFte);
	if (!Number.isFinite(fte) || fte < 0) {
		return fail(
			"VALIDATION_ERROR",
			"Planned FTE cannot be negative.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	if (input.plannedHeadcount < 0) {
		return fail(
			"VALIDATION_ERROR",
			"Planned headcount cannot be negative.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	if (fte === 0 && input.plannedHeadcount === 0) {
		return fail(
			"VALIDATION_ERROR",
			"At least one of planned FTE or planned headcount must be positive.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return { ok: true, data: undefined };
}

export function assertReservationWithinAvailability(input: {
	availableFte: string;
	availableHeadcount: number;
	reservedFte: string;
	reservedHeadcount: number;
}): Result<void> {
	const availFte = Number(input.availableFte);
	const reserveFte = Number(input.reservedFte);
	if (reserveFte > availFte + 1e-9) {
		return fail(
			"VALIDATION_ERROR",
			"Reservation exceeds available FTE capacity.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	if (input.reservedHeadcount > input.availableHeadcount) {
		return fail(
			"VALIDATION_ERROR",
			"Reservation exceeds available headcount capacity.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return { ok: true, data: undefined };
}
