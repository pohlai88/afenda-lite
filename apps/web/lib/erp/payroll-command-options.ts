import type { PayrollCommandOptions } from "@afenda/payroll";

import { createPayrollAuthorizationPort } from "@/lib/erp/payroll-authorization-port";
import { createPayrollEmployeeQueryPort } from "@/lib/erp/payroll-employee-query-port";

/** Composition-root options for `@afenda/payroll` public APIs. */
export function createPayrollCommandOptions(): PayrollCommandOptions {
	return {
		authorization: createPayrollAuthorizationPort(),
		employees: createPayrollEmployeeQueryPort(),
	};
}
