import { createDrizzleInventoryStore } from "./drizzle-store";
import type { InventoryStore } from "./store";

let cached: InventoryStore | undefined;

export function resolveInventoryStore(store?: InventoryStore): InventoryStore {
	if (store !== undefined) {
		return store;
	}
	if (cached === undefined) {
		cached = createDrizzleInventoryStore();
	}
	return cached;
}
