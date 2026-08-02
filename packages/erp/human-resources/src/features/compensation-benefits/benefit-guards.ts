import { errorResult, type Result } from "@afenda/errors";
import type { BenefitPlanEligibility } from "../../kernel/contracts";
import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import type { EmploymentStatus } from "../workforce-records/employment/employment-status";
import type { PayFrequency } from "./status";

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
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	return errorResult.ok(undefined);
}

function parseNonNegativeAmount(amount: string): Result<number> {
	const value = Number.parseFloat(amount);
	if (Number.isNaN(value) || value < 0) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	return errorResult.ok(value);
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
			return errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "The submitted data is invalid",
				internalContext: humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_INVALID_INPUT,
				),
			});
		}
		return errorResult.ok(undefined);
	}

	if (input.contributionCurrencyCode === null) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	if (input.contributionFrequency === null) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
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

	return errorResult.ok(undefined);
}
