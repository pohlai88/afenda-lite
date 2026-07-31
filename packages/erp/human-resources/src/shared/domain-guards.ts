import { errorResult, type Result } from "@afenda/errors";

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

export function alreadyInStatus(
	_entity: string,
	_status: string,
): Result<never> {
	return errorResult.fail("BAD_REQUEST", {
		publicMessage: "The request is invalid",
		internalContext: humanResourcesErrorDetails(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		),
	});
}

export function cannotTransition(
	_entity: string,
	_current: string,
	_next: string,
): Result<never> {
	return errorResult.fail("BAD_REQUEST", {
		publicMessage: "The request is invalid",
		internalContext: humanResourcesErrorDetails(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		),
	});
}

import type { EmploymentStatus, PositionStatus } from "./employment-status";
import { assertValidDateRange } from "./employment-status";

export function notFound(
	_message: string,
	code:
		| typeof HUMAN_RESOURCES_ERROR_NOT_FOUND
		| typeof HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE = HUMAN_RESOURCES_ERROR_NOT_FOUND,
): Result<never> {
	return errorResult.fail("NOT_FOUND", {
		publicMessage: "The requested resource was not found",
		internalContext: humanResourcesErrorDetails(code),
	});
}

export function conflict(_message: string): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "The request conflicts with current state",
		internalContext: humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
	});
}

export function staleVersion(_message: string): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "The request conflicts with current state",
		internalContext: humanResourcesErrorDetails(
			HUMAN_RESOURCES_ERROR_STALE_VERSION,
		),
	});
}

export function invalidInput(_message: string): Result<never> {
	return errorResult.fail("BAD_REQUEST", {
		publicMessage: "The request is invalid",
		internalContext: humanResourcesErrorDetails(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		),
	});
}

export function effectiveRangeOverlap(_message: string): Result<never> {
	return errorResult.fail("BAD_REQUEST", {
		publicMessage: "The request is invalid",
		internalContext: humanResourcesErrorDetails(
			HUMAN_RESOURCES_ERROR_EFFECTIVE_RANGE_OVERLAP,
		),
	});
}

export function invalidState(_message: string): Result<never> {
	return errorResult.fail("BAD_REQUEST", {
		publicMessage: "The request is invalid",
		internalContext: humanResourcesErrorDetails(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		),
	});
}

export function rehireRequiresEndedEmployment(): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "The request conflicts with current state",
		internalContext: humanResourcesErrorDetails(
			HUMAN_RESOURCES_ERROR_REHIRE_REQUIRES_ENDED_EMPLOYMENT,
		),
	});
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
	return errorResult.ok(undefined);
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
		return errorResult.ok(closedOn);
	}

	const dateCheck = assertValidDateRange(input.startsOn, nextEndsOn);
	if (!dateCheck.ok) {
		return dateCheck;
	}
	return errorResult.ok(nextEndsOn ?? null);
}
