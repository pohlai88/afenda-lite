import {
	and,
	db,
	eq,
	hrEmployment,
	hrEmploymentCalendarAssignment,
	hrPosition,
	hrWorkAssignment,
	gte,
	isNull,
	lte,
	or,
} from "@afenda/db";
import { ok, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../../error-codes";
import type {
	AssignmentContextQueryPort,
	EmployeeAssignmentContext,
} from "../../time/handoff/ports";

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
				return ok({
					employmentId: input.employmentId,
					employeeId: input.employeeId,
					departmentId: null,
					locationKey: null,
					legalEntityKey: null,
				});
			}

			const workAssignmentRows = await db
				.select({
					positionId: hrWorkAssignment.positionId,
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
				)
				.limit(1);

			let departmentId: string | null = null;
			if (workAssignmentRows[0]?.positionId !== undefined) {
				const positionRows = await db
					.select({ departmentId: hrPosition.departmentId })
					.from(hrPosition)
					.where(
						and(
							eq(hrPosition.organizationId, input.organizationId),
							eq(hrPosition.id, workAssignmentRows[0].positionId),
						),
					)
					.limit(1);
				departmentId = positionRows[0]?.departmentId ?? null;
			}

			const calendarAssignmentRows = await db
				.select({ locationCode: hrEmploymentCalendarAssignment.locationCode })
				.from(hrEmploymentCalendarAssignment)
				.where(
					and(
						eq(
							hrEmploymentCalendarAssignment.organizationId,
							input.organizationId,
						),
						eq(hrEmploymentCalendarAssignment.employmentId, input.employmentId),
						eq(hrEmploymentCalendarAssignment.employeeId, input.employeeId),
						lte(hrEmploymentCalendarAssignment.effectiveFrom, input.asOf),
						or(
							isNull(hrEmploymentCalendarAssignment.effectiveTo),
							gte(hrEmploymentCalendarAssignment.effectiveTo, input.asOf),
						),
					),
				)
				.orderBy(hrEmploymentCalendarAssignment.effectiveFrom)
				.limit(1);

			return ok({
				employmentId: input.employmentId,
				employeeId: input.employeeId,
				departmentId,
				locationKey: calendarAssignmentRows[0]?.locationCode ?? null,
				legalEntityKey: null,
			});
		},
	};
}
