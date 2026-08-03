import { createPayrollCapabilityOptions } from "@afenda/payroll";

import { createPayrollAuthorizationPort } from "@/lib/erp/payroll-authorization-port";

/**
 * Opaque composition-root context for `@afenda/payroll` capabilities.
 * Workforce facts are read from Payroll's accepted-handoff ledger (PRD R1) —
 * no calculation-time pull from HR.
 */
export function createPayrollCommandOptions() {
	return createPayrollCapabilityOptions({
		authorization: createPayrollAuthorizationPort(),
	});
}
