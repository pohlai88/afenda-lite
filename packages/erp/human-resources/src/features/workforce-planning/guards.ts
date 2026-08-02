import { errorResult, type Result } from "@afenda/errors";

import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import type { HeadcountPlanStatus } from "./status";

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
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "The request is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			),
		});
	}
	return { ok: true, data: undefined };
}

export function assertValidHeadcountPeriod(
	periodStart: string,
	periodEnd: string,
): Result<void> {
	if (periodEnd < periodStart) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	return { ok: true, data: undefined };
}

export function assertNonNegativeCapacity(input: {
	plannedFte: string;
	plannedHeadcount: number;
}): Result<void> {
	const fte = Number(input.plannedFte);
	if (!Number.isFinite(fte) || fte < 0) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	if (input.plannedHeadcount < 0) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	if (fte === 0 && input.plannedHeadcount === 0) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
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
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	if (input.reservedHeadcount > input.availableHeadcount) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	return { ok: true, data: undefined };
}
