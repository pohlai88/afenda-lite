import type { CorporateAdministrationStore } from "../../ports";

import { createDrizzleLegalCompanyStore } from "./company-store";
import { createDrizzleGovernanceStore } from "./governance-store";
import { createDrizzleSlicesStore } from "./slices-store";

export function createDrizzleCorporateAdministrationStore(): CorporateAdministrationStore {
	return {
		...createDrizzleLegalCompanyStore(),
		...createDrizzleGovernanceStore(),
		...createDrizzleSlicesStore(),
	};
}
