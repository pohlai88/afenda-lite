import { fail, ok, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	type HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_EFFECTIVE_RANGE_OVERLAP,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	HUMAN_RESOURCES_ERROR_REHIRE_REQUIRES_ENDED_EMPLOYMENT,
	HUMAN_RESOURCES_ERROR_STALE_VERSION,
	humanResourcesErrorDetails,
} from "../error-codes";

export function alreadyInStatus(entity: string, status: string): Result<never> {
	return fail(
		"BAD_REQUEST",
		`${entity} is already in status '${status}'`,
		humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION),
	);
}

export function cannotTransition(
	entity: string,
	current: string,
	next: string,
): Result<never> {
	return fail(
		"BAD_REQUEST",
		`Cannot transition ${entity} from '${current}' to '${next}'`,
		humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION),
	);
}

import type { EmploymentStatus, PositionStatus } from "./employment-status";
import { assertValidDateRange } from "./employment-status";

export function notFound(
	message: string,
	code:
		| typeof HUMAN_RESOURCES_ERROR_NOT_FOUND
		| typeof HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE = HUMAN_RESOURCES_ERROR_NOT_FOUND,
): Result<never> {
	return fail("NOT_FOUND", message, humanResourcesErrorDetails(code));
}

export function conflict(message: string): Result<never> {
	return fail(
		"CONFLICT",
		message,
		humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
	);
}

export function staleVersion(message: string): Result<never> {
	return fail(
		"CONFLICT",
		message,
		humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_STALE_VERSION),
	);
}

export function invalidInput(message: string): Result<never> {
	return fail(
		"BAD_REQUEST",
		message,
		humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
	);
}

export function effectiveRangeOverlap(message: string): Result<never> {
	return fail(
		"BAD_REQUEST",
		message,
		humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_EFFECTIVE_RANGE_OVERLAP),
	);
}

export function invalidState(message: string): Result<never> {
	return fail(
		"BAD_REQUEST",
		message,
		humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION),
	);
}

export function rehireRequiresEndedEmployment(): Result<never> {
	return fail(
		"CONFLICT",
		"Employee already has an open employment",
		humanResourcesErrorDetails(
			HUMAN_RESOURCES_ERROR_REHIRE_REQUIRES_ENDED_EMPLOYMENT,
		),
	);
}

/** After optimistic UPDATE returns zero rows, distinguish missing vs stale. */
export function missAfterOptimisticUpdate(input: {
	found: boolean;
	entityLabel: string;
}): Result<never> {
	if (!input.found) {
		return notFound(`${input.entityLabel} not found`);
	}
	return staleVersion(`${input.entityLabel} version is stale`);
}

export function assertActivePosition(status: PositionStatus): Result<void> {
	if (status !== "active") {
		return invalidState("Position is not active");
	}
	return ok(undefined);
}

/**
 * Resolve endsOn for employment amend.
 * Status `terminated` always yields a non-null endsOn (caller value, prior value, or startsOn)
 * so the open unique index on `ends_on IS NULL` is cleared.
 */
export function resolveAmendEndsOn(input: {
	nextStatus: EmploymentStatus | undefined;
	startsOn: string;
	endsOn: string | null | undefined;
	previousEndsOn: string | null;
}): Result<string | null> {
	const nextEndsOn =
		input.endsOn === undefined ? input.previousEndsOn : input.endsOn;

	if (input.nextStatus === "terminated") {
		const closedOn = nextEndsOn ?? input.startsOn;
		const dateCheck = assertValidDateRange(input.startsOn, closedOn);
		if (!dateCheck.ok) {
			return dateCheck;
		}
		return ok(closedOn);
	}

	const dateCheck = assertValidDateRange(input.startsOn, nextEndsOn);
	if (!dateCheck.ok) {
		return dateCheck;
	}
	return ok(nextEndsOn ?? null);
}
