import { fail, ok, type Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import { HUMAN_RESOURCES_QUERY_EMPLOYEE_ORG_CONTEXT_RESOLVE } from "../module-ids";
import {
	type EmployeeOrgContextAsOf,
	resolveEmployeeOrgContextAsOfInputSchema,
} from "../schemas/org-context";
import { runCoreQuery } from "../shared/core-command";
import { resolveEmployeeWorkCalendar } from "../time/employee-work-calendar-resolution";

export async function resolveEmployeeOrgContextAsOf(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeOrgContextAsOf>> {
	return runCoreQuery(input, options, {
		schema: resolveEmployeeOrgContextAsOfInputSchema,
		invalidMessage: "Invalid employee org context resolve input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYEE_ORG_CONTEXT_RESOLVE,
		execute: async (data, { store }) => {
			const employment = await store.findEmploymentByEmployeeAsOf({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				asOf: data.asOf,
			});
			if (!employment.ok) {
				return employment;
			}
			if (employment.data === null) {
				return fail(
					"NOT_FOUND",
					"No employment effective on the requested date",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}
			const employmentRecord = employment.data;

			const assignment = await store.findAssignmentByEmploymentAsOf({
				organizationId: data.organizationId,
				employmentId: employmentRecord.id,
				asOf: data.asOf,
			});
			if (!assignment.ok) {
				return assignment;
			}

			let positionId: EmployeeOrgContextAsOf["positionId"] = null;
			let departmentId: string | null = null;
			if (assignment.data !== null) {
				positionId = assignment.data.positionId;
				const position = await store.getPositionById({
					organizationId: data.organizationId,
					positionId: assignment.data.positionId,
				});
				if (!position.ok) {
					return position;
				}
				departmentId = position.data?.departmentId ?? null;
			}

			const manager = await store.resolvePrimaryManager({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				asOf: data.asOf,
			});
			if (!manager.ok) {
				return manager;
			}

			const calendar = await store.resolveEmploymentCalendar({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				employmentId: employmentRecord.id,
				asOf: data.asOf,
			});
			if (!calendar.ok) {
				return calendar;
			}

			const scopedCalendar = await resolveEmployeeWorkCalendar(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					employmentId: employmentRecord.id,
					asOf: data.asOf,
				},
				{
					store,
					assignmentContext: {
						async resolveAsOf(_query) {
							return ok({
								employmentId: employmentRecord.id,
								employeeId: data.employeeId,
								departmentId,
								locationKey: calendar.data?.locationCode ?? null,
								legalEntityKey: calendar.data?.jurisdiction ?? null,
							});
						},
					},
				},
			);
			if (!scopedCalendar.ok) {
				return scopedCalendar;
			}

			return ok({
				employmentId: employmentRecord.id,
				employeeId: data.employeeId,
				positionId,
				departmentId,
				managerEmployeeId: manager.data?.managerEmployeeId ?? null,
				locationKey: calendar.data?.locationCode ?? null,
				legalEntityKey: calendar.data?.jurisdiction ?? null,
				costCentreKey: null,
				workCalendarId: scopedCalendar.data?.calendarId ?? null,
			});
		},
	});
}
