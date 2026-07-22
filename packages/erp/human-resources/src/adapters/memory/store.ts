import type { HumanResourcesStore } from "../../store";

import { composeStoreSlices } from "../drizzle/compose";
import {
	type CompensationBenefitsMemoryState,
	createCompensationBenefitsMemoryState,
	createMemoryCompensationBenefitsMethods,
	resetCompensationBenefitsMemoryState,
} from "./compensation-benefits";
import {
	type ComplianceMemoryState,
	createComplianceMemoryState,
	createMemoryComplianceMethods,
	resetComplianceMemoryState,
} from "./compliance";
import {
	type CoreMemoryState,
	createCoreMemoryState,
	createMemoryCoreMethods,
	resetCoreMemoryState,
} from "./core";
import {
	createEmployeeRelationsMemoryState,
	createMemoryEmployeeRelationsMethods,
	type EmployeeRelationsMemoryState,
	resetEmployeeRelationsMemoryState,
} from "./employee-relations";
import {
	createLearningMemoryState,
	createMemoryLearningMethods,
	type LearningMemoryState,
	resetLearningMemoryState,
} from "./learning";
import {
	createLeaveMemoryState,
	createMemoryLeaveMethods,
	type LeaveMemoryState,
	resetLeaveMemoryState,
} from "./leave";
import {
	createLifecycleMemoryState,
	createMemoryLifecycleMethods,
	type LifecycleMemoryState,
	resetLifecycleMemoryState,
} from "./lifecycle";
import {
	createMemoryOrganizationMethods,
	createOrganizationMemoryState,
	type OrganizationMemoryState,
	resetOrganizationMemoryState,
} from "./organization";
import {
	createMemoryPerformanceMethods,
	createPerformanceMemoryState,
	type PerformanceMemoryState,
	resetPerformanceMemoryState,
} from "./performance";
import {
	createMemoryRecruitmentMethods,
	createRecruitmentMemoryState,
	type RecruitmentMemoryState,
	resetRecruitmentMemoryState,
} from "./recruitment";
import {
	createMemoryTalentMethods,
	createTalentMemoryState,
	resetTalentMemoryState,
	type TalentMemoryState,
} from "./talent";
import {
	createMemoryWorkforcePlanningMethods,
	createWorkforcePlanningMemoryState,
	resetWorkforcePlanningMemoryState,
	type WorkforcePlanningMemoryState,
} from "./workforce-planning";

export type MemoryHumanResourcesStoreState = {
	core: CoreMemoryState;
	organization: OrganizationMemoryState;
	recruitment: RecruitmentMemoryState;
	lifecycle: LifecycleMemoryState;
	leave: LeaveMemoryState;
	compensationBenefits: CompensationBenefitsMemoryState;
	performance: PerformanceMemoryState;
	learning: LearningMemoryState;
	talent: TalentMemoryState;
	workforcePlanning: WorkforcePlanningMemoryState;
	compliance: ComplianceMemoryState;
	employeeRelations: EmployeeRelationsMemoryState;
};

export type MemoryHumanResourcesStore = HumanResourcesStore & {
	readonly state: MemoryHumanResourcesStoreState;
	reset(): void;
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
		workforcePlanning: createWorkforcePlanningMemoryState(),
		compliance: createComplianceMemoryState(),
		employeeRelations: createEmployeeRelationsMemoryState(),
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
	resetWorkforcePlanningMemoryState(state.workforcePlanning);
	resetComplianceMemoryState(state.compliance);
	resetEmployeeRelationsMemoryState(state.employeeRelations);
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
		),
		createMemoryPerformanceMethods(state.performance),
		createMemoryLearningMethods(state.learning, state.core),
		createMemoryTalentMethods(state.talent),
		createMemoryWorkforcePlanningMethods(state.workforcePlanning),
		createMemoryComplianceMethods(state.compliance, state.core),
		createMemoryEmployeeRelationsMethods(state.employeeRelations),
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
