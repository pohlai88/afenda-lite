import type { PayrollPrivacyPort } from "../features/privacy/contract";
import type { PayrollAuthorizationPort } from "../kernel/execution/authorization";
import type {
	PayrollClockCapability,
	PayrollCurrencyCapability,
	PayrollStatutoryCapability,
} from "../kernel/execution/capability-ports";
import type {
	PayrollObservabilityPort,
	PayrollWorkforceInputPort,
} from "../kernel/execution/ports";

/** Authorization capability supplied once by the application composition root. */
export type PayrollAuthorizationCapability = PayrollAuthorizationPort;

/** Payroll-owned workforce fact requirement implemented outside this package. */
export type PayrollWorkforceCapability = PayrollWorkforceInputPort;

/** Platform privacy adapter supplied once by the application composition root. */
export type PayrollPrivacyCapability = PayrollPrivacyPort;

/** Stable composition input for the permanent Payroll execution facade. */
export interface PayrollCapabilityComposition {
	readonly authorization: PayrollAuthorizationCapability;
	readonly clock: PayrollClockCapability;
	readonly currency: PayrollCurrencyCapability;
	readonly observability?: PayrollObservabilityPort;
	readonly privacy?: PayrollPrivacyCapability;
	readonly statutory: PayrollStatutoryCapability;
	/**
	 * Test-only override for workforce fact reads. Production composition omits
	 * this field — operations read the accepted-handoff ledger sealed by
	 * ingestApprovedPayrollHandoff (PRD R1 / bridging B1). Do not wire a second
	 * pull transport through this seam.
	 */
	readonly workforce?: PayrollWorkforceCapability;
}
