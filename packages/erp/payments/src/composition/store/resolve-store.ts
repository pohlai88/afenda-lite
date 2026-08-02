import { createDrizzlePaymentsStore } from "../adapters/drizzle";
import type { PaymentsStore } from "./contract";

let cached: PaymentsStore | undefined;
export function resolvePaymentsStore(store?: PaymentsStore): PaymentsStore {
	if (store !== undefined) {
		return store;
	}
	if (cached === undefined) {
		cached = createDrizzlePaymentsStore();
	}
	return cached;
}
