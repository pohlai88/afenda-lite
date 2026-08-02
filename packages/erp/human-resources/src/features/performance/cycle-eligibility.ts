import { errorResult, type Result } from "@afenda/errors";
import type { PerformanceCycleEligibility } from "../../kernel/contracts";
import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import { tenureDaysOn } from "../compensation-benefits/benefit-guards";
import type { EmploymentStatus } from "../workforce-records/employment/employment-status";

export function isEmploymentEligibleForPerformanceCycle(input: {
	eligibility: PerformanceCycleEligibility;
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

export function performanceCycleEligibilityAsOfDate(input: {
	cyclePeriodStart: string;
	eligibilityAsOfDate?: string | undefined;
}): string {
	return input.eligibilityAsOfDate ?? input.cyclePeriodStart;
}

export function assertEmploymentEligibleForPerformanceCycle(input: {
	eligibility: PerformanceCycleEligibility;
	employmentStatus: EmploymentStatus;
	employmentStartsOn: string;
	asOfDate: string;
}): Result<void> {
	const tenureDays = tenureDaysOn(input.employmentStartsOn, input.asOfDate);
	if (
		!isEmploymentEligibleForPerformanceCycle({
			eligibility: input.eligibility,
			employmentStatus: input.employmentStatus,
			tenureDays,
		})
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
