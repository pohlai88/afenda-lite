import { createDrizzleHumanResourcesStore } from "./adapters/drizzle";
import type { HumanResourcesStore } from "./store";

export type { MemoryHumanResourcesStore } from "./adapters/memory/store";

let cached: HumanResourcesStore | undefined;

export function resolveHumanResourcesStore(
	store?: HumanResourcesStore,
): HumanResourcesStore {
	if (store !== undefined) {
		return store;
	}
	if (cached === undefined) {
		cached = createDrizzleHumanResourcesStore();
	}
	return cached;
}
