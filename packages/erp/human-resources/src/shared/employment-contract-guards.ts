import { fail, ok, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../error-codes";
import { datesOverlap } from "./organization-guards";

export type EmploymentContractLineageStatus = "active" | "superseded";

export function assertNoEmploymentContractOverlap(input: {
	candidateContractId?: string;
	candidateStartsOn: string;
	candidateEndsOn: string | null;
	existing: readonly {
		id: string;
		startsOn: string;
		endsOn: string | null;
	}[];
}): Result<void> {
	for (const contract of input.existing) {
		if (contract.id === input.candidateContractId) {
			continue;
		}
		if (
			datesOverlap({
				startsOnA: input.candidateStartsOn,
				endsOnA: input.candidateEndsOn,
				startsOnB: contract.startsOn,
				endsOnB: contract.endsOn,
			})
		) {
			return fail(
				"CONFLICT",
				"Contract date range overlaps an existing active contract for this employment",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
			);
		}
	}
	return ok(undefined);
}

export function assertContractWithinEmployment(input: {
	contractStartsOn: string;
	contractEndsOn: string | null;
	employmentStartsOn: string;
	employmentEndsOn: string | null;
}): Result<void> {
	if (input.contractStartsOn < input.employmentStartsOn) {
		return fail(
			"VALIDATION_ERROR",
			"Contract start date precedes employment start date",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	if (input.employmentEndsOn !== null) {
		if (input.contractEndsOn === null) {
			return fail(
				"VALIDATION_ERROR",
				"Open-ended contract exceeds employment tenure",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
			);
		}
		if (input.contractEndsOn > input.employmentEndsOn) {
			return fail(
				"VALIDATION_ERROR",
				"Contract end date exceeds employment end date",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
			);
		}
	}
	return ok(undefined);
}

export function assertEmploymentContractMutable(input: {
	lineageStatus: EmploymentContractLineageStatus;
}): Result<void> {
	if (input.lineageStatus === "superseded") {
		return fail(
			"CONFLICT",
			"Superseded contracts cannot be modified",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
		);
	}
	return ok(undefined);
}

export function compareEmploymentContractsByLineage(
	left: { startsOn: string; id: string },
	right: { startsOn: string; id: string },
): number {
	const byStart = left.startsOn.localeCompare(right.startsOn);
	if (byStart !== 0) {
		return byStart;
	}
	return left.id.localeCompare(right.id);
}
