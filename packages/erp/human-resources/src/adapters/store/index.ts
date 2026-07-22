import type { HumanResourcesCoreStore } from "./core";
import type { HumanResourcesRecruitmentStore } from "./recruitment";
import type { HumanResourcesLifecycleStore } from "./lifecycle";
import type { HumanResourcesCompensationStore } from "./compensation";
import type { HumanResourcesLearningStore } from "./learning";
import type { HumanResourcesLeaveStore } from "./leave";
import type { HumanResourcesComplianceStore } from "./compliance";
import type { HumanResourcesPerformanceStore } from "./performance";
import type { HumanResourcesEmployeeRelationsStore } from "./employee-relations";
import type { HumanResourcesWorkforcePlanningStore } from "./workforce-planning";
import type { HumanResourcesTalentStore } from "./talent";

export * from "./core";
export * from "./recruitment";
export * from "./lifecycle";
export * from "./compensation";
export * from "./learning";
export * from "./leave";
export * from "./compliance";
export * from "./performance";
export * from "./employee-relations";
export * from "./workforce-planning";
export * from "./talent";

/**
 * Complete Human Resources persistence contract.
 *
 * Transaction semantics for mutations:
 * - Atomic unit = aggregate row + audit fact + optional outbox event.
 * - Memory adapters write, invoke ports, and roll back in-memory state on port failure.
 * - Drizzle adapters persist the aggregate, audit, and outbox records in one transaction.
 *
 * Existing adapters may continue to implement this aggregate type. New domain-specific
 * adapters and tests should depend on the smallest store slice they actually use.
 */
export type HumanResourcesStore =
	HumanResourcesCoreStore &
	HumanResourcesRecruitmentStore &
	HumanResourcesLifecycleStore &
	HumanResourcesCompensationStore &
	HumanResourcesLearningStore &
	HumanResourcesLeaveStore &
	HumanResourcesComplianceStore &
	HumanResourcesPerformanceStore &
	HumanResourcesEmployeeRelationsStore &
	HumanResourcesWorkforcePlanningStore &
	HumanResourcesTalentStore;
