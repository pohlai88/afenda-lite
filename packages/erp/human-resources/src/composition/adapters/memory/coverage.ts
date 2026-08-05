import type { MemoryCompensationBenefitsMethods } from "../../../features/compensation-benefits/adapters/compensation-benefits.memory";
import type { MemoryComplianceMethods } from "../../../features/compliance/adapters/compliance.memory";
import type { MemoryEmployeeRelationsMethods } from "../../../features/employee-relations/adapters/employee-relations.memory";
import type { MemoryLifecycleMethods } from "../../../features/employment-lifecycle/adapters/lifecycle.memory";
import type { MemoryLearningMethods } from "../../../features/learning/adapters/learning.memory";
import type { MemoryLeaveMethods } from "../../../features/leave/adapters/leave.memory";
import type { MemoryOrganizationMethods } from "../../../features/organization/adapters/organization.memory";
import type { PerformanceMemoryMethods } from "../../../features/performance/adapters/performance.memory";
import type { MemoryRecruitmentMethods } from "../../../features/recruitment/adapters/recruitment.memory";
import type { MemoryStatutoryProfileMethods } from "../../../features/statutory-profile/adapters/statutory-profile.memory";
import type { MemoryTalentMethods } from "../../../features/talent/adapters/talent.memory";
import type { HumanResourcesTimeStore } from "../../../features/time/store-contract";
import type { MemoryWorkforcePlanningMethods } from "../../../features/workforce-planning/adapters/workforce-planning.memory";
import type { MemoryCoreMethods } from "../../../features/workforce-records/employment/adapters/core.memory";
import type { HumanResourcesIdentityStore } from "../../../features/workforce-records/identity-resolution/store-contract";
import type { HumanResourcesStore } from "../../store/index";

/** Every method supplied by the composed in-memory time adapter. */
export type MemoryTimeMethods = HumanResourcesTimeStore;

/** Every method supplied by the composed in-memory identity adapter. */
export type MemoryIdentityMethods = HumanResourcesIdentityStore;

/** Every method currently supplied by the composed in-memory adapter. */
export type MemoryImplementedHumanResourcesMethods = MemoryCoreMethods &
	MemoryOrganizationMethods &
	MemoryRecruitmentMethods &
	MemoryLifecycleMethods &
	MemoryLeaveMethods &
	MemoryCompensationBenefitsMethods &
	PerformanceMemoryMethods &
	MemoryLearningMethods &
	MemoryTalentMethods &
	MemoryTimeMethods &
	MemoryWorkforcePlanningMethods &
	MemoryComplianceMethods &
	MemoryEmployeeRelationsMethods &
	MemoryStatutoryProfileMethods &
	MemoryIdentityMethods;

/**
 * Compile-time inventory of HumanResourcesStore methods without a memory owner.
 */
export type MissingMemoryHumanResourcesMethods = Exclude<
	keyof HumanResourcesStore,
	keyof MemoryImplementedHumanResourcesMethods
>;

/** Guards against a memory adapter declaring methods outside HumanResourcesStore. */
export type UnexpectedMemoryHumanResourcesMethods = Exclude<
	keyof MemoryImplementedHumanResourcesMethods,
	keyof HumanResourcesStore
>;
