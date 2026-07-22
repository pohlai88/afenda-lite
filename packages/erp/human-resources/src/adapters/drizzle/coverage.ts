import type { HumanResourcesStore } from "../../store";

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
	DrizzleWorkforcePlanningMethods &
	DrizzleComplianceMethods &
	DrizzleEmployeeRelationsMethods;

/**
 * Compile-time inventory of HumanResourcesStore methods without a Drizzle owner.
 * Time persistence remains blocked until store methods and DDL exist.
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
