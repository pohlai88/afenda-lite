import { createDrizzleReceivablesStore } from "./drizzle-store";
import type { ReceivablesStore } from "./store";

let productionStore: ReceivablesStore | undefined;

export function resolveReceivablesStore(
	store?: ReceivablesStore,
): ReceivablesStore {
	if (store !== undefined) return store;
	productionStore ??= createDrizzleReceivablesStore();
	return productionStore;
}
