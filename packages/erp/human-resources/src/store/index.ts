// Store exports barrel for human resources

import type { HumanResourcesCompensationStore } from "./compensation";
import type { HumanResourcesComplianceStore } from "./compliance";
// Import all domain store types locally for composition
import type { HumanResourcesCoreStore } from "./core";
import type { HumanResourcesEmployeeRelationsStore } from "./employee-relations";
import type { HumanResourcesLearningStore } from "./learning";
import type { HumanResourcesLeaveStore } from "./leave";
import type { HumanResourcesLifecycleStore } from "./lifecycle";
import type { HumanResourcesPerformanceStore } from "./performance";
import type { HumanResourcesRecruitmentStore } from "./recruitment";
import type { HumanResourcesTalentStore } from "./talent";
import type { HumanResourcesWorkforcePlanningStore } from "./workforce-planning";

// Composite store type combining all domain stores
export type HumanResourcesStore = HumanResourcesCoreStore &
	HumanResourcesRecruitmentStore &
	HumanResourcesLifecycleStore &
	HumanResourcesCompensationStore &
	HumanResourcesLearningStore &
	HumanResourcesLeaveStore &
	HumanResourcesPerformanceStore &
	HumanResourcesTalentStore &
	HumanResourcesComplianceStore &
	HumanResourcesEmployeeRelationsStore &
	HumanResourcesWorkforcePlanningStore;

export type { HumanResourcesCompensationStore } from "./compensation";
export * from "./compensation";
export type { HumanResourcesComplianceStore } from "./compliance";
export * from "./compliance";
// Re-export domain store types
export type { HumanResourcesCoreStore } from "./core";
// Re-export domain store implementations
export * from "./core";
export type { HumanResourcesEmployeeRelationsStore } from "./employee-relations";
export * from "./employee-relations";
export type { HumanResourcesLearningStore } from "./learning";
export * from "./learning";
export type { HumanResourcesLeaveStore } from "./leave";
export * from "./leave";
export type { HumanResourcesLifecycleStore } from "./lifecycle";
export * from "./lifecycle";
export type { HumanResourcesPerformanceStore } from "./performance";
export * from "./performance";
export type { HumanResourcesRecruitmentStore } from "./recruitment";
export * from "./recruitment";
export type { HumanResourcesTalentStore } from "./talent";
export * from "./talent";
export type { HumanResourcesWorkforcePlanningStore } from "./workforce-planning";
export * from "./workforce-planning";
