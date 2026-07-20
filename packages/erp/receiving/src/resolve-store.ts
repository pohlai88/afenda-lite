import { createDrizzleReceivingStore } from "./drizzle-store";
import type { ReceivingStore } from "./store";

let cached: ReceivingStore | undefined;

export function resolveReceivingStore(store?: ReceivingStore): ReceivingStore {
	if (store !== undefined) return store;
	if (cached === undefined) cached = createDrizzleReceivingStore();
	return cached;
}
