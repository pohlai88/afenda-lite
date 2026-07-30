import type { Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import { getEmployeeComplianceSummaryInputSchema } from "../schemas/compliance";
import { runComplianceEmployeeScopedQuery } from "../shared/compliance-command";
import type { EmployeeComplianceSummary } from "../types";

export function getEmployeeComplianceSummary(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeComplianceSummary>> {
	return runComplianceEmployeeScopedQuery(input, options, {
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
