import { fail, ok, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../error-codes";
import type { CompensationReview, CompensationReviewCycle } from "../types";
import {
	addExactDecimals,
	compareExactDecimals,
	EXACT_DECIMAL_ZERO,
	type ExactDecimal,
	parseExactDecimal,
	subtractExactDecimals,
} from "./exact-decimal";

/**
 * Cycle-pool increase model: each review consumes budget equal to the
 * non-negative delta between proposed base and current active base.
 * When no active compensation exists, the full proposed base counts toward budget.
 */
export function computeCompensationIncreaseAmount(input: {
	currentBaseAmount: string | null;
	proposedBaseAmount: string;
}): Result<ExactDecimal> {
	const proposed = parseExactDecimal(input.proposedBaseAmount);
	if (
		proposed === null ||
		compareExactDecimals(proposed, EXACT_DECIMAL_ZERO) < 0
	) {
		return fail(
			"VALIDATION_ERROR",
			"Invalid proposed compensation amount.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	const current =
		input.currentBaseAmount === null
			? EXACT_DECIMAL_ZERO
			: parseExactDecimal(input.currentBaseAmount);
	if (
		current === null ||
		compareExactDecimals(current, EXACT_DECIMAL_ZERO) < 0
	) {
		return fail(
			"VALIDATION_ERROR",
			"Invalid current compensation amount.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	const increase = subtractExactDecimals(proposed, current);
	return ok(
		compareExactDecimals(increase, EXACT_DECIMAL_ZERO) > 0
			? increase
			: EXACT_DECIMAL_ZERO,
	);
}

function parseBudgetAmount(amount: string): Result<ExactDecimal> {
	const parsed = parseExactDecimal(amount);
	if (parsed === null || compareExactDecimals(parsed, EXACT_DECIMAL_ZERO) < 0) {
		return fail(
			"VALIDATION_ERROR",
			"Invalid review cycle budget amount.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok(parsed);
}

export function assertCompensationReviewWithinBudget(input: {
	cycle: Pick<
		CompensationReviewCycle,
		"budgetTotalAmount" | "budgetCurrencyCode"
	>;
	review: Pick<
		CompensationReview,
		| "id"
		| "employmentId"
		| "proposedBaseAmount"
		| "proposedCurrencyCode"
		| "status"
	>;
	otherCycleReviews: CompensationReview[];
	activeBaseByEmploymentId: Map<string, string | null>;
}): Result<true> {
	const { cycle, review } = input;
	if (!review.proposedBaseAmount || !review.proposedCurrencyCode) {
		return fail(
			"VALIDATION_ERROR",
			"Review must include proposed amount and currency for budget check.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	if (review.proposedCurrencyCode !== cycle.budgetCurrencyCode) {
		return fail(
			"VALIDATION_ERROR",
			"Proposed currency must match review cycle budget currency.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}

	const budgetTotal = parseBudgetAmount(cycle.budgetTotalAmount);
	if (!budgetTotal.ok) return budgetTotal;

	const currentBase =
		input.activeBaseByEmploymentId.get(review.employmentId) ?? null;
	const proposedIncrease = computeCompensationIncreaseAmount({
		currentBaseAmount: currentBase,
		proposedBaseAmount: review.proposedBaseAmount,
	});
	if (!proposedIncrease.ok) return proposedIncrease;

	let committedIncrease = EXACT_DECIMAL_ZERO;
	for (const other of input.otherCycleReviews) {
		if (other.id === review.id) continue;
		if (other.status !== "recorded" && other.status !== "finalized") continue;
		if (!other.proposedBaseAmount || !other.proposedCurrencyCode) continue;
		if (other.proposedCurrencyCode !== cycle.budgetCurrencyCode) {
			return fail(
				"VALIDATION_ERROR",
				"Another review in this cycle uses a different currency than the cycle budget.",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
			);
		}
		const otherCurrentBase =
			input.activeBaseByEmploymentId.get(other.employmentId) ?? null;
		const otherIncrease = computeCompensationIncreaseAmount({
			currentBaseAmount: otherCurrentBase,
			proposedBaseAmount: other.proposedBaseAmount,
		});
		if (!otherIncrease.ok) return otherIncrease;
		committedIncrease = addExactDecimals(committedIncrease, otherIncrease.data);
	}

	const totalIncrease = addExactDecimals(
		committedIncrease,
		proposedIncrease.data,
	);
	if (compareExactDecimals(totalIncrease, budgetTotal.data) > 0) {
		return fail(
			"VALIDATION_ERROR",
			"Compensation recommendation exceeds review cycle budget.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}

	return ok(true);
}
