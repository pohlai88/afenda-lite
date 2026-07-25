import { fail, ok, type Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_NO_DETERMINISTIC_ASSIGNMENT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import { HUMAN_RESOURCES_QUERY_EMPLOYEE_ORG_CONTEXT_RESOLVE } from "../module-ids";
import {
	type EmployeeOrgContextAsOf,
	resolveEmployeeOrgContextAsOfInputSchema,
} from "../schemas/org-context";
import { runCoreQuery } from "../shared/core-command";

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
			if (assignment.data === null) {
				return fail(
					"NOT_FOUND",
					"No assignment effective on the requested date",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}
			const assignmentRecord = assignment.data;
			const dimensions = assignmentRecord.organizationDimensions;
			if (dimensions === null) {
				return fail(
					"CONFLICT",
					"Assignment has no deterministic organization dimension snapshot",
					humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NO_DETERMINISTIC_ASSIGNMENT,
					),
				);
			}
			const resolvedDimensions = dimensions;

			const positionId: EmployeeOrgContextAsOf["positionId"] =
				assignmentRecord.positionId;
			const position = await store.findPositionAsOf({
				organizationId: data.organizationId,
				positionId: assignmentRecord.positionId,
				asOf: data.asOf,
			});
			if (!position.ok) {
				return position;
			}
			const departmentId = position.data?.departmentId ?? null;

			return ok({
				employmentId: employmentRecord.id,
				employeeId: data.employeeId,
				positionId,
				departmentId,
				managerEmployeeId: assignmentRecord.managerEmployeeIdSnapshot,
				locationKey: resolvedDimensions.location.key,
				legalEntityKey: resolvedDimensions.legal_entity.key,
				businessUnitKey: resolvedDimensions.business_unit.key,
				costCentreKey: resolvedDimensions.cost_centre.key,
				projectKey: resolvedDimensions.project.key,
				workCalendarId: assignmentRecord.workCalendarIdSnapshot,
			});
		},
	});
}
