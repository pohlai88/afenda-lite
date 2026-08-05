import {
	type CompensationBenefitsMemoryState,
	createCompensationBenefitsMemoryState,
	createMemoryCompensationBenefitsMethods,
	resetCompensationBenefitsMemoryState,
} from "../../../features/compensation-benefits/adapters/compensation-benefits.memory";
import {
	type ComplianceMemoryState,
	createComplianceMemoryState,
	createMemoryComplianceMethods,
	resetComplianceMemoryState,
} from "../../../features/compliance/adapters/compliance.memory";
import {
	createEmployeeRelationsMemoryState,
	createMemoryEmployeeRelationsMethods,
	type EmployeeRelationsMemoryState,
	resetEmployeeRelationsMemoryState,
} from "../../../features/employee-relations/adapters/employee-relations.memory";
import {
	createLifecycleMemoryState,
	createMemoryLifecycleMethods,
	type LifecycleMemoryState,
	resetLifecycleMemoryState,
} from "../../../features/employment-lifecycle/adapters/lifecycle.memory";
import {
	createHireOrchestrationMemoryState,
	createMemoryHireOrchestrationMethods,
	type HireOrchestrationMemoryState,
	resetHireOrchestrationMemoryState,
} from "../../../features/hire-to-employee/adapters/hire-orchestration.memory";
import {
	createLearningMemoryState,
	createMemoryLearningMethods,
	type LearningMemoryState,
	resetLearningMemoryState,
} from "../../../features/learning/adapters/learning.memory";
import {
	createLeaveMemoryState,
	createMemoryLeaveMethods,
	type LeaveMemoryState,
	resetLeaveMemoryState,
} from "../../../features/leave/adapters/leave.memory";
import {
	createMemoryOrganizationMethods,
	createOrganizationMemoryState,
	type OrganizationMemoryState,
	resetOrganizationMemoryState,
} from "../../../features/organization/adapters/organization.memory";
import {
	createMemoryPerformanceMethods,
	createPerformanceMemoryState,
	type PerformanceMemoryState,
	resetPerformanceMemoryState,
} from "../../../features/performance/adapters/performance.memory";
import {
	createMemoryRecruitmentMethods,
	createRecruitmentMemoryState,
	type RecruitmentMemoryState,
	resetRecruitmentMemoryState,
} from "../../../features/recruitment/adapters/recruitment.memory";
import {
	createMemoryStatutoryProfileMethods,
	createStatutoryProfileMemoryState,
	resetStatutoryProfileMemoryState,
	type StatutoryProfileMemoryState,
} from "../../../features/statutory-profile/adapters/statutory-profile.memory";
import {
	createMemoryTalentMethods,
	createTalentMemoryState,
	resetTalentMemoryState,
	type TalentMemoryState,
} from "../../../features/talent/adapters/talent.memory";
import {
	createMemoryTimeMethods,
	createTimeMemoryState,
	resetTimeMemoryState,
	type TimeMemoryState,
} from "../../../features/time/adapters/time.memory";
import {
	createMemoryWorkforcePlanningMethods,
	createWorkforcePlanningMemoryState,
	resetWorkforcePlanningMemoryState,
	type WorkforcePlanningMemoryState,
} from "../../../features/workforce-planning/adapters/workforce-planning.memory";
import {
	type CoreMemoryState,
	createCoreMemoryState,
	createMemoryCoreMethods,
	resetCoreMemoryState,
} from "../../../features/workforce-records/employment/adapters/core.memory";
import {
	createMemoryWorkforceFoundationMethods,
	createWorkforceFoundationMemoryState,
	resetWorkforceFoundationMemoryState,
	type WorkforceFoundationMemoryState,
} from "../../../features/workforce-records/identity/adapters/workforce-foundation.memory";
import { createMemoryHumanResourcesIdentityStore } from "../../../features/workforce-records/identity-resolution/adapters/identity.memory";
import { composeStoreSlices } from "../../store/compose";
import type { HumanResourcesStore } from "../../store/index";

export interface MemoryHumanResourcesStoreState {
	compensationBenefits: CompensationBenefitsMemoryState;
	compliance: ComplianceMemoryState;
	core: CoreMemoryState;
	employeeRelations: EmployeeRelationsMemoryState;
	hireOrchestration: HireOrchestrationMemoryState;
	learning: LearningMemoryState;
	leave: LeaveMemoryState;
	lifecycle: LifecycleMemoryState;
	organization: OrganizationMemoryState;
	performance: PerformanceMemoryState;
	recruitment: RecruitmentMemoryState;
	statutoryProfile: StatutoryProfileMemoryState;
	talent: TalentMemoryState;
	time: TimeMemoryState;
	workforceFoundation: WorkforceFoundationMemoryState;
	workforcePlanning: WorkforcePlanningMemoryState;
}

export type MemoryHumanResourcesStore = HumanResourcesStore & {
	readonly state: MemoryHumanResourcesStoreState;
	reset: () => void;
};

function createMemoryHumanResourcesStoreState(): MemoryHumanResourcesStoreState {
	return {
		core: createCoreMemoryState(),
		organization: createOrganizationMemoryState(),
		recruitment: createRecruitmentMemoryState(),
		lifecycle: createLifecycleMemoryState(),
		leave: createLeaveMemoryState(),
		compensationBenefits: createCompensationBenefitsMemoryState(),
		performance: createPerformanceMemoryState(),
		learning: createLearningMemoryState(),
		talent: createTalentMemoryState(),
		time: createTimeMemoryState(),
		workforcePlanning: createWorkforcePlanningMemoryState(),
		compliance: createComplianceMemoryState(),
		employeeRelations: createEmployeeRelationsMemoryState(),
		workforceFoundation: createWorkforceFoundationMemoryState(),
		hireOrchestration: createHireOrchestrationMemoryState(),
		statutoryProfile: createStatutoryProfileMemoryState(),
	};
}

function resetMemoryHumanResourcesStoreState(
	state: MemoryHumanResourcesStoreState,
): void {
	resetCoreMemoryState(state.core);
	resetOrganizationMemoryState(state.organization);
	resetRecruitmentMemoryState(state.recruitment);
	resetLifecycleMemoryState(state.lifecycle);
	resetLeaveMemoryState(state.leave);
	resetCompensationBenefitsMemoryState(state.compensationBenefits);
	resetPerformanceMemoryState(state.performance);
	resetLearningMemoryState(state.learning);
	resetTalentMemoryState(state.talent);
	resetTimeMemoryState(state.time);
	resetWorkforcePlanningMemoryState(state.workforcePlanning);
	resetComplianceMemoryState(state.compliance);
	resetEmployeeRelationsMemoryState(state.employeeRelations);
	resetWorkforceFoundationMemoryState(state.workforceFoundation);
	resetHireOrchestrationMemoryState(state.hireOrchestration);
	resetStatutoryProfileMemoryState(state.statutoryProfile);
}

/** Composition root for Vitest and local harnesses. */
export function createMemoryHumanResourcesStore(): MemoryHumanResourcesStore {
	const state = createMemoryHumanResourcesStoreState();
	const deps = {
		core: state.core,
		org: state.organization,
		recruitment: state.recruitment,
	};

	const store = composeStoreSlices(
		createMemoryCoreMethods(state.core, state.organization),
		createMemoryOrganizationMethods(state.organization, state.core),
		createMemoryRecruitmentMethods(state.recruitment),
		createMemoryLifecycleMethods(state.lifecycle, deps),
		createMemoryLeaveMethods(state.leave),
		createMemoryCompensationBenefitsMethods(
			state.compensationBenefits,
			state.core,
			state.recruitment,
		),
		createMemoryPerformanceMethods(state.performance),
		createMemoryLearningMethods(state.learning, state.core),
		createMemoryTalentMethods(state.talent),
		createMemoryTimeMethods(state.time, state.core),
		createMemoryWorkforcePlanningMethods(state.workforcePlanning),
		createMemoryComplianceMethods(state.compliance, state.core),
		createMemoryEmployeeRelationsMethods(state.employeeRelations),
		createMemoryWorkforceFoundationMethods({
			state: state.workforceFoundation,
			core: state.core,
		}),
		createMemoryHireOrchestrationMethods(state.hireOrchestration),
		createMemoryHumanResourcesIdentityStore(state.organization),
		createMemoryStatutoryProfileMethods(state.statutoryProfile),
	) as MemoryHumanResourcesStore;

	Object.defineProperty(store, "state", {
		value: state,
		enumerable: true,
	});

	store.reset = () => {
		resetMemoryHumanResourcesStoreState(state);
	};

	return store satisfies MemoryHumanResourcesStore;
}
