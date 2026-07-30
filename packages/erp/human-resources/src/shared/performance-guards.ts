import { fail, ok, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	humanResourcesErrorDetails,
} from "../error-codes";
import type {
	PerformanceCycleEligibility,
	PerformanceCycleReviewPeriod,
} from "../types";
import { invalidInput, invalidState } from "./domain-guards";
import type { PerformanceRatingScale } from "./performance-rating";
import { assertRatingScaleUniqueCodes } from "./performance-rating";
import type {
	PerformanceCheckpointOutcome,
	PerformanceCycleReviewPeriodKind,
	PerformanceCycleStatus,
	PerformanceGoalKind,
	PerformanceGoalStatus,
	PerformanceImprovementPlanStatus,
	PerformanceReviewStatus,
	PerformanceWeightingModel,
} from "./performance-status";

function alreadyInStatus(entity: string, status: string): Result<never> {
	return fail(
		"BAD_REQUEST",
		`${entity} is already in status '${status}'`,
		humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION),
	);
}

function cannotTransition(
	entity: string,
	current: string,
	next: string,
): Result<never> {
	return fail(
		"BAD_REQUEST",
		`Cannot transition ${entity} from '${current}' to '${next}'`,
		humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION),
	);
}

export function assertValidCyclePeriod(input: {
	periodStart: string;
	periodEnd: string;
}): Result<true> {
	if (input.periodEnd < input.periodStart) {
		return invalidInput("Cycle period end must be on or after period start");
	}
	return ok(true);
}

export function canTransitionCycleStatus(
	current: PerformanceCycleStatus,
	next: PerformanceCycleStatus,
): boolean {
	if (current === next) {
		return false;
	}
	if (current === "draft" && (next === "published" || next === "cancelled")) {
		return true;
	}
	if (current === "published" && (next === "open" || next === "cancelled")) {
		return true;
	}
	if (current === "open" && next === "closed") {
		return true;
	}
	return false;
}

export function assertReviewPeriodsWithinCycle(input: {
	cyclePeriodStart: string;
	cyclePeriodEnd: string;
	periods: Pick<PerformanceCycleReviewPeriod, "periodStart" | "periodEnd">[];
}): Result<void> {
	for (const period of input.periods) {
		if (period.periodEnd < period.periodStart) {
			return invalidInput(
				"Review period end must be on or after review period start",
			);
		}
		if (
			period.periodStart < input.cyclePeriodStart ||
			period.periodEnd > input.cyclePeriodEnd
		) {
			return invalidInput(
				"Review periods must fall within the performance cycle period",
			);
		}
	}
	return ok(undefined);
}

export function assertReviewPeriodsNonOverlapping(
	periods: PerformanceCycleReviewPeriod[],
): Result<void> {
	const byKind = new Map<
		PerformanceCycleReviewPeriodKind,
		PerformanceCycleReviewPeriod[]
	>();
	for (const period of periods) {
		const existing = byKind.get(period.kind) ?? [];
		existing.push(period);
		byKind.set(period.kind, existing);
	}
	for (const group of byKind.values()) {
		const sorted = [...group].sort((a, b) =>
			a.periodStart.localeCompare(b.periodStart),
		);
		for (let index = 1; index < sorted.length; index += 1) {
			const previous = sorted[index - 1];
			const current = sorted[index];
			if (current && previous && current.periodStart <= previous.periodEnd) {
				return invalidInput("Review periods of the same kind must not overlap");
			}
		}
	}
	return ok(undefined);
}

const REQUIRED_PUBLISH_REVIEW_PERIOD_KINDS = [
	"self_review",
	"manager_review",
] as const satisfies readonly PerformanceCycleReviewPeriodKind[];

export function assertCyclePublishReady(input: {
	ratingScale: PerformanceRatingScale;
	eligibility: PerformanceCycleEligibility | null;
	reviewPeriods: PerformanceCycleReviewPeriod[];
}): Result<void> {
	const scaleCheck = assertRatingScaleUniqueCodes(input.ratingScale);
	if (!scaleCheck.ok) {
		return scaleCheck;
	}
	if (input.eligibility === null) {
		return invalidInput(
			"Performance cycle eligibility must be configured before publish",
		);
	}
	if (input.eligibility.allowedEmploymentStatuses.length === 0) {
		return invalidInput(
			"Performance cycle eligibility must include at least one employment status",
		);
	}
	const kinds = new Set(input.reviewPeriods.map((period) => period.kind));
	for (const requiredKind of REQUIRED_PUBLISH_REVIEW_PERIOD_KINDS) {
		if (!kinds.has(requiredKind)) {
			return invalidInput(
				`Performance cycle must include a ${requiredKind} review period before publish`,
			);
		}
	}
	return ok(undefined);
}

export function assertCycleStatusTransition(
	current: PerformanceCycleStatus,
	next: PerformanceCycleStatus,
): Result<void> {
	if (current === next) {
		return alreadyInStatus("Performance cycle", next);
	}
	if (!canTransitionCycleStatus(current, next)) {
		return cannotTransition("performance cycle", current, next);
	}
	return ok(undefined);
}

export function canTransitionGoalStatus(
	current: PerformanceGoalStatus,
	next: PerformanceGoalStatus,
): boolean {
	if (current === next) {
		return false;
	}
	const transitions: Record<PerformanceGoalStatus, PerformanceGoalStatus[]> = {
		draft: ["submitted", "cancelled"],
		submitted: ["approved", "rejected", "cancelled"],
		approved: ["active", "cancelled"],
		rejected: ["submitted", "cancelled"],
		active: ["closed", "cancelled"],
		closed: [],
		cancelled: [],
	};
	return transitions[current].includes(next);
}

export function assertGoalStatusTransition(
	current: PerformanceGoalStatus,
	next: PerformanceGoalStatus,
): Result<void> {
	if (current === next) {
		return alreadyInStatus("Performance goal", next);
	}
	if (!canTransitionGoalStatus(current, next)) {
		return cannotTransition("performance goal", current, next);
	}
	return ok(undefined);
}

export function assertGoalEditable(
	status: PerformanceGoalStatus,
	goalKind: PerformanceGoalKind = "employee",
): Result<void> {
	if (!isPerformanceGoalEditable(status, goalKind)) {
		if (goalKind === "manager") {
			return invalidState(
				"Manager-assigned goals can only be edited while approved and not yet active",
			);
		}
		return invalidState("Goal can only be edited while draft or rejected");
	}
	return ok(undefined);
}

function isPerformanceGoalEditable(
	status: PerformanceGoalStatus,
	goalKind: PerformanceGoalKind,
): boolean {
	if (goalKind === "manager") {
		return status === "approved";
	}
	return status === "draft" || status === "rejected";
}

export function canTransitionReviewStatus(
	current: PerformanceReviewStatus,
	next: PerformanceReviewStatus,
): boolean {
	if (current === next) {
		return false;
	}
	const transitions: Record<
		PerformanceReviewStatus,
		PerformanceReviewStatus[]
	> = {
		draft: ["self_submitted", "manager_submitted"],
		self_submitted: ["manager_submitted", "returned"],
		manager_submitted: ["returned", "acknowledged", "finalized"],
		returned: ["self_submitted", "manager_submitted"],
		acknowledged: ["finalized"],
		finalized: ["reopened"],
		reopened: ["self_submitted", "manager_submitted", "returned"],
	};
	return transitions[current].includes(next);
}

export function assertReviewStatusTransition(
	current: PerformanceReviewStatus,
	next: PerformanceReviewStatus,
): Result<void> {
	if (current === next) {
		return alreadyInStatus("Performance review", next);
	}
	if (!canTransitionReviewStatus(current, next)) {
		return cannotTransition("performance review", current, next);
	}
	return ok(undefined);
}

export function assertReviewNotFinalized(
	status: PerformanceReviewStatus,
): Result<void> {
	if (status === "finalized") {
		return invalidState("Finalized performance reviews are immutable");
	}
	return ok(undefined);
}

export function canTransitionImprovementPlanStatus(
	current: PerformanceImprovementPlanStatus,
	next: PerformanceImprovementPlanStatus,
): boolean {
	if (current === next) {
		return false;
	}
	const transitions: Record<
		PerformanceImprovementPlanStatus,
		PerformanceImprovementPlanStatus[]
	> = {
		draft: ["open", "cancelled"],
		open: ["acknowledged", "completed", "unsuccessful", "cancelled"],
		acknowledged: ["completed", "unsuccessful", "cancelled"],
		completed: [],
		unsuccessful: [],
		cancelled: [],
	};
	return transitions[current].includes(next);
}

export function assertImprovementPlanStatusTransition(
	current: PerformanceImprovementPlanStatus,
	next: PerformanceImprovementPlanStatus,
): Result<void> {
	if (current === next) {
		return alreadyInStatus("Improvement plan", next);
	}
	if (!canTransitionImprovementPlanStatus(current, next)) {
		return cannotTransition("improvement plan", current, next);
	}
	return ok(undefined);
}

export function assertGoalDatesWithinCycle(input: {
	goalPeriodStart: string;
	goalPeriodEnd: string;
	cyclePeriodStart: string;
	cyclePeriodEnd: string;
	exceptionOutsideCycle: boolean;
}): Result<void> {
	if (input.exceptionOutsideCycle) {
		return ok(undefined);
	}
	if (
		input.goalPeriodStart < input.cyclePeriodStart ||
		input.goalPeriodEnd > input.cyclePeriodEnd
	) {
		return invalidInput(
			"Goal period must fall within the performance cycle unless an approved exception is set",
		);
	}
	return ok(undefined);
}

export function assertGoalWeightsSumTo100(weights: string[]): Result<void> {
	const total = weights.reduce((sum, weight) => sum + Number(weight), 0);
	if (!Number.isFinite(total) || Math.abs(total - 100) > 0.0001) {
		return fail(
			"VALIDATION_ERROR",
			"Approved goal weights must sum to 100 for percent100 weighting model",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok(undefined);
}

export function assertGoalWeightForModel(input: {
	weight: string | null;
	weightingModel: PerformanceWeightingModel;
}): Result<void> {
	if (input.weightingModel !== "percent100") {
		return ok(undefined);
	}
	if (input.weight === null || input.weight.trim() === "") {
		return fail(
			"VALIDATION_ERROR",
			"Goal weight is required when the cycle uses percent100 weighting",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	const numeric = Number(input.weight);
	if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) {
		return fail(
			"VALIDATION_ERROR",
			"Goal weight must be a finite value between 0 and 100",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok(undefined);
}

export function assertGoalAlignment(input: {
	goalId: string;
	alignedToGoalId: string | null;
	parentGoal: {
		id: string;
		cycleId: string;
		goalKind: PerformanceGoalKind;
		alignedToGoalId: string | null;
	} | null;
	goalCycleId: string;
	resolveParent: (
		parentId: string,
	) => { id: string; alignedToGoalId: string | null } | null;
}): Result<void> {
	if (input.alignedToGoalId === null) {
		return ok(undefined);
	}
	if (input.alignedToGoalId === input.goalId) {
		return invalidInput("A goal cannot be aligned to itself");
	}
	if (input.parentGoal === null) {
		return invalidInput("Alignment parent goal was not found");
	}
	if (input.parentGoal.cycleId !== input.goalCycleId) {
		return invalidInput(
			"Alignment parent must belong to the same performance cycle",
		);
	}
	if (input.parentGoal.goalKind !== "manager") {
		return invalidInput("Alignment parent must be a manager-assigned goal");
	}
	let cursor: string | null = input.parentGoal.alignedToGoalId;
	const visited = new Set<string>([input.goalId, input.parentGoal.id]);
	while (cursor !== null) {
		if (visited.has(cursor)) {
			return invalidInput("Goal alignment would create a cycle");
		}
		visited.add(cursor);
		const ancestor = input.resolveParent(cursor);
		if (!ancestor) {
			break;
		}
		cursor = ancestor.alignedToGoalId;
	}
	return ok(undefined);
}

export function assertEmployeeGoalActor(input: {
	goalKind: PerformanceGoalKind;
	goalEmployeeId: string;
	actorEmployeeId: string;
}): Result<void> {
	if (input.goalKind !== "employee") {
		return invalidState("This operation requires an employee-proposed goal");
	}
	if (input.goalEmployeeId !== input.actorEmployeeId) {
		return fail(
			"FORBIDDEN",
			"Actor does not own this performance goal",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
		);
	}
	return ok(undefined);
}

export function assertManagerAssignedGoalMutation(input: {
	goalKind: PerformanceGoalKind;
}): Result<void> {
	if (input.goalKind === "manager") {
		return invalidState("Manager-assigned goals must be changed by a manager");
	}
	return ok(undefined);
}

export function assertCheckpointOutcomeTransition(
	current: PerformanceCheckpointOutcome,
	next: PerformanceCheckpointOutcome,
): Result<void> {
	if (current !== "pending") {
		return invalidState("Checkpoint outcomes are append-only once recorded");
	}
	if (next === "pending") {
		return invalidInput(
			"Checkpoint outcome must be met or missed when recording",
		);
	}
	return ok(undefined);
}

export function assertImprovementPlanMilestones(input: {
	planDueDate: string;
	milestones: Array<{ dueDate: string }>;
}): Result<void> {
	if (input.milestones.length === 0) {
		return invalidInput("Improvement plan requires at least one milestone");
	}
	for (let index = 1; index < input.milestones.length; index += 1) {
		const previous = input.milestones[index - 1];
		const current = input.milestones[index];
		if (!(previous && current)) {
			continue;
		}
		if (current.dueDate < previous.dueDate) {
			return invalidInput(
				"Improvement plan milestones must be sorted by due date",
			);
		}
	}
	for (const milestone of input.milestones) {
		if (milestone.dueDate > input.planDueDate) {
			return invalidInput(
				"Improvement plan milestone due dates cannot exceed plan due date",
			);
		}
	}
	return ok(undefined);
}

export function assertNoPendingCheckpoints(
	checkpoints: Array<{ outcome: PerformanceCheckpointOutcome }>,
): Result<void> {
	if (checkpoints.some((checkpoint) => checkpoint.outcome === "pending")) {
		return invalidState(
			"All improvement plan milestones must be reviewed before closing the plan",
		);
	}
	return ok(undefined);
}

export function assertImprovementPlanExtension(input: {
	currentDueDate: string;
	nextDueDate: string | undefined;
	extensionReason: string | undefined;
}): Result<void> {
	if (
		input.nextDueDate === undefined ||
		input.nextDueDate <= input.currentDueDate
	) {
		return ok(undefined);
	}
	if (
		input.extensionReason === undefined ||
		input.extensionReason.trim().length === 0
	) {
		return invalidInput("Extending an improvement plan requires a reason");
	}
	return ok(undefined);
}

export function assertAllDelegatedAssessmentsSubmitted(input: {
	participants: Array<{ id: string; role: string }>;
	assessments: Array<{ participantId: string; submittedAt: Date | null }>;
}): Result<void> {
	const delegatedParticipants = input.participants.filter(
		(participant) => participant.role === "delegated",
	);
	if (delegatedParticipants.length === 0) {
		return ok(undefined);
	}
	for (const participant of delegatedParticipants) {
		const assessment = input.assessments.find(
			(item) => item.participantId === participant.id,
		);
		if (!assessment?.submittedAt) {
			return invalidState(
				"All delegated reviewer assessments must be submitted before finalize",
			);
		}
	}
	return ok(undefined);
}

export function assertPriorDelegatedAssessmentsSubmitted(input: {
	participants: Array<{ id: string; role: string; sequenceNumber: number }>;
	assessments: Array<{ participantId: string; submittedAt: Date | null }>;
	targetParticipantId: string;
}): Result<void> {
	const delegated = input.participants
		.filter((participant) => participant.role === "delegated")
		.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
	for (const participant of delegated) {
		if (participant.id === input.targetParticipantId) {
			break;
		}
		const assessment = input.assessments.find(
			(item) => item.participantId === participant.id,
		);
		if (!assessment?.submittedAt) {
			return invalidState(
				"Prior delegated reviewer must submit before the next reviewer",
			);
		}
	}
	return ok(undefined);
}

export function nextDelegatedSequenceNumber(
	participants: Array<{ role: string; sequenceNumber: number }>,
): number {
	const delegated = participants.filter(
		(participant) => participant.role === "delegated",
	);
	if (delegated.length === 0) {
		return 1;
	}
	return (
		Math.max(...delegated.map((participant) => participant.sequenceNumber)) + 1
	);
}
