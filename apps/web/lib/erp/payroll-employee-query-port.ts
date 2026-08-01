import { assembleApprovedPayrollHandoff } from "@afenda/human-resources";
import type { PayrollWorkforceCapability } from "@afenda/payroll";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";

/**
 * Composition-root workforce projection. HR owns employment and compensation
 * truth; Payroll owns pay-group assignment and calculation interpretation.
 */
export function createPayrollEmployeeQueryPort(): PayrollWorkforceCapability {
	return {
		async getPayrollEmployee(input) {
			const handoff = await assembleApprovedPayrollHandoff(
				{
					organizationId: input.organizationId,
					employeeId: input.employeeId,
					effectiveDate: input.effectiveDate,
					actorUserId: input.actorUserId,
					correlationId: input.correlationId,
				},
				createHumanResourcesCommandOptions(),
			);
			if (!handoff.ok) {
				return handoff;
			}
			if (handoff.data === null) {
				return { ok: true, data: null };
			}

			return {
				ok: true,
				data: {
					employeeId: handoff.data.employeeId,
					employmentStatus: "active",
					baseCompensation: handoff.data.baseAmount,
					currencyCode: handoff.data.currencyCode,
					recurringAllowances: [],
					recurringDeductions: handoff.data.components
						.filter(
							(component) => component.kind === "benefit_employee_contribution",
						)
						.map(({ code, amount }) => ({ code, amount })),
				},
			};
		},
	};
}
