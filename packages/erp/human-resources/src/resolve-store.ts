import { createDrizzleHumanResourcesStore } from "./adapters/drizzle";
import { MemoryHumanResourcesStore } from "./memory-store";
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

export { MemoryHumanResourcesStore };
