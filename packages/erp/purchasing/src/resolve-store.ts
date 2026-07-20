import { createDrizzlePurchasingStore } from "./drizzle-store";
import type { PurchasingStore } from "./store";

let cached: PurchasingStore | undefined;

export function resolvePurchasingStore(
	store?: PurchasingStore,
): PurchasingStore {
	if (store !== undefined) {
		return store;
	}
	if (cached === undefined) {
		cached = createDrizzlePurchasingStore();
	}
	return cached;
}
