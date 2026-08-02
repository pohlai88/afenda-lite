import type { Result } from "@afenda/errors";
import type { EmployeeComplianceSummary } from "../../kernel/contracts";
import type { HumanResourcesCommandOptions } from "../../kernel/execution/command-options";
import { HUMAN_RESOURCES_QUERY_EMPLOYEE_COMPLIANCE_SUMMARY_GET } from "../../kernel/operations/module-ids";
import { runComplianceEmployeeScopedCapabilityQuery } from "./run-operation";
import { getEmployeeComplianceSummaryInputSchema } from "./schema";

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
