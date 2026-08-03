import { composeStoreSlices } from "../composition/store/compose-slices";
import type { CorporateAdministrationStore } from "../composition/store/contract";
import { createMemoryEstablishmentsMethods } from "../features/entity-administration/establishments/establishments.memory";
import { createMemoryCorporateAdministrationState } from "../kernel/memory/state";

/** Deterministic contract-test adapter mirroring domain behavior. */
export function createMemoryStore(): CorporateAdministrationStore {
	const state = createMemoryCorporateAdministrationState();
	return composeStoreSlices(
		createMemoryEstablishmentsMethods(state),
	) satisfies CorporateAdministrationStore;
}
