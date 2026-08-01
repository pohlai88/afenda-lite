import { createPayrollCapabilityOptions } from "@afenda/payroll";

import { createPayrollAuthorizationPort } from "@/lib/erp/payroll-authorization-port";
import { createPayrollEmployeeQueryPort } from "@/lib/erp/payroll-employee-query-port";

/** Opaque composition-root context for `@afenda/payroll` capabilities. */
export function createPayrollCommandOptions() {
	return createPayrollCapabilityOptions({
		authorization: createPayrollAuthorizationPort(),
		workforce: createPayrollEmployeeQueryPort(),
	});
}
