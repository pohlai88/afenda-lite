import { fail, ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../error-codes";
import type { BenefitPlanEligibility } from "../types";
import type { PayFrequency } from "./compensation-status";
import type { EmploymentStatus } from "./employment-status";

export function tenureDaysOn(startsOn: string, asOfDate: string): number {
	const startMs = Date.parse(`${startsOn}T00:00:00.000Z`);
	const asOfMs = Date.parse(`${asOfDate}T00:00:00.000Z`);
	return Math.floor((asOfMs - startMs) / (1000 * 60 * 60 * 24));
}

export function isEmployeeEligibleForBenefitPlan(input: {
	eligibility: BenefitPlanEligibility;
	employmentStatus: EmploymentStatus;
	tenureDays: number;
}): boolean {
	if (
		!input.eligibility.allowedEmploymentStatuses.includes(
			input.employmentStatus,
		)
	) {
		return false;
	}
	if (
		input.eligibility.minTenureDays !== null &&
		input.tenureDays < input.eligibility.minTenureDays
	) {
		return false;
	}
	return true;
}

export function assertEffectiveRange(input: {
	effectiveFrom: string;
	effectiveTo: string | null;
}): Result<void> {
	if (input.effectiveTo !== null && input.effectiveTo < input.effectiveFrom) {
		return fail(
			"VALIDATION_ERROR",
			"Effective end date must be on or after effective start date.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok(undefined);
}

function parseNonNegativeAmount(amount: string): Result<number> {
	const value = Number.parseFloat(amount);
	if (Number.isNaN(value) || value < 0) {
		return fail(
			"VALIDATION_ERROR",
			"Contribution amounts must be non-negative decimal values.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok(value);
}

export function assertBenefitContributionFacts(input: {
	employeeContributionAmount: string | null;
	employerContributionAmount: string | null;
	contributionCurrencyCode: string | null;
	contributionFrequency: PayFrequency | null;
}): Result<void> {
	const hasEmployeeAmount = input.employeeContributionAmount !== null;
	const hasEmployerAmount = input.employerContributionAmount !== null;
	const hasContribution = hasEmployeeAmount || hasEmployerAmount;

	if (!hasContribution) {
		if (
			input.contributionCurrencyCode !== null ||
			input.contributionFrequency !== null
		) {
			return fail(
				"VALIDATION_ERROR",
				"Contribution currency and frequency require contribution amounts.",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
			);
		}
		return ok(undefined);
	}

	if (input.contributionCurrencyCode === null) {
		return fail(
			"VALIDATION_ERROR",
			"Contribution currency is required when contribution amounts are set.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	if (input.contributionFrequency === null) {
		return fail(
			"VALIDATION_ERROR",
			"Contribution frequency is required when contribution amounts are set.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}

	if (hasEmployeeAmount && input.employeeContributionAmount !== null) {
		const parsed = parseNonNegativeAmount(input.employeeContributionAmount);
		if (!parsed.ok) {
			return parsed;
		}
	}
	if (hasEmployerAmount && input.employerContributionAmount !== null) {
		const parsed = parseNonNegativeAmount(input.employerContributionAmount);
		if (!parsed.ok) {
			return parsed;
		}
	}

	return ok(undefined);
}
