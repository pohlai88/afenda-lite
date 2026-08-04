import {
	createJurisdictionPayrollCurrency,
	createPayrollCapabilityOptions,
	createRegistryPayrollStatutory,
	createSystemPayrollClock,
} from "@afenda/payroll";

import { createPayrollAuthorizationPort } from "@/lib/erp/payroll-authorization-port";

/**
 * Opaque composition-root context for `@afenda/payroll` capabilities.
 * Workforce facts are read from Payroll's accepted-handoff ledger (PRD R1) —
 * no calculation-time pull from HR. Clock, currency, and statutory capabilities
 * are required composition inputs (bridging B3).
 */
export function createPayrollCommandOptions() {
	return createPayrollCapabilityOptions({
		authorization: createPayrollAuthorizationPort(),
		clock: createSystemPayrollClock(),
		currency: createJurisdictionPayrollCurrency(),
		statutory: createRegistryPayrollStatutory(),
	});
}
