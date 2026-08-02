import type { Result } from "@afenda/errors";

import type { HumanResourcesCommandOptions } from "../command-options";
import { HUMAN_RESOURCES_QUERY_EMPLOYEE_COMPLIANCE_SUMMARY_GET } from "../module-ids";
import { getEmployeeComplianceSummaryInputSchema } from "../schemas/compliance";
import type { EmployeeComplianceSummary } from "../types";
import { runComplianceEmployeeScopedCapabilityQuery } from "./run-operation";

export function getEmployeeComplianceSummary(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeComplianceSummary>> {
	return runComplianceEmployeeScopedCapabilityQuery(input, options, {
		query: HUMAN_RESOURCES_QUERY_EMPLOYEE_COMPLIANCE_SUMMARY_GET,
		storeMethods: ["getEmployeeComplianceSummary"],
		schema: getEmployeeComplianceSummaryInputSchema,
		invalidMessage: "Invalid employee compliance summary get input",
		execute: async (data, { store }) =>
			store.getEmployeeComplianceSummary({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				...(data.asOf === undefined ? {} : { asOf: data.asOf }),
			}),
	});
}
