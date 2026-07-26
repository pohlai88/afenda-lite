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
import { resolveEmployeeOrgContextForEmployment } from "./employee-org-context-resolution";

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
				return fail(
					"NOT_FOUND",
					"No assignment effective on the requested date",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}
			return ok(resolved.data);
		},
	});
}
