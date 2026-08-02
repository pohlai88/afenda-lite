import { errorResult, type Result } from "@afenda/errors";
import type {
	CompensationReview,
	CompensationReviewCycle,
} from "../../kernel/contracts";
import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import {
	addExactDecimals,
	compareExactDecimals,
	EXACT_DECIMAL_ZERO,
	type ExactDecimal,
	parseExactDecimal,
	subtractExactDecimals,
} from "../../kernel/numeric/exact-decimal";

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
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	const current =
		input.currentBaseAmount === null
			? EXACT_DECIMAL_ZERO
			: parseExactDecimal(input.currentBaseAmount);
	if (
		current === null ||
		compareExactDecimals(current, EXACT_DECIMAL_ZERO) < 0
	) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	const increase = subtractExactDecimals(proposed, current);
	return errorResult.ok(
		compareExactDecimals(increase, EXACT_DECIMAL_ZERO) > 0
			? increase
			: EXACT_DECIMAL_ZERO,
	);
}

function parseBudgetAmount(amount: string): Result<ExactDecimal> {
	const parsed = parseExactDecimal(amount);
	if (parsed === null || compareExactDecimals(parsed, EXACT_DECIMAL_ZERO) < 0) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	return errorResult.ok(parsed);
}

function computeCommittedCycleIncrease(input: {
	budgetCurrencyCode: string;
	excludedReviewId: string;
	otherCycleReviews: CompensationReview[];
	activeBaseByEmploymentId: Map<string, string | null>;
}): Result<ExactDecimal> {
	let committedIncrease = EXACT_DECIMAL_ZERO;
	for (const other of input.otherCycleReviews) {
		if (
			other.id === input.excludedReviewId ||
			(other.status !== "recorded" && other.status !== "finalized") ||
			!(other.proposedBaseAmount && other.proposedCurrencyCode)
		) {
			continue;
		}
		if (other.proposedCurrencyCode !== input.budgetCurrencyCode) {
			return errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "The submitted data is invalid",
				internalContext: humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_INVALID_INPUT,
				),
			});
		}
		const otherIncrease = computeCompensationIncreaseAmount({
			currentBaseAmount:
				input.activeBaseByEmploymentId.get(other.employmentId) ?? null,
			proposedBaseAmount: other.proposedBaseAmount,
		});
		if (!otherIncrease.ok) {
			return otherIncrease;
		}
		committedIncrease = addExactDecimals(committedIncrease, otherIncrease.data);
	}
	return errorResult.ok(committedIncrease);
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
	if (!(review.proposedBaseAmount && review.proposedCurrencyCode)) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	if (review.proposedCurrencyCode !== cycle.budgetCurrencyCode) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}

	const budgetTotal = parseBudgetAmount(cycle.budgetTotalAmount);
	if (!budgetTotal.ok) {
		return budgetTotal;
	}

	const currentBase =
		input.activeBaseByEmploymentId.get(review.employmentId) ?? null;
	const proposedIncrease = computeCompensationIncreaseAmount({
		currentBaseAmount: currentBase,
		proposedBaseAmount: review.proposedBaseAmount,
	});
	if (!proposedIncrease.ok) {
		return proposedIncrease;
	}

	const committedIncrease = computeCommittedCycleIncrease({
		budgetCurrencyCode: cycle.budgetCurrencyCode,
		excludedReviewId: review.id,
		otherCycleReviews: input.otherCycleReviews,
		activeBaseByEmploymentId: input.activeBaseByEmploymentId,
	});
	if (!committedIncrease.ok) {
		return committedIncrease;
	}

	const totalIncrease = addExactDecimals(
		committedIncrease.data,
		proposedIncrease.data,
	);
	if (compareExactDecimals(totalIncrease, budgetTotal.data) > 0) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}

	return errorResult.ok(true);
}
