import type { HumanResourcesStore } from "../../store";

import type { DrizzleCompensationMethods } from "./compensation";
import type { DrizzleComplianceMethods } from "./compliance";
import type { DrizzleCoreMethods } from "./core";
import type { DrizzleEmployeeRelationsMethods } from "./employee-relations";
import type { DrizzleLearningMethods } from "./learning";
import type { DrizzleLeaveMethods } from "./leave";
import type { DrizzleLifecycleMethods } from "./lifecycle";
import type { DrizzleOrganizationMethods } from "./organization";
import type { DrizzlePerformanceMethods } from "./performance";
import type { DrizzleRecruitmentMethods } from "./recruitment";
import type { DrizzleWorkforcePlanningMethods } from "./workforce-planning";

/** Every method currently supplied by the composed Drizzle adapter. */
export type DrizzleImplementedHumanResourcesMethods =
	& DrizzleCoreMethods
	& DrizzleOrganizationMethods
	& DrizzleRecruitmentMethods
	& DrizzleLifecycleMethods
	& DrizzleLeaveMethods
	& DrizzleCompensationMethods
	& DrizzlePerformanceMethods
	& DrizzleLearningMethods
	& DrizzleWorkforcePlanningMethods
	& DrizzleComplianceMethods
	& DrizzleEmployeeRelationsMethods;

/**
 * Compile-time inventory of HumanResourcesStore methods without a Drizzle owner.
 * This should currently expose the authoritative time and talent gaps, if those
 * contracts are already present in HumanResourcesStore.
 */
export type MissingDrizzleHumanResourcesMethods = Exclude<
	keyof HumanResourcesStore,
	keyof DrizzleImplementedHumanResourcesMethods
>;

/** Guards against an adapter declaring methods outside HumanResourcesStore. */
export type UnexpectedDrizzleHumanResourcesMethods = Exclude<
	keyof DrizzleImplementedHumanResourcesMethods,
	keyof HumanResourcesStore
>;
