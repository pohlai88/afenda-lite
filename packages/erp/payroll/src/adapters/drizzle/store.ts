import type { PayrollStore } from "../../store";
import { drizzleAssignmentsMethods } from "./assignments";
import { composeStoreSlices } from "./compose";
import { drizzleInputsMethods } from "./inputs";
import { drizzleOutputsMethods } from "./outputs";
import { drizzleReconciliationMethods } from "./reconciliation";
import { drizzleRunsMethods } from "./runs";
import { drizzleSetupMethods } from "./setup";
import { drizzleStatutoryMethods } from "./statutory";

/** Composition root only. Domain persistence lives in one adapter per payroll subdomain. */
export function createDrizzlePayrollStore(): PayrollStore {
	const store = composeStoreSlices(
		drizzleSetupMethods,
		drizzleAssignmentsMethods,
		drizzleInputsMethods,
		drizzleRunsMethods,
		drizzleStatutoryMethods,
		drizzleOutputsMethods,
		drizzleReconciliationMethods,
	);

	return store satisfies PayrollStore;
}
