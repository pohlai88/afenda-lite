import { createDrizzleReceivablesStore } from "../../features/invoices/invoices.drizzle";
import type { ReceivablesStore } from "../../features/invoices/invoices.store";

let productionStore: ReceivablesStore | undefined;

export function resolveReceivablesStore(
	store?: ReceivablesStore,
): ReceivablesStore {
	if (store !== undefined) {
		return store;
	}
	productionStore ??= createDrizzleReceivablesStore();
	return productionStore;
}
