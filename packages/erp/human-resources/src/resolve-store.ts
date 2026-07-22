import { createDrizzleHumanResourcesStore } from "./adapters/drizzle";
import type { MemoryHumanResourcesStore } from "./adapters/memory/store";
import { createMemoryHumanResourcesStore } from "./adapters/memory/store";
import type { HumanResourcesStore } from "./store";

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

export type { MemoryHumanResourcesStore };
