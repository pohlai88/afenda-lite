import type {
	PayrollJobChunkExecutorPort,
	PayrollJobEmployeeDirectoryPort,
} from "../features/payroll-jobs/contract";
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

/** Accepted-handoff workforce fact reader sealed by ingest (bridging B1). */
export type PayrollWorkforceCapability = PayrollWorkforceInputPort;

/** Platform privacy adapter supplied once by the application composition root. */
export type PayrollPrivacyCapability = PayrollPrivacyPort;

/** Stable composition input for the permanent Payroll execution facade. */
export interface PayrollCapabilityComposition {
	readonly authorization: PayrollAuthorizationCapability;
	readonly clock: PayrollClockCapability;
	readonly currency: PayrollCurrencyCapability;
	readonly jobChunkExecutor?: PayrollJobChunkExecutorPort;
	readonly jobEmployees?: PayrollJobEmployeeDirectoryPort;
	readonly observability?: PayrollObservabilityPort;
	readonly privacy?: PayrollPrivacyCapability;
	readonly statutory: PayrollStatutoryCapability;
}
