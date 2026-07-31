import { errorResult, type Result } from "@afenda/errors";

import {
	HUMAN_RESOURCES_ERROR_ASSIGNMENT_OUTSIDE_EMPLOYMENT_RANGE,
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_MULTIPLE_PRIMARY_ASSIGNMENTS,
	humanResourcesErrorDetails,
} from "../error-codes";
import { previousIsoDate } from "./effective-dates";
import { datesOverlap } from "./organization-guards";

export const MULTIPLE_PRIMARY_ASSIGNMENTS_AT_ASOF_MESSAGE =
	"Multiple assignments are effective on the requested date";

export function multiplePrimaryAssignmentsAtAsOf(): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "The request conflicts with current state",
		internalContext: humanResourcesErrorDetails(
			HUMAN_RESOURCES_ERROR_MULTIPLE_PRIMARY_ASSIGNMENTS,
		),
	});
}

function assignmentOutsideEmploymentRange(_message: string): Result<never> {
	return errorResult.fail("VALIDATION_ERROR", {
		publicMessage: "The submitted data is invalid",
		internalContext: humanResourcesErrorDetails(
			HUMAN_RESOURCES_ERROR_ASSIGNMENT_OUTSIDE_EMPLOYMENT_RANGE,
		),
	});
}

export function assertNoAssignmentOverlap(input: {
	candidateAssignmentId?: string | undefined;
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

export function assertAssignmentWithinEmployment(input: {
	assignmentStartsOn: string;
	assignmentEndsOn: string | null;
	employmentStartsOn: string;
	employmentEndsOn: string | null;
}): Result<void> {
	if (input.assignmentStartsOn < input.employmentStartsOn) {
		return assignmentOutsideEmploymentRange(
			"Assignment start date precedes employment start date",
		);
	}
	if (input.employmentEndsOn !== null) {
		if (input.assignmentEndsOn === null) {
			return assignmentOutsideEmploymentRange(
				"Open-ended assignment exceeds employment tenure",
			);
		}
		if (input.assignmentEndsOn > input.employmentEndsOn) {
			return assignmentOutsideEmploymentRange(
				"Assignment end date exceeds employment end date",
			);
		}
	}
	return errorResult.ok(undefined);
}

export function assertTransferAssignmentRanges(input: {
	openAssignment: { id: string; startsOn: string };
	effectiveOn: string;
	employmentStartsOn: string;
	employmentEndsOn: string | null;
	siblings: readonly {
		id: string;
		startsOn: string;
		endsOn: string | null;
	}[];
}): Result<void> {
	const endedOn = previousIsoDate(input.effectiveOn);

	const withinEmployment = assertAssignmentWithinEmployment({
		assignmentStartsOn: input.openAssignment.startsOn,
		assignmentEndsOn: endedOn,
		employmentStartsOn: input.employmentStartsOn,
		employmentEndsOn: input.employmentEndsOn,
	});
	if (!withinEmployment.ok) {
		return withinEmployment;
	}

	const successorWithinEmployment = assertAssignmentWithinEmployment({
		assignmentStartsOn: input.effectiveOn,
		assignmentEndsOn: null,
		employmentStartsOn: input.employmentStartsOn,
		employmentEndsOn: input.employmentEndsOn,
	});
	if (!successorWithinEmployment.ok) {
		return successorWithinEmployment;
	}

	const endedOverlap = assertNoAssignmentOverlap({
		candidateAssignmentId: input.openAssignment.id,
		candidateStartsOn: input.openAssignment.startsOn,
		candidateEndsOn: endedOn,
		existing: input.siblings,
	});
	if (!endedOverlap.ok) {
		return endedOverlap;
	}

	return assertNoAssignmentOverlap({
		candidateAssignmentId: input.openAssignment.id,
		candidateStartsOn: input.effectiveOn,
		candidateEndsOn: null,
		existing: input.siblings,
	});
}
