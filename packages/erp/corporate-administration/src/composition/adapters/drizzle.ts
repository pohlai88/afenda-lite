import { drizzleEstablishmentsMethods } from "../../features/entity-administration/establishments/establishments.drizzle";
import { composeStoreSlices } from "../store/compose-slices";
import type { CorporateAdministrationStore } from "../store/contract";

export type DrizzleCorporateAdministrationStore = CorporateAdministrationStore;

export function createDrizzleCorporateAdministrationStore(): DrizzleCorporateAdministrationStore {
	return composeStoreSlices(
		drizzleEstablishmentsMethods,
	) satisfies CorporateAdministrationStore;
}
