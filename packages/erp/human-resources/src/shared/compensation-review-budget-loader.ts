import type { Result } from "@afenda/errors";

import type { HumanResourcesEmploymentId } from "../brands";
import type { CompensationReview, CompensationReviewCycle } from "../types";
import { assertCompensationReviewWithinBudget } from "./compensation-review-budget";
import { notFound } from "./domain-guards";
import { runSequential, sequentialReturn } from "./run-sequential";

export interface CompensationReviewBudgetDeps {
	getActiveBaseAmount: (
		employmentId: HumanResourcesEmploymentId,
	) => Promise<Result<string | null>>;
	getCycle: () => Promise<Result<CompensationReviewCycle | null>>;
	listCycleReviews: () => Promise<Result<CompensationReview[]>>;
}

export async function assertCompensationReviewBudgetForMutation(
	deps: CompensationReviewBudgetDeps,
	review: CompensationReview,
): Promise<Result<true>> {
	const cycleResult = await deps.getCycle();
	if (!cycleResult.ok) {
		return cycleResult;
	}
	if (cycleResult.data === null) {
		return notFound("Compensation review cycle not found");
	}

	const cycleReviewsResult = await deps.listCycleReviews();
	if (!cycleReviewsResult.ok) {
		return cycleReviewsResult;
	}

	const employmentIds = new Set<HumanResourcesEmploymentId>();
	employmentIds.add(review.employmentId);
	for (const other of cycleReviewsResult.data) {
		if (other.id !== review.id) {
			employmentIds.add(other.employmentId);
		}
	}

	const activeBaseByEmploymentId = new Map<string, string | null>();
	const sequentialOutcome1 = await runSequential(
		employmentIds,
		async (employmentId) => {
			const active = await deps.getActiveBaseAmount(employmentId);
			if (!active.ok) {
				return sequentialReturn(active);
			}
			activeBaseByEmploymentId.set(employmentId, active.data);
		},
	);
	if (sequentialOutcome1.kind === "return") {
		return sequentialOutcome1.value;
	}

	return assertCompensationReviewWithinBudget({
		cycle: cycleResult.data,
		review,
		otherCycleReviews: cycleReviewsResult.data,
		activeBaseByEmploymentId,
	});
}

export function listMemoryCompensationReviewsByCycle(
	reviews: Iterable<CompensationReview>,
	organizationId: string,
	cycleId: string,
): CompensationReview[] {
	return Array.from(reviews).filter(
		(review) =>
			review.organizationId === organizationId && review.cycleId === cycleId,
	);
}
