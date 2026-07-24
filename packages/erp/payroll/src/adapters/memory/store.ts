import type { PayrollStore } from "../../store";
import { composeStoreSlices } from "../drizzle/compose";
import { drizzleReconciliationMethods } from "../drizzle/reconciliation";
import {
	createMemoryAssignmentsMethods,
	createMemoryInputsMethods,
} from "./assignments-inputs";
import { createMemoryOutputsMethods } from "./outputs";
import { createMemoryRunsMethods } from "./runs";
import { createMemorySetupMethods } from "./setup";
import { createMemoryStatutoryMethods } from "./statutory";
import {
	createMemoryPayrollStoreState,
	type MemoryPayrollStoreState,
	resetMemoryPayrollStoreState,
} from "./state";

export type MemoryPayrollStore = PayrollStore & {
	readonly state: MemoryPayrollStoreState;
	reset(): void;
};

/** Composition root for Vitest and local harnesses. */
export function createMemoryPayrollStore(): MemoryPayrollStore {
	const state = createMemoryPayrollStoreState();

	const store = composeStoreSlices(
		createMemorySetupMethods(state.setup),
		createMemoryAssignmentsMethods(state.assignments),
		createMemoryInputsMethods(state.inputs),
		createMemoryRunsMethods(state.runs),
		createMemoryStatutoryMethods({
			statutory: state.statutory,
			runs: state.runs,
		}),
		createMemoryOutputsMethods({
			outputs: state.outputs,
			runs: state.runs,
		}),
		drizzleReconciliationMethods,
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
