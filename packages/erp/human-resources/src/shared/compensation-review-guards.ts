import { fail, ok, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	humanResourcesErrorDetails,
} from "../error-codes";
import type {
	CompensationReviewCycleStatus,
	CompensationReviewStatus,
} from "./compensation-status";
import { invalidInput, invalidState } from "./domain-guards";

function alreadyInStatus(entity: string, status: string): Result<never> {
	return fail(
		"BAD_REQUEST",
		`${entity} is already in status '${status}'`,
		humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION),
	);
}

function cannotTransition(
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

export function assertValidReviewCyclePeriod(input: {
	periodStart: string;
	periodEnd: string;
}): Result<true> {
	if (input.periodEnd < input.periodStart) {
		return invalidInput(
			"Review cycle period end must be on or after period start",
		);
	}
	return ok(true);
}

export function canTransitionReviewCycleStatus(
	current: CompensationReviewCycleStatus,
	next: CompensationReviewCycleStatus,
): boolean {
	if (current === next) {
		return false;
	}
	if (current === "draft" && (next === "open" || next === "cancelled")) {
		return true;
	}
	if (current === "open" && (next === "closed" || next === "cancelled")) {
		return true;
	}
	return false;
}

export function assertReviewCycleStatusTransition(
	current: CompensationReviewCycleStatus,
	next: CompensationReviewCycleStatus,
): Result<void> {
	if (current === next) {
		return alreadyInStatus("Compensation review cycle", next);
	}
	if (!canTransitionReviewCycleStatus(current, next)) {
		return cannotTransition("compensation review cycle", current, next);
	}
	return ok(undefined);
}

export function assertReviewCycleOpenForMutation(
	status: CompensationReviewCycleStatus,
): Result<void> {
	if (status !== "open") {
		return invalidState("Compensation review cycle is not open");
	}
	return ok(undefined);
}

export function canRecordCompensationRecommendation(
	status: CompensationReviewStatus,
): boolean {
	return status === "draft" || status === "recorded";
}

export function assertCanRecordCompensationRecommendation(
	status: CompensationReviewStatus,
): Result<void> {
	if (!canRecordCompensationRecommendation(status)) {
		return invalidState(
			"Compensation review must be in draft or recorded status to record a recommendation",
		);
	}
	return ok(undefined);
}

export function assertCanFinalizeCompensationReview(review: {
	status: CompensationReviewStatus;
	proposedBaseAmount: string | null;
	proposedCurrencyCode: string | null;
	effectiveFrom: string | null;
}): Result<void> {
	if (review.status !== "recorded") {
		return invalidState("Compensation review must be recorded before approval");
	}
	if (
		!(
			review.proposedBaseAmount &&
			review.proposedCurrencyCode &&
			review.effectiveFrom
		)
	) {
		return invalidState(
			"Review must have proposed amount, currency, and effective date before approval",
		);
	}
	return ok(undefined);
}
