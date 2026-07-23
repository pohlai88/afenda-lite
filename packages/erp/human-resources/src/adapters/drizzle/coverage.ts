import type { HumanResourcesStore } from "../../store";
import type { HumanResourcesIdentityStore } from "../../store/identity";
import type { HumanResourcesTimeStore } from "../../store/time";

import type { DrizzleCompensationBenefitsMethods } from "./compensation-benefits";
import type { DrizzleComplianceMethods } from "./compliance";
import type { DrizzleCoreMethods } from "./core";
import type { DrizzleEmployeeRelationsMethods } from "./employee-relations";
import type { DrizzleLearningMethods } from "./learning";
import type { DrizzleLeaveMethods } from "./leave";
import type { DrizzleLifecycleMethods } from "./lifecycle";
import type { DrizzleOrganizationMethods } from "./organization";
import type { DrizzlePerformanceMethods } from "./performance";
import type { DrizzleRecruitmentMethods } from "./recruitment";
import type { DrizzleTalentMethods } from "./talent";
import type { DrizzleWorkforcePlanningMethods } from "./workforce-planning";

/** Every method supplied by the composed Drizzle time adapter. */
export type DrizzleTimeMethods = HumanResourcesTimeStore;

/** Every method supplied by the composed Drizzle identity adapter. */
export type DrizzleIdentityMethods = HumanResourcesIdentityStore;

/** Every method currently supplied by the composed Drizzle adapter. */
export type DrizzleImplementedHumanResourcesMethods = DrizzleCoreMethods &
	DrizzleOrganizationMethods &
	DrizzleRecruitmentMethods &
	DrizzleLifecycleMethods &
	DrizzleLeaveMethods &
	DrizzleCompensationBenefitsMethods &
	DrizzlePerformanceMethods &
	DrizzleLearningMethods &
	DrizzleTalentMethods &
	DrizzleTimeMethods &
	DrizzleWorkforcePlanningMethods &
	DrizzleComplianceMethods &
	DrizzleEmployeeRelationsMethods &
	DrizzleIdentityMethods;

/**
 * Compile-time inventory of HumanResourcesStore methods without a Drizzle owner.
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
