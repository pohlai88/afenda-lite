import { fail, ok, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../error-codes";
import { datesOverlap } from "./organization-guards";

export function assertNoAssignmentOverlap(input: {
	candidateAssignmentId?: string;
	candidateStartsOn: string;
	candidateEndsOn: string | null;
	existing: readonly {
		id: string;
		startsOn: string;
		endsOn: string | null;
	}[];
}): Result<void> {
	for (const assignment of input.existing) {
		if (assignment.id === input.candidateAssignmentId) {
			continue;
		}
		if (
			datesOverlap({
				startsOnA: input.candidateStartsOn,
				endsOnA: input.candidateEndsOn,
				startsOnB: assignment.startsOn,
				endsOnB: assignment.endsOn,
			})
		) {
			return fail(
				"CONFLICT",
				"Assignment date range overlaps an existing assignment for this employment",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
			);
		}
	}
	return ok(undefined);
}

export function assertAssignmentWithinEmployment(input: {
	assignmentStartsOn: string;
	assignmentEndsOn: string | null;
	employmentStartsOn: string;
	employmentEndsOn: string | null;
}): Result<void> {
	if (input.assignmentStartsOn < input.employmentStartsOn) {
		return fail(
			"VALIDATION_ERROR",
			"Assignment start date precedes employment start date",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	if (input.employmentEndsOn !== null) {
		if (input.assignmentEndsOn === null) {
			return fail(
				"VALIDATION_ERROR",
				"Open-ended assignment exceeds employment tenure",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
			);
		}
		if (input.assignmentEndsOn > input.employmentEndsOn) {
			return fail(
				"VALIDATION_ERROR",
				"Assignment end date exceeds employment end date",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
			);
		}
	}
	return ok(undefined);
}
