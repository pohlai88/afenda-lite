import { createPayrollCapabilityOptions } from "@afenda/payroll";

import { createPayrollAuthorizationPort } from "@/lib/erp/payroll-authorization-port";
import { createPayrollWorkforcePort } from "@/lib/erp/payroll-workforce-port";

/** Opaque composition-root context for `@afenda/payroll` capabilities. */
export function createPayrollCommandOptions() {
	return createPayrollCapabilityOptions({
		authorization: createPayrollAuthorizationPort(),
		workforce: createPayrollWorkforcePort(),
	});
}
