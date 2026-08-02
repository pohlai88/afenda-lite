import { createDrizzlePayablesStore } from "../adapters/drizzle";
import type { PayablesStore } from "./contract";

let cached: PayablesStore | undefined;
export function resolvePayablesStore(store?: PayablesStore): PayablesStore {
	if (store !== undefined) {
		return store;
	}
	if (cached === undefined) {
		cached = createDrizzlePayablesStore();
	}
	return cached;
}
