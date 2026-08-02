import { assembleApprovedPayrollHandoff } from "@afenda/human-resources";
import type { PayrollWorkforceCapability } from "@afenda/payroll";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";

/** Carries HR's approved contract unchanged; Payroll owns all interpretation. */
export function createPayrollWorkforcePort(): PayrollWorkforceCapability {
	return {
		getApprovedPayrollHandoff(input) {
			return assembleApprovedPayrollHandoff(
				{
					organizationId: input.organizationId,
					employeeId: input.employeeId,
					effectiveDate: input.effectiveDate,
					actorUserId: input.actorUserId,
					correlationId: input.correlationId,
					...(input.periodStart === undefined
						? {}
						: { periodStart: input.periodStart }),
					...(input.periodEnd === undefined
						? {}
						: { periodEnd: input.periodEnd }),
				},
				createHumanResourcesCommandOptions(),
			);
		},
	};
}
