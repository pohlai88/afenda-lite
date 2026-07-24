import {
	and,
	db,
	eq,
	gte,
	hrEmployment,
	hrPosition,
	hrWorkAssignment,
	isNull,
	lte,
	or,
} from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../../error-codes";
import type {
	AssignmentContextQueryPort,
	EmployeeAssignmentContext,
} from "../../time/handoff/ports";

/**
 * Drizzle-backed assignment context for calendar / time resolution.
 * Missing work assignments resolve to null dimension keys so organization-
 * and employee-scoped calendars remain selectable. Multiple effective work
 * assignments fail with CONFLICT (parity with Memory
 * {@link createStoreAssignmentContextQuery} / findAssignmentByEmploymentAsOf).
 */
export function createDrizzleAssignmentContextQuery(): AssignmentContextQueryPort {
	return {
		async resolveAsOf(input): Promise<Result<EmployeeAssignmentContext>> {
			const employmentRows = await db
				.select({ id: hrEmployment.id, employeeId: hrEmployment.employeeId })
				.from(hrEmployment)
				.where(
					and(
						eq(hrEmployment.organizationId, input.organizationId),
						eq(hrEmployment.id, input.employmentId),
						eq(hrEmployment.employeeId, input.employeeId),
					),
				)
				.limit(1);
			if (employmentRows.length === 0) {
				return fail(
					"NOT_FOUND",
					"Employment not found for assignment context",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}

			const workAssignmentRows = await db
				.select({
					positionId: hrWorkAssignment.positionId,
					locationKey: hrWorkAssignment.locationKeySnapshot,
					legalEntityKey: hrWorkAssignment.legalEntityKeySnapshot,
				})
				.from(hrWorkAssignment)
				.where(
					and(
						eq(hrWorkAssignment.organizationId, input.organizationId),
						eq(hrWorkAssignment.employmentId, input.employmentId),
						eq(hrWorkAssignment.employeeId, input.employeeId),
						lte(hrWorkAssignment.startsOn, input.asOf),
						or(
							isNull(hrWorkAssignment.endsOn),
							gte(hrWorkAssignment.endsOn, input.asOf),
						),
					),
				);
			if (workAssignmentRows.length === 0) {
				return ok({
					employmentId: input.employmentId,
					employeeId: input.employeeId,
					departmentId: null,
					locationKey: null,
					legalEntityKey: null,
				});
			}
			if (workAssignmentRows.length !== 1) {
				return fail(
					"CONFLICT",
					"Multiple assignments are effective on the requested date",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
				);
			}
			const assignment = workAssignmentRows[0];
			if (assignment === undefined) {
				return ok({
					employmentId: input.employmentId,
					employeeId: input.employeeId,
					departmentId: null,
					locationKey: null,
					legalEntityKey: null,
				});
			}

			let departmentId: string | null = null;
			if (assignment.positionId !== undefined) {
				const positionRows = await db
					.select({ departmentId: hrPosition.departmentId })
					.from(hrPosition)
					.where(
						and(
							eq(hrPosition.organizationId, input.organizationId),
							eq(hrPosition.id, assignment.positionId),
						),
					)
					.limit(1);
				departmentId = positionRows[0]?.departmentId ?? null;
			}

			return ok({
				employmentId: input.employmentId,
				employeeId: input.employeeId,
				departmentId,
				locationKey: assignment.locationKey,
				legalEntityKey: assignment.legalEntityKey,
			});
		},
	};
}
