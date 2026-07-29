import { fail, ok, type Result } from "@afenda/errors/result";

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
	return fail(
		"CONFLICT",
		MULTIPLE_PRIMARY_ASSIGNMENTS_AT_ASOF_MESSAGE,
		humanResourcesErrorDetails(
			HUMAN_RESOURCES_ERROR_MULTIPLE_PRIMARY_ASSIGNMENTS,
		),
	);
}

function assignmentOutsideEmploymentRange(message: string): Result<never> {
	return fail(
		"VALIDATION_ERROR",
		message,
		humanResourcesErrorDetails(
			HUMAN_RESOURCES_ERROR_ASSIGNMENT_OUTSIDE_EMPLOYMENT_RANGE,
		),
	);
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
	return ok(undefined);
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
