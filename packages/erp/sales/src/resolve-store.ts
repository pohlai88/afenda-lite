import { createDrizzleSalesStore } from "./adapters/drizzle/store";
import type { SalesStore } from "./ports";
export function resolveSalesStore(store?: SalesStore): SalesStore {
	return store ?? createDrizzleSalesStore();
}
