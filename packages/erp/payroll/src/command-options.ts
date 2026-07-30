import type { PayrollAuthorizationPort } from "./authorization";
import type {
	MutationPorts,
	PayrollEmployeeQueryPort,
	PayrollRunCalculatorPort,
} from "./ports";
import { createProductionMutationPorts } from "./production-ports";
import { resolvePayrollStore } from "./resolve-store";
import type { PayrollStore } from "./store";

export interface PayrollCommandOptions {
	authorization?: PayrollAuthorizationPort;
	calculator?: PayrollRunCalculatorPort;
	employees?: PayrollEmployeeQueryPort;
	ports?: MutationPorts;
	store?: PayrollStore;
}

export function resolvePorts(ports?: MutationPorts): MutationPorts {
	return ports ?? createProductionMutationPorts();
}

export function resolveStore(store?: PayrollStore): PayrollStore {
	return resolvePayrollStore(store);
}

export function resolveCommandDeps(options: PayrollCommandOptions = {}): {
	store: PayrollStore;
	ports: MutationPorts;
	authorization: PayrollAuthorizationPort | undefined;
	employees: PayrollEmployeeQueryPort | undefined;
	calculator: PayrollRunCalculatorPort | undefined;
} {
	return {
		store: resolveStore(options.store),
		ports: resolvePorts(options.ports),
		authorization: options.authorization,
		employees: options.employees,
		calculator: options.calculator,
	};
}
