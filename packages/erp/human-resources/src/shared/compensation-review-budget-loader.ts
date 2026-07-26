import { ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesEmploymentId } from "../brands";
import { notFound } from "./domain-guards";
import type { CompensationReview, CompensationReviewCycle } from "../types";
import { assertCompensationReviewWithinBudget } from "./compensation-review-budget";

export type CompensationReviewBudgetDeps = {
	getCycle: () => Promise<Result<CompensationReviewCycle | null>>;
	listCycleReviews: () => Promise<Result<CompensationReview[]>>;
	getActiveBaseAmount: (
		employmentId: HumanResourcesEmploymentId,
	) => Promise<Result<string | null>>;
};

export async function assertCompensationReviewBudgetForMutation(
	deps: CompensationReviewBudgetDeps,
	review: CompensationReview,
): Promise<Result<true>> {
	const cycleResult = await deps.getCycle();
	if (!cycleResult.ok) return cycleResult;
	if (cycleResult.data === null) {
		return notFound("Compensation review cycle not found");
	}

	const cycleReviewsResult = await deps.listCycleReviews();
	if (!cycleReviewsResult.ok) return cycleReviewsResult;

	const employmentIds = new Set<HumanResourcesEmploymentId>();
	employmentIds.add(review.employmentId);
	for (const other of cycleReviewsResult.data) {
		if (other.id !== review.id) {
			employmentIds.add(other.employmentId);
		}
	}

	const activeBaseByEmploymentId = new Map<string, string | null>();
	for (const employmentId of employmentIds) {
		const active = await deps.getActiveBaseAmount(employmentId);
		if (!active.ok) return active;
		activeBaseByEmploymentId.set(employmentId, active.data);
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
