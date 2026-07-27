import { expect } from "vitest";
import type { HumanResourcesCommandOptions } from "../../src/command-options";
import {
	createCompensationReviewCycle,
	openCompensationReviewCycle,
} from "../../src/compensation-benefits/compensation-review-cycle";
import type { CompensationReviewCycle } from "../../src/types";
import { resultFailureMessage } from "./result-details";

export async function seedOpenCompensationReviewCycle(input: {
	organizationId: string;
	actorUserId: string;
	ready: HumanResourcesCommandOptions;
	suffix?: string;
	budgetTotalAmount?: string;
	budgetCurrencyCode?: string;
}): Promise<CompensationReviewCycle> {
	const suffix = input.suffix ?? "default";
	const created = await createCompensationReviewCycle(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-review-cycle-create-${suffix}`,
			idempotencyKey: `idem-review-cycle-${suffix}`,
			code: `CYCLE-${suffix}`,
			name: `Review Cycle ${suffix}`,
			periodStart: "2025-01-01",
			periodEnd: "2025-12-31",
			budgetTotalAmount: input.budgetTotalAmount ?? "500000",
			budgetCurrencyCode: input.budgetCurrencyCode ?? "USD",
		},
		input.ready,
	);
	expect(created.ok, resultFailureMessage(created)).toBe(true);
	if (!created.ok) {
		throw new Error(resultFailureMessage(created));
	}

	const opened = await openCompensationReviewCycle(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-review-cycle-open-${suffix}`,
			cycleId: created.data.id,
			expectedVersion: created.data.version,
		},
		input.ready,
	);
	expect(opened.ok, resultFailureMessage(opened)).toBe(true);
	if (!opened.ok) {
		throw new Error(resultFailureMessage(opened));
	}

	return opened.data;
}
