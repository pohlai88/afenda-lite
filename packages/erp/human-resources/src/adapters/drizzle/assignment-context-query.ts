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
	HUMAN_RESOURCES_ERROR_NO_DETERMINISTIC_ASSIGNMENT,
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
			if (workAssignmentRows.length !== 1) {
				return fail(
					workAssignmentRows.length === 0 ? "NOT_FOUND" : "CONFLICT",
					workAssignmentRows.length === 0
						? "No assignment effective on the requested date"
						: "Multiple assignments are effective on the requested date",
					humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NO_DETERMINISTIC_ASSIGNMENT,
					),
				);
			}
			const assignment = workAssignmentRows[0];
			if (
				assignment === undefined ||
				assignment.locationKey === null ||
				assignment.legalEntityKey === null
			) {
				return fail(
					"CONFLICT",
					"Assignment has no deterministic organization dimension snapshot",
					humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NO_DETERMINISTIC_ASSIGNMENT,
					),
				);
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
