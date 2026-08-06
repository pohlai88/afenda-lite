// Store exports barrel for human resources

import type { HumanResourcesCompensationStore } from "../../features/compensation-benefits/store-contract";
import type { HumanResourcesComplianceStore } from "../../features/compliance/store-contract";
import type { HumanResourcesEmployeeRelationsStore } from "../../features/employee-relations/store-contract";
import type { HumanResourcesLifecycleStore } from "../../features/employment-lifecycle/store-contract";
import type { HumanResourcesHireOrchestrationStore } from "../../features/hire-to-employee/store-contract";
import type { HumanResourcesLearningStore } from "../../features/learning/store-contract";
import type { HumanResourcesLeaveStore } from "../../features/leave/store-contract";
import type { HumanResourcesPerformanceStore } from "../../features/performance/store-contract";
import type { HumanResourcesRecruitmentStore } from "../../features/recruitment/store-contract";
import type { HumanResourcesStatutoryProfileStore } from "../../features/statutory-profile/store-contract";
import type { HumanResourcesTalentStore } from "../../features/talent/store-contract";
import type { HumanResourcesTimeStore } from "../../features/time/store-contract";
import type { HumanResourcesWorkforcePlanningStore } from "../../features/workforce-planning/store-contract";
// Import all domain store types locally for composition
import type { HumanResourcesCoreStore } from "../../features/workforce-records/employment/store-contract";
import type { HumanResourcesWorkforceFoundationStore } from "../../features/workforce-records/identity/store-contract";
import type { HumanResourcesIdentityStore } from "../../features/workforce-records/identity-resolution/store-contract";

// Composite store type combining all domain stores
export type HumanResourcesStore = HumanResourcesCoreStore &
	HumanResourcesRecruitmentStore &
	HumanResourcesLifecycleStore &
	HumanResourcesHireOrchestrationStore &
	HumanResourcesCompensationStore &
	HumanResourcesLearningStore &
	HumanResourcesLeaveStore &
	HumanResourcesPerformanceStore &
	HumanResourcesTalentStore &
	HumanResourcesComplianceStore &
	HumanResourcesEmployeeRelationsStore &
	HumanResourcesTimeStore &
	HumanResourcesWorkforcePlanningStore &
	HumanResourcesIdentityStore &
	HumanResourcesStatutoryProfileStore &
	HumanResourcesWorkforceFoundationStore;

export type { HumanResourcesCompensationStore } from "../../features/compensation-benefits/store-contract";
export * from "../../features/compensation-benefits/store-contract";
export type { HumanResourcesComplianceStore } from "../../features/compliance/store-contract";
export * from "../../features/compliance/store-contract";
export type { HumanResourcesEmployeeRelationsStore } from "../../features/employee-relations/store-contract";
export * from "../../features/employee-relations/store-contract";
export type { HumanResourcesLifecycleStore } from "../../features/employment-lifecycle/store-contract";
export * from "../../features/employment-lifecycle/store-contract";
export type { HumanResourcesHireOrchestrationStore } from "../../features/hire-to-employee/store-contract";
export * from "../../features/hire-to-employee/store-contract";
export type { HumanResourcesLearningStore } from "../../features/learning/store-contract";
export * from "../../features/learning/store-contract";
export type { HumanResourcesLeaveStore } from "../../features/leave/store-contract";
export * from "../../features/leave/store-contract";
export type { HumanResourcesPerformanceStore } from "../../features/performance/store-contract";
export * from "../../features/performance/store-contract";
export type { HumanResourcesRecruitmentStore } from "../../features/recruitment/store-contract";
export * from "../../features/recruitment/store-contract";
export type { HumanResourcesStatutoryProfileStore } from "../../features/statutory-profile/store-contract";
export * from "../../features/statutory-profile/store-contract";
export type { HumanResourcesTalentStore } from "../../features/talent/store-contract";
export * from "../../features/talent/store-contract";
export type { HumanResourcesTimeStore } from "../../features/time/store-contract";
export * from "../../features/time/store-contract";
export type { HumanResourcesWorkforcePlanningStore } from "../../features/workforce-planning/store-contract";
export * from "../../features/workforce-planning/store-contract";
// Re-export domain store types
export type { HumanResourcesCoreStore } from "../../features/workforce-records/employment/store-contract";
// Re-export domain store implementations
export * from "../../features/workforce-records/employment/store-contract";
export type { HumanResourcesWorkforceFoundationStore } from "../../features/workforce-records/identity/store-contract";
export * from "../../features/workforce-records/identity/store-contract";
export type { HumanResourcesIdentityStore } from "../../features/workforce-records/identity-resolution/store-contract";
export * from "../../features/workforce-records/identity-resolution/store-contract";
