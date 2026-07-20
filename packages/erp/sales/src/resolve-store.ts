import { createDrizzleSalesStore } from "./drizzle-store";
import type { SalesStore } from "./store";

let cached: SalesStore | undefined;

export function resolveSalesStore(store?: SalesStore): SalesStore {
	if (store !== undefined) {
		return store;
	}
	if (cached === undefined) {
		cached = createDrizzleSalesStore();
	}
	return cached;
}
