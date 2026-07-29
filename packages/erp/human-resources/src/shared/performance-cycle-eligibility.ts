import { fail, ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../error-codes";
import type { PerformanceCycleEligibility } from "../types";
import { tenureDaysOn } from "./benefit-guards";
import type { EmploymentStatus } from "./employment-status";

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
		return fail(
			"VALIDATION_ERROR",
			"Employment does not meet performance cycle eligibility criteria",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok(undefined);
}
