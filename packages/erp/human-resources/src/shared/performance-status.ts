import { z } from "zod";

export const PERFORMANCE_CYCLE_STATUSES = [
	"draft",
	"open",
	"closed",
	"cancelled",
] as const;
export type PerformanceCycleStatus =
	(typeof PERFORMANCE_CYCLE_STATUSES)[number];

export const PERFORMANCE_CYCLE_PARTICIPANT_STATUSES = [
	"active",
	"removed",
] as const;
export type PerformanceCycleParticipantStatus =
	(typeof PERFORMANCE_CYCLE_PARTICIPANT_STATUSES)[number];

export const PERFORMANCE_GOAL_STATUSES = [
	"draft",
	"submitted",
	"approved",
	"rejected",
	"active",
	"closed",
	"cancelled",
] as const;
export type PerformanceGoalStatus = (typeof PERFORMANCE_GOAL_STATUSES)[number];

export const PERFORMANCE_REVIEW_STATUSES = [
	"draft",
	"self_submitted",
	"manager_submitted",
	"returned",
	"acknowledged",
	"finalized",
	"reopened",
] as const;
export type PerformanceReviewStatus =
	(typeof PERFORMANCE_REVIEW_STATUSES)[number];

export const PERFORMANCE_ASSESSMENT_KINDS = ["self", "manager"] as const;
export type PerformanceAssessmentKind =
	(typeof PERFORMANCE_ASSESSMENT_KINDS)[number];

export const PERFORMANCE_IMPROVEMENT_PLAN_STATUSES = [
	"draft",
	"open",
	"acknowledged",
	"completed",
	"unsuccessful",
	"cancelled",
] as const;
export type PerformanceImprovementPlanStatus =
	(typeof PERFORMANCE_IMPROVEMENT_PLAN_STATUSES)[number];

export const PERFORMANCE_CHECKPOINT_OUTCOMES = [
	"pending",
	"met",
	"missed",
] as const;
export type PerformanceCheckpointOutcome =
	(typeof PERFORMANCE_CHECKPOINT_OUTCOMES)[number];

export const PERFORMANCE_WEIGHTING_MODELS = ["none", "percent100"] as const;
export type PerformanceWeightingModel =
	(typeof PERFORMANCE_WEIGHTING_MODELS)[number];

export const performanceCycleParticipantStatusSchema = z.enum(
	PERFORMANCE_CYCLE_PARTICIPANT_STATUSES,
);
export const performanceAssessmentKindSchema = z.enum(
	PERFORMANCE_ASSESSMENT_KINDS,
);
export const performanceCheckpointOutcomeSchema = z.enum(
	PERFORMANCE_CHECKPOINT_OUTCOMES,
);
export const performanceWeightingModelSchema = z.enum(
	PERFORMANCE_WEIGHTING_MODELS,
);

export const performanceCycleStatusSchema = z.enum(PERFORMANCE_CYCLE_STATUSES);
export const performanceGoalStatusSchema = z.enum(PERFORMANCE_GOAL_STATUSES);
export const performanceReviewStatusSchema = z.enum(
	PERFORMANCE_REVIEW_STATUSES,
);
export const performanceImprovementPlanStatusSchema = z.enum(
	PERFORMANCE_IMPROVEMENT_PLAN_STATUSES,
);

export function isPerformanceCycleOpen(
	status: PerformanceCycleStatus,
): boolean {
	return status === "open";
}

export function isPerformanceCycleTerminal(
	status: PerformanceCycleStatus,
): boolean {
	return status === "closed" || status === "cancelled";
}

export function isPerformanceGoalEditable(
	status: PerformanceGoalStatus,
): boolean {
	return status === "draft" || status === "rejected";
}

export function isPerformanceGoalProgressable(
	status: PerformanceGoalStatus,
): boolean {
	return status === "approved" || status === "active";
}

export function isPerformanceReviewFinalized(
	status: PerformanceReviewStatus,
): boolean {
	return status === "finalized";
}

export function isPerformanceImprovementPlanActive(
	status: PerformanceImprovementPlanStatus,
): boolean {
	return status === "open" || status === "acknowledged" || status === "draft";
}
