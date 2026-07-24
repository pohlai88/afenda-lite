import type { PayrollEmployeeQueryPort } from "@afenda/payroll";

/**
 * Composition-root workforce read adapter for payroll commands.
 * Returns null until HR14 stabilizes payroll-facing employee DTOs (PAY-DEC-001).
 */
export function createPayrollEmployeeQueryPort(): PayrollEmployeeQueryPort {
	return {
		async getPayrollEmployee() {
			return null;
		},
	};
}
