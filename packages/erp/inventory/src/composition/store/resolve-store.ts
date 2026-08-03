import { createDrizzleInventoryStore } from "../../features/movements/movements.drizzle";
import type { InventoryStore } from "../../features/movements/movements.store";

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
