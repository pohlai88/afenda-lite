import type { Change } from "@afenda/audit";

import type { CompensationReview } from "../../kernel/contracts";

export function compensationReviewAuditSnapshot(
	review: CompensationReview,
): Record<string, unknown> {
	return {
		id: review.id,
		cycleId: review.cycleId,
		employeeId: review.employeeId,
		employmentId: review.employmentId,
		status: review.status,
		proposedBaseAmount: review.proposedBaseAmount,
		proposedCurrencyCode: review.proposedCurrencyCode,
		proposedGradeId: review.proposedGradeId,
		proposedSalaryBandId: review.proposedSalaryBandId,
		effectiveFrom: review.effectiveFrom,
		appliedCompensationId: review.appliedCompensationId,
		version: review.version,
	};
}

export function compensationReviewCycleAuditSnapshot(cycle: {
	id: string;
	code: string;
	name: string;
	periodStart: string;
	periodEnd: string;
	status: string;
	budgetTotalAmount: string;
	budgetCurrencyCode: string;
	version: number;
}): Record<string, unknown> {
	return {
		id: cycle.id,
		code: cycle.code,
		name: cycle.name,
		periodStart: cycle.periodStart,
		periodEnd: cycle.periodEnd,
		status: cycle.status,
		budgetTotalAmount: cycle.budgetTotalAmount,
		budgetCurrencyCode: cycle.budgetCurrencyCode,
		version: cycle.version,
	};
}

export function statusChange(
	field: string,
	oldValue: string,
	newValue: string,
): Change {
	return { field, oldValue, newValue };
}
