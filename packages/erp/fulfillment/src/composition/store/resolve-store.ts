import { createDrizzleFulfillmentStore } from "../../features/deliveries/deliveries.drizzle";
import type { FulfillmentStore } from "../../features/deliveries/deliveries.store";

let cached: FulfillmentStore | undefined;

export function resolveFulfillmentStore(
	store?: FulfillmentStore,
): FulfillmentStore {
	if (store !== undefined) {
		return store;
	}
	if (cached === undefined) {
		cached = createDrizzleFulfillmentStore();
	}
	return cached;
}
