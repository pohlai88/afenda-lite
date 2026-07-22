import type { HumanResourcesStore } from "../../store";

import type { MemoryCompensationBenefitsMethods } from "./compensation-benefits";
import type { MemoryComplianceMethods } from "./compliance";
import type { MemoryCoreMethods } from "./core";
import type { MemoryEmployeeRelationsMethods } from "./employee-relations";
import type { MemoryLearningMethods } from "./learning";
import type { MemoryLeaveMethods } from "./leave";
import type { MemoryLifecycleMethods } from "./lifecycle";
import type { MemoryOrganizationMethods } from "./organization";
import type { PerformanceMemoryMethods } from "./performance";
import type { MemoryRecruitmentMethods } from "./recruitment";
import type { MemoryTalentMethods } from "./talent";
import type { MemoryWorkforcePlanningMethods } from "./workforce-planning";

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
	MemoryWorkforcePlanningMethods &
	MemoryComplianceMethods &
	MemoryEmployeeRelationsMethods;

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
