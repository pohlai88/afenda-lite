import { composeStoreSlices } from "../composition/store/compose-slices";
import type { PayablesStore } from "../composition/store/contract";
import { createMemoryAllocationMethods } from "../features/allocations/allocations.memory";
import { createMemoryCreditNoteMethods } from "../features/credit-notes/credit-notes.memory";
import { createMemoryInvoiceLifecycleMethods } from "../features/invoice-lifecycle/invoice-lifecycle.memory";
import { createMemorySupplierBalanceMethods } from "../features/supplier-balance/supplier-balance.memory";
import { createMemoryPayablesState } from "../kernel/memory/state";

export type MemoryPayablesStore = PayablesStore;

/**
 * Deterministic contract-test adapter with no concurrent transaction isolation.
 * Command rollback is explicit per mutation; nested transactions are unsupported.
 * It mirrors domain behavior, not production database mechanics.
 */
export function createMemoryPayablesStore(): MemoryPayablesStore {
	const state = createMemoryPayablesState();
	return composeStoreSlices(
		createMemoryInvoiceLifecycleMethods(state),
		createMemoryCreditNoteMethods(state),
		createMemoryAllocationMethods(state),
		createMemorySupplierBalanceMethods(state),
	) satisfies PayablesStore;
}
