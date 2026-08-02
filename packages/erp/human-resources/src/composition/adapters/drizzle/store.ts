import { drizzleCompensationBenefitsMethods } from "../../../features/compensation-benefits/adapters/compensation-benefits.drizzle";
import { drizzleComplianceMethods } from "../../../features/compliance/adapters/compliance.drizzle";
import { drizzleEmployeeRelationsMethods } from "../../../features/employee-relations/adapters/employee-relations.drizzle";
import { drizzleLifecycleMethods } from "../../../features/employment-lifecycle/adapters/lifecycle.drizzle";
import { drizzleHireOrchestrationMethods } from "../../../features/hire-to-employee/adapters/hire-orchestration.drizzle";
import { drizzleLearningMethods } from "../../../features/learning/adapters/learning.drizzle";
import { drizzleLeaveMethods } from "../../../features/leave/adapters/leave.drizzle";
import { drizzleOrganizationMethods } from "../../../features/organization/adapters/organization.drizzle";
import { drizzlePerformanceMethods } from "../../../features/performance/adapters/performance.drizzle";
import { drizzleRecruitmentMethods } from "../../../features/recruitment/adapters/recruitment.drizzle";
import { drizzleTalentMethods } from "../../../features/talent/adapters/talent.drizzle";
import { drizzleTimeMethods } from "../../../features/time/adapters/time.drizzle";
import { drizzleWorkforcePlanningMethods } from "../../../features/workforce-planning/adapters/workforce-planning.drizzle";
import { drizzleCoreMethods } from "../../../features/workforce-records/employment/adapters/core.drizzle";
import { drizzleWorkforceFoundationMethods } from "../../../features/workforce-records/identity/adapters/workforce-foundation.drizzle";
import { drizzleIdentityMethods } from "../../../features/workforce-records/identity-resolution/adapters/identity.drizzle";
import { composeStoreSlices } from "../../store/compose";
import type { HumanResourcesStore } from "../../store/index";

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
		drizzleTimeMethods,
		drizzleWorkforcePlanningMethods,
		drizzleComplianceMethods,
		drizzleEmployeeRelationsMethods,
		drizzleWorkforceFoundationMethods,
		drizzleHireOrchestrationMethods,
		drizzleIdentityMethods,
	);

	return store satisfies HumanResourcesStore;
}
