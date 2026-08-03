import { createDrizzleReceivingStore } from "../../features/receipts/receipts.drizzle";
import type { ReceivingStore } from "../../features/receipts/receipts.store";

let cached: ReceivingStore | undefined;

export function resolveReceivingStore(store?: ReceivingStore): ReceivingStore {
	if (store !== undefined) {
		return store;
	}
	if (cached === undefined) {
		cached = createDrizzleReceivingStore();
	}
	return cached;
}
