/**
 * In-memory performance domain state and attachment for MemoryHumanResourcesStore.
 */

import type {
	HumanResourcesGoalId,
	HumanResourcesImprovementPlanId,
	HumanResourcesPerformanceCycleId,
	HumanResourcesPerformanceCycleParticipantId,
	HumanResourcesReviewId,
} from "./brands";
import type { MemoryHumanResourcesStore } from "./memory-store";
import { createPerformanceMemoryMethods } from "./performance-memory-impl";
import type {
	IdempotentImprovementPlanRecord,
	IdempotentPerformanceCycleRecord,
	IdempotentPerformanceGoalRecord,
} from "./store";
import type { HumanResourcesStore } from "./store";
import type {
	PerformanceAssessment,
	PerformanceCycle,
	PerformanceCycleParticipant,
	PerformanceGoal,
	PerformanceGoalProgress,
	PerformanceImprovementCheckpoint,
	PerformanceImprovementPlan,
	PerformanceReview,
	PerformanceReviewParticipant,
} from "./types";

export type PerformanceMemoryState = {
	cycles: Map<HumanResourcesPerformanceCycleId, PerformanceCycle>;
	cycleIdempotency: Map<string, IdempotentPerformanceCycleRecord>;
	cycleParticipants: Map<
		HumanResourcesPerformanceCycleParticipantId,
		PerformanceCycleParticipant
	>;
	goals: Map<HumanResourcesGoalId, PerformanceGoal>;
	goalIdempotency: Map<string, IdempotentPerformanceGoalRecord>;
	goalProgress: Map<string, PerformanceGoalProgress>;
	reviews: Map<HumanResourcesReviewId, PerformanceReview>;
	reviewFinalizeIdempotency: Map<string, PerformanceReview>;
	reviewParticipants: Map<string, PerformanceReviewParticipant>;
	assessments: Map<string, PerformanceAssessment>;
	improvementPlans: Map<HumanResourcesImprovementPlanId, PerformanceImprovementPlan>;
	planIdempotency: Map<string, IdempotentImprovementPlanRecord>;
	checkpoints: Map<string, PerformanceImprovementCheckpoint>;
};

export type PerformanceMemoryMethods = Pick<
	HumanResourcesStore,
	| "getPerformanceCycleById"
	| "findPerformanceCycleByIdempotencyKey"
	| "createPerformanceCycle"
	| "updatePerformanceCycle"
	| "openPerformanceCycle"
	| "closePerformanceCycle"
	| "cancelPerformanceCycle"
	| "addCycleParticipant"
	| "removeCycleParticipant"
	| "listPerformanceCycles"
	| "listCycleParticipants"
	| "getPerformanceGoalById"
	| "findPerformanceGoalByIdempotencyKey"
	| "createPerformanceGoal"
	| "updatePerformanceGoal"
	| "submitPerformanceGoal"
	| "approvePerformanceGoal"
	| "rejectPerformanceGoal"
	| "recordGoalProgress"
	| "closePerformanceGoal"
	| "cancelPerformanceGoal"
	| "listEmployeeGoals"
	| "startPerformanceReview"
	| "submitSelfAssessment"
	| "submitManagerAssessment"
	| "returnPerformanceReviewForCorrection"
	| "acknowledgePerformanceReview"
	| "finalizePerformanceReview"
	| "reopenPerformanceReview"
	| "getPerformanceReviewById"
	| "listEmployeePerformanceReviews"
	| "listReviewsPendingManagerAction"
	| "getImprovementPlanById"
	| "findImprovementPlanByIdempotencyKey"
	| "createImprovementPlan"
	| "openImprovementPlan"
	| "acknowledgeImprovementPlan"
	| "recordImprovementCheckpoint"
	| "amendImprovementPlan"
	| "completeImprovementPlan"
	| "closeImprovementPlanUnsuccessful"
	| "cancelImprovementPlan"
	| "listActiveImprovementPlans"
	| "getEmployeePerformanceHistory"
>;

const PERF_STATE = new WeakMap<MemoryHumanResourcesStore, PerformanceMemoryState>();

export function createPerformanceMemoryState(): PerformanceMemoryState {
	return {
		cycles: new Map(),
		cycleIdempotency: new Map(),
		cycleParticipants: new Map(),
		goals: new Map(),
		goalIdempotency: new Map(),
		goalProgress: new Map(),
		reviews: new Map(),
		reviewFinalizeIdempotency: new Map(),
		reviewParticipants: new Map(),
		assessments: new Map(),
		improvementPlans: new Map(),
		planIdempotency: new Map(),
		checkpoints: new Map(),
	};
}

export function resetPerformanceMemoryState(state: PerformanceMemoryState): void {
	state.cycles.clear();
	state.cycleIdempotency.clear();
	state.cycleParticipants.clear();
	state.goals.clear();
	state.goalIdempotency.clear();
	state.goalProgress.clear();
	state.reviews.clear();
	state.reviewFinalizeIdempotency.clear();
	state.reviewParticipants.clear();
	state.assessments.clear();
	state.improvementPlans.clear();
	state.planIdempotency.clear();
	state.checkpoints.clear();
}

export { createPerformanceMemoryMethods } from "./performance-memory-impl";

export function attachMemoryPerformance(
	target: MemoryHumanResourcesStore,
	state?: PerformanceMemoryState,
): void {
	const resolved =
		state ?? PERF_STATE.get(target) ?? createPerformanceMemoryState();
	PERF_STATE.set(target, resolved);
	Object.assign(
		target,
		createPerformanceMemoryMethods(target, () => resolved),
	);
}
