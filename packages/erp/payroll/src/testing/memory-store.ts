import { composeStoreSlices } from "../composition/store/compose-slices";
import type { PayrollStore } from "../composition/store/contract";
import { createMemoryOutputsMethods } from "../features/calculation/outputs.memory";
import { createMemoryAssignmentsMethods } from "../features/employee-assignments/assignments.memory";
import { createMemoryRunsMethods } from "../features/payroll-runs/runs.memory";
import { createMemorySetupMethods } from "../features/payroll-setup/setup.memory";
import { createMemoryReconciliationMethods } from "../features/reconciliation/reconciliation.memory";
import { createMemoryStatutoryMethods } from "../features/statutory-rules/statutory.memory";
import { createMemoryInputsMethods } from "../features/variable-inputs/inputs.memory";
import { createMemoryWorkforceIngressMethods } from "../features/workforce-ingress/accepted-handoff.memory";
import {
	createMemoryPayrollStoreState,
	type MemoryPayrollStoreState,
	resetMemoryPayrollStoreState,
} from "./memory-store-state";

export type MemoryPayrollStore = PayrollStore & {
	readonly state: MemoryPayrollStoreState;
	reset: () => void;
};

/** Composition root for Vitest and local harnesses. */
export function createMemoryPayrollStore(): MemoryPayrollStore {
	const state = createMemoryPayrollStoreState();

	const store = composeStoreSlices(
		createMemorySetupMethods(state.setup),
		createMemoryAssignmentsMethods(state.assignments),
		createMemoryInputsMethods(state.inputs),
		createMemoryRunsMethods(state),
		createMemoryStatutoryMethods({
			statutory: state.statutory,
			runs: state.runs,
		}),
		createMemoryOutputsMethods({
			outputs: state.outputs,
			runs: state.runs,
		}),
		createMemoryReconciliationMethods(state),
		createMemoryWorkforceIngressMethods(state.workforceIngress),
	) as MemoryPayrollStore;

	Object.defineProperty(store, "state", {
		value: state,
		enumerable: true,
	});

	store.reset = () => {
		resetMemoryPayrollStoreState(state);
	};

	return store satisfies MemoryPayrollStore;
}
