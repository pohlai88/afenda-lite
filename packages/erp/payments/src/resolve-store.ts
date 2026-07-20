import { createDrizzlePaymentsStore } from "./drizzle-store";
import type { PaymentsStore } from "./model";

let cached: PaymentsStore | undefined;
export function resolvePaymentsStore(store?: PaymentsStore): PaymentsStore {
	if (store !== undefined) return store;
	if (cached === undefined) cached = createDrizzlePaymentsStore();
	return cached;
}
