import { fail, ok, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	humanResourcesErrorDetails,
} from "../error-codes";
import { invalidInput, invalidState } from "./domain-guards";
import type {
	PerformanceCheckpointOutcome,
	PerformanceCycleStatus,
	PerformanceGoalStatus,
	PerformanceImprovementPlanStatus,
	PerformanceReviewStatus,
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
	if (current === next) return false;
	if (current === "draft" && (next === "open" || next === "cancelled")) {
		return true;
	}
	if (current === "open" && (next === "closed" || next === "cancelled")) {
		return true;
	}
	return false;
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
	if (current === next) return false;
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
): Result<void> {
	if (status !== "draft" && status !== "rejected") {
		return invalidState("Goal can only be edited while draft or rejected");
	}
	return ok(undefined);
}

export function canTransitionReviewStatus(
	current: PerformanceReviewStatus,
	next: PerformanceReviewStatus,
): boolean {
	if (current === next) return false;
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
	if (current === next) return false;
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
