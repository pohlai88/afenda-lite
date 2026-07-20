import { createDrizzleEventStore } from "./drizzle-store";
import type { EventStore } from "./store";

export function resolveEventStore(store?: EventStore): EventStore {
	return store ?? createDrizzleEventStore();
}
