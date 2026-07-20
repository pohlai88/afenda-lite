import { createDrizzleFulfillmentStore } from "./drizzle-store";
import type { FulfillmentStore } from "./store";

let cached: FulfillmentStore | undefined;

export function resolveFulfillmentStore(
	store?: FulfillmentStore,
): FulfillmentStore {
	if (store !== undefined) return store;
	if (cached === undefined) cached = createDrizzleFulfillmentStore();
	return cached;
}
