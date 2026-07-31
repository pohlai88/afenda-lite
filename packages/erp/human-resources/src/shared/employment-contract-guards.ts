import { errorResult, type Result } from "@afenda/errors";

import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../error-codes";
import { datesOverlap } from "./organization-guards";

export type EmploymentContractLineageStatus = "active" | "superseded";

export function assertNoEmploymentContractOverlap(input: {
	candidateContractId?: string | undefined;
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
			return errorResult.fail("CONFLICT", {
				publicMessage: "The request conflicts with current state",
				internalContext: humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_CONFLICT,
				),
			});
		}
	}
	return errorResult.ok(undefined);
}

export function assertContractWithinEmployment(input: {
	contractStartsOn: string;
	contractEndsOn: string | null;
	employmentStartsOn: string;
	employmentEndsOn: string | null;
}): Result<void> {
	if (input.contractStartsOn < input.employmentStartsOn) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	if (input.employmentEndsOn !== null) {
		if (input.contractEndsOn === null) {
			return errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "The submitted data is invalid",
				internalContext: humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_INVALID_INPUT,
				),
			});
		}
		if (input.contractEndsOn > input.employmentEndsOn) {
			return errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "The submitted data is invalid",
				internalContext: humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_INVALID_INPUT,
				),
			});
		}
	}
	return errorResult.ok(undefined);
}

export function assertEmploymentContractMutable(input: {
	lineageStatus: EmploymentContractLineageStatus;
}): Result<void> {
	if (input.lineageStatus === "superseded") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "The request conflicts with current state",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			),
		});
	}
	return errorResult.ok(undefined);
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
