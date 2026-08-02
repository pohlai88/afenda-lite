import { errorResult, type Result } from "@afenda/errors";
import { z } from "zod";

import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	humanResourcesErrorDetails,
} from "../../../kernel/execution/error-codes";
import { datesOverlap } from "../../organization/guards";

export const EMPLOYMENT_STATUSES = ["active", "notice", "terminated"] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

export const POSITION_STATUSES = ["active", "frozen", "closed"] as const;
export type PositionStatus = (typeof POSITION_STATUSES)[number];

export const DEPARTMENT_STATUSES = ["active", "archived"] as const;
export type DepartmentStatus = (typeof DEPARTMENT_STATUSES)[number];

export const JOB_STATUSES = ["active", "archived"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const REPORTING_RELATIONSHIP_KINDS = ["primary"] as const;
export type ReportingRelationshipKind =
	(typeof REPORTING_RELATIONSHIP_KINDS)[number];

export const employmentStatusSchema = z.enum(EMPLOYMENT_STATUSES);
export const positionStatusSchema = z.enum(POSITION_STATUSES);
export const departmentStatusSchema = z.enum(DEPARTMENT_STATUSES);
export const jobStatusSchema = z.enum(JOB_STATUSES);
export const reportingRelationshipKindSchema = z.enum(
	REPORTING_RELATIONSHIP_KINDS,
);

/**
 * Employment status transition table:
 * - active → notice | terminated  (suspend → notice; terminate → terminated)
 * - notice → active | terminated  (reactivate → active; terminate → terminated)
 * - terminated → (terminal state — no transitions; return-to-work is rehire via create)
 */
export function canTransitionEmploymentStatus(
	current: EmploymentStatus,
	next: EmploymentStatus,
): boolean {
	if (current === "active" && (next === "notice" || next === "terminated")) {
		return true;
	}
	if (current === "notice" && (next === "active" || next === "terminated")) {
		return true;
	}
	return false;
}

export function assertEmploymentStatusTransition(
	current: EmploymentStatus,
	next: EmploymentStatus,
): Result<void> {
	if (current === next) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "The request is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			),
		});
	}
	if (!canTransitionEmploymentStatus(current, next)) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "The request is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			),
		});
	}
	return errorResult.ok(undefined);
}

/**
 * Validates date range: endsOn >= startsOn when endsOn is set.
 */
export function assertValidDateRange(
	startsOn: string,
	endsOn: string | null | undefined,
): Result<void> {
	if (endsOn !== null && endsOn !== undefined && endsOn < startsOn) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "The request is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	return errorResult.ok(undefined);
}

export function assertNoEmploymentOverlap(input: {
	candidateEmploymentId?: string | undefined;
	candidateStartsOn: string;
	candidateEndsOn: string | null;
	existing: readonly {
		id: string;
		startsOn: string;
		endsOn: string | null;
	}[];
}): Result<void> {
	for (const employment of input.existing) {
		if (employment.id === input.candidateEmploymentId) {
			continue;
		}
		if (
			datesOverlap({
				startsOnA: input.candidateStartsOn,
				endsOnA: input.candidateEndsOn,
				startsOnB: employment.startsOn,
				endsOnB: employment.endsOn,
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
