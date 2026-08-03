import { createDrizzlePurchasingStore } from "../../features/orders/orders.drizzle";
import type { PurchasingStore } from "../../features/orders/orders.store";

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
