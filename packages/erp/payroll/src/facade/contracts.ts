import type { PayrollAuthorizationPort } from "../kernel/execution/authorization";
import type {
	PayrollObservabilityPort,
	PayrollWorkforceInputPort,
} from "../kernel/execution/ports";

/** Authorization capability supplied once by the application composition root. */
export type PayrollAuthorizationCapability = PayrollAuthorizationPort;

/** Payroll-owned workforce fact requirement implemented outside this package. */
export type PayrollWorkforceCapability = PayrollWorkforceInputPort;

/** Stable composition input for the permanent Payroll execution facade. */
export interface PayrollCapabilityComposition {
	readonly authorization: PayrollAuthorizationCapability;
	readonly observability?: PayrollObservabilityPort;
	readonly workforce: PayrollWorkforceCapability;
}
