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
	/**
	 * Optional override for workforce fact reads. When omitted, operations read
	 * the accepted-handoff ledger sealed by ingestApprovedPayrollHandoff (PRD R1).
	 */
	readonly workforce?: PayrollWorkforceCapability;
}
