import { fail, ok, type Result } from "@afenda/errors/result";
import { z } from "zod";

import {
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	humanResourcesErrorDetails,
} from "../error-codes";

export const EMPLOYMENT_STATUSES = ["active", "notice", "terminated"] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

export const POSITION_STATUSES = ["active", "inactive"] as const;
export type PositionStatus = (typeof POSITION_STATUSES)[number];

export const employmentStatusSchema = z.enum(EMPLOYMENT_STATUSES);
export const positionStatusSchema = z.enum(POSITION_STATUSES);

/**
 * Employment status transition table:
 * - active → notice | terminated
 * - notice → terminated
 * - terminated → (terminal state — no transitions)
 */
export function canTransitionEmploymentStatus(
	current: EmploymentStatus,
	next: EmploymentStatus,
): boolean {
	if (current === "active" && (next === "notice" || next === "terminated")) {
		return true;
	}
	if (current === "notice" && next === "terminated") {
		return true;
	}
	return false;
}

export function assertEmploymentStatusTransition(
	current: EmploymentStatus,
	next: EmploymentStatus,
): Result<void> {
	if (current === next) {
		return fail(
			"BAD_REQUEST",
			`Employment is already in status '${next}'`,
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION),
		);
	}
	if (!canTransitionEmploymentStatus(current, next)) {
		return fail(
			"BAD_REQUEST",
			`Cannot transition employment from '${current}' to '${next}'`,
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION),
		);
	}
	return ok(undefined);
}

/**
 * Validates date range: endsOn >= startsOn when endsOn is set.
 */
export function assertValidDateRange(
	startsOn: string,
	endsOn: string | null | undefined,
): Result<void> {
	if (endsOn !== null && endsOn !== undefined && endsOn < startsOn) {
		return fail(
			"BAD_REQUEST",
			"End date must be on or after start date",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION),
		);
	}
	return ok(undefined);
}
