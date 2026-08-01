import { errorResult, type Result } from "@afenda/errors";
import type { HumanResourcesCommandOptions } from "../command-options";
import { runEmploymentLifecycleQuery } from "../employment-lifecycle/run-operation";
import {
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import { HUMAN_RESOURCES_QUERY_EMPLOYEE_ORG_CONTEXT_RESOLVE } from "../module-ids";
import {
	type EmployeeOrgContextAsOf,
	resolveEmployeeOrgContextAsOfInputSchema,
} from "../schemas/org-context";
import { resolveEmployeeOrgContextForEmployment } from "./employee-org-context-resolution";

export function resolveEmployeeOrgContextAsOf(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeOrgContextAsOf>> {
	return runEmploymentLifecycleQuery(input, options, {
		schema: resolveEmployeeOrgContextAsOfInputSchema,
		invalidMessage: "Invalid employee org context resolve input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYEE_ORG_CONTEXT_RESOLVE,
		storeMethods: [
			"findEmploymentByEmployeeAsOf",
			"findAssignmentByEmploymentAsOf",
			"findPositionAsOf",
		],
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
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}

			const resolved = await resolveEmployeeOrgContextForEmployment({
				store,
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				employmentId: employment.data.id,
				asOf: data.asOf,
				mode: "strict",
			});
			if (!resolved.ok) {
				return resolved;
			}
			if (resolved.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			return errorResult.ok(resolved.data);
		},
	});
}
