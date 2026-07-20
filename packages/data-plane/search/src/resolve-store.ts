import { createDrizzleSearchStore } from "./drizzle-store";
import type { SearchStore } from "./store";

/** Default production store; tests inject MemorySearchStore. */
export function resolveSearchStore(store?: SearchStore): SearchStore {
	return store ?? createDrizzleSearchStore();
}
