import type { MasterDataStore } from "./capabilities/core-organization-masters/store";
import { createDrizzleMasterDataStore } from "./drizzle-store";

/** Default production store; tests inject MemoryMasterDataStore. */
export function resolveMasterDataStore(
	store?: MasterDataStore,
): MasterDataStore {
	return store ?? createDrizzleMasterDataStore();
}
