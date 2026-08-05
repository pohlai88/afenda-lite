import type {
	PayrollJobChunkExecutorPort,
	PayrollJobEmployeeDirectoryPort,
} from "../../features/payroll-jobs/contract";
import type { PayrollPrivacyPort } from "../../features/privacy/contract";
import type { PayrollAuthorizationPort } from "./authorization";
import type {
	PayrollClockCapability,
	PayrollCurrencyCapability,
	PayrollStatutoryCapability,
} from "./capability-ports";
import type {
	MutationPorts,
	PayrollObservabilityPort,
	PayrollRunCalculatorPort,
	PayrollWorkforceInputPort,
} from "./ports";

interface PayrollExecutionOptions<TStore> {
	authorization?: PayrollAuthorizationPort;
	clock?: PayrollClockCapability;
	currency?: PayrollCurrencyCapability;
	employees?: PayrollWorkforceInputPort;
	jobChunkExecutor?: PayrollJobChunkExecutorPort;
	jobEmployees?: PayrollJobEmployeeDirectoryPort;
	observability?: PayrollObservabilityPort;
	privacy?: PayrollPrivacyPort;
	statutory?: PayrollStatutoryCapability;
	store?: TStore;
}

export interface PayrollCommandOptions<TStore>
	extends PayrollExecutionOptions<TStore> {
	calculator?: PayrollRunCalculatorPort;
	ports?: MutationPorts;
}

export type PayrollQueryOptions<TStore> = PayrollExecutionOptions<TStore>;

export function requirePayrollStore<TStore>(store: TStore | undefined): TStore {
	if (store === undefined) {
		throw new TypeError(
			"Payroll internal operations require an injected store.",
		);
	}
	return store;
}

export function requirePayrollMutationPorts(
	ports: MutationPorts | undefined,
): MutationPorts {
	if (ports === undefined) {
		throw new TypeError(
			"Payroll internal commands require injected mutation capabilities.",
		);
	}
	return ports;
}

export function resolveCommandDeps<TStore>(
	options: PayrollCommandOptions<TStore>,
): {
	store: TStore;
	ports: MutationPorts;
	authorization: PayrollAuthorizationPort | undefined;
	employees: PayrollWorkforceInputPort | undefined;
	calculator: PayrollRunCalculatorPort | undefined;
	observability: PayrollObservabilityPort | undefined;
} {
	return {
		store: requirePayrollStore(options.store),
		ports: requirePayrollMutationPorts(options.ports),
		authorization: options.authorization,
		employees: options.employees,
		calculator: options.calculator,
		observability: options.observability,
	};
}

export function resolveQueryDeps<TStore>(
	options: PayrollQueryOptions<TStore>,
): {
	store: TStore;
	authorization: PayrollAuthorizationPort | undefined;
	employees: PayrollWorkforceInputPort | undefined;
	observability: PayrollObservabilityPort | undefined;
} {
	return {
		store: requirePayrollStore(options.store),
		authorization: options.authorization,
		employees: options.employees,
		observability: options.observability,
	};
}
