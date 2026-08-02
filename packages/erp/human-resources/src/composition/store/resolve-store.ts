import { createDrizzleHumanResourcesStore } from "../adapters/drizzle/index";
import type { HumanResourcesStore } from "./index";

export type { MemoryHumanResourcesStore } from "../adapters/memory/store";

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
