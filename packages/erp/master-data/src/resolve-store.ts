import { createDrizzleMasterDataStore } from "./drizzle-store";
import type { MasterDataStore } from "./store";

/** Default production store; tests inject MemoryMasterDataStore. */
export function resolveMasterDataStore(
	store?: MasterDataStore,
): MasterDataStore {
	return store ?? createDrizzleMasterDataStore();
}
