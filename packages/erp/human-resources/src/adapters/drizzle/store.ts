import type { HumanResourcesStore } from "../../store";
import { drizzleCompensationBenefitsMethods } from "./compensation-benefits";
import { drizzleComplianceMethods } from "./compliance";
import { composeStoreSlices } from "./compose";
import { drizzleCoreMethods } from "./core";
import { drizzleEmployeeRelationsMethods } from "./employee-relations";
import { drizzleLearningMethods } from "./learning";
import { drizzleLeaveMethods } from "./leave";
import { drizzleLifecycleMethods } from "./lifecycle";
import { drizzleOrganizationMethods } from "./organization";
import { drizzlePerformanceMethods } from "./performance";
import { drizzleRecruitmentMethods } from "./recruitment";
import { drizzleTalentMethods } from "./talent";
import { drizzleWorkforcePlanningMethods } from "./workforce-planning";

/** Composition root only. Domain persistence lives in one adapter per HR subdomain. */
export function createDrizzleHumanResourcesStore(): HumanResourcesStore {
	const store = composeStoreSlices(
		drizzleCoreMethods,
		drizzleOrganizationMethods,
		drizzleRecruitmentMethods,
		drizzleLifecycleMethods,
		drizzleLeaveMethods,
		drizzleCompensationBenefitsMethods,
		drizzlePerformanceMethods,
		drizzleLearningMethods,
		drizzleTalentMethods,
		drizzleWorkforcePlanningMethods,
		drizzleComplianceMethods,
		drizzleEmployeeRelationsMethods,
	);

	return store satisfies HumanResourcesStore;
}

/** @deprecated Use `createDrizzleHumanResourcesStore()` — thin alias for legacy imports. */
export const DrizzleHumanResourcesStore = createDrizzleHumanResourcesStore;
