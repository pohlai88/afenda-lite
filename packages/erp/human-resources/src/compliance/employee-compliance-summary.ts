import type { Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import { HUMAN_RESOURCES_QUERY_EMPLOYEE_COMPLIANCE_SUMMARY_GET } from "../module-ids";
import { getEmployeeComplianceSummaryInputSchema } from "../schemas-compliance";
import { runComplianceEmployeeScopedQuery } from "../shared/compliance-command";
import type { EmployeeComplianceSummary } from "../types";

export async function getEmployeeComplianceSummary(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeComplianceSummary>> {
	return runComplianceEmployeeScopedQuery(input, options, {
		schema: getEmployeeComplianceSummaryInputSchema,
		invalidMessage: "Invalid employee compliance summary get input",
		execute: async (data, { store }) => {
			return store.getEmployeeComplianceSummary({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				asOf: data.asOf,
			});
		},
	});
}
