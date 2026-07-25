import { createDrizzleCorporateAdministrationStore } from "./adapters/drizzle/store";
import type { CorporateAdministrationStore } from "./ports";

let cached: CorporateAdministrationStore | undefined;

export function resolveCorporateAdministrationStore(
	store?: CorporateAdministrationStore,
): CorporateAdministrationStore {
	if (store !== undefined) {
		return store;
	}
	if (cached === undefined) {
		cached = createDrizzleCorporateAdministrationStore();
	}
	return cached;
}
