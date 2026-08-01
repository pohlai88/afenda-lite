import type { PayrollAuthorizationPort } from "./authorization";
import type { PayrollEmployeeQueryPort } from "./ports";

/** Authorization capability supplied once by the application composition root. */
export type PayrollAuthorizationCapability = PayrollAuthorizationPort;

/** Payroll-owned workforce fact requirement implemented outside this package. */
export type PayrollWorkforceCapability = PayrollEmployeeQueryPort;

/** Stable composition input for the permanent Payroll execution facade. */
export interface PayrollCapabilityComposition {
	readonly authorization: PayrollAuthorizationCapability;
	readonly workforce: PayrollWorkforceCapability;
}
