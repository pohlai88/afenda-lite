import { drizzleAllocationMethods } from "../../features/allocations/allocations.drizzle";
import { drizzleCreditNoteMethods } from "../../features/credit-notes/credit-notes.drizzle";
import { drizzleInvoiceLifecycleMethods } from "../../features/invoice-lifecycle/invoice-lifecycle.drizzle";
import { drizzleSupplierBalanceMethods } from "../../features/supplier-balance/supplier-balance.drizzle";
import { composeStoreSlices } from "../store/compose-slices";
import type { PayablesStore } from "../store/contract";

export type DrizzlePayablesStore = PayablesStore;

export function createDrizzlePayablesStore(): DrizzlePayablesStore {
	return composeStoreSlices(
		drizzleInvoiceLifecycleMethods,
		drizzleCreditNoteMethods,
		drizzleAllocationMethods,
		drizzleSupplierBalanceMethods,
	) satisfies PayablesStore;
}
