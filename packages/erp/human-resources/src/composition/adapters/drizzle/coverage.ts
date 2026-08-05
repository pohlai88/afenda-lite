import type { DrizzleCompensationBenefitsMethods } from "../../../features/compensation-benefits/adapters/compensation-benefits.drizzle";
import type { DrizzleComplianceMethods } from "../../../features/compliance/adapters/compliance.drizzle";
import type { DrizzleEmployeeRelationsMethods } from "../../../features/employee-relations/adapters/employee-relations.drizzle";
import type { DrizzleLifecycleMethods } from "../../../features/employment-lifecycle/adapters/lifecycle.drizzle";
import type { DrizzleLearningMethods } from "../../../features/learning/adapters/learning.drizzle";
import type { DrizzleLeaveMethods } from "../../../features/leave/adapters/leave.drizzle";
import type { DrizzleOrganizationMethods } from "../../../features/organization/adapters/organization.drizzle";
import type { DrizzlePerformanceMethods } from "../../../features/performance/adapters/performance.drizzle";
import type { DrizzleRecruitmentMethods } from "../../../features/recruitment/adapters/recruitment.drizzle";
import type { DrizzleStatutoryProfileMethods } from "../../../features/statutory-profile/adapters/statutory-profile.drizzle";
import type { DrizzleTalentMethods } from "../../../features/talent/adapters/talent.drizzle";
import type { HumanResourcesTimeStore } from "../../../features/time/store-contract";
import type { DrizzleWorkforcePlanningMethods } from "../../../features/workforce-planning/adapters/workforce-planning.drizzle";
import type { DrizzleCoreMethods } from "../../../features/workforce-records/employment/adapters/core.drizzle";
import type { HumanResourcesIdentityStore } from "../../../features/workforce-records/identity-resolution/store-contract";
import type { HumanResourcesStore } from "../../store/index";

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
	DrizzleStatutoryProfileMethods &
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
