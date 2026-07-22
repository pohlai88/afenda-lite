import { fail, ok, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	humanResourcesErrorDetails,
} from "../error-codes";
import { invalidInput, invalidState } from "./domain-guards";
import type { EmploymentStatus } from "./employment-status";
import { assertValidDateRange } from "./employment-status";
import type {
	ClearanceStatus,
	LifecycleTaskStatus,
	OffboardingCaseStatus,
	OnboardingCaseStatus,
	ProbationStatus,
	TerminationStatus,
} from "./lifecycle-status";

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

export function assertEmploymentActiveForOnboarding(
	status: EmploymentStatus,
): Result<void> {
	if (status !== "active") {
		return invalidState("Employment must be active to start onboarding");
	}
	return ok(undefined);
}

export function assertOnboardingCaseInProgress(
	status: OnboardingCaseStatus,
): Result<void> {
	if (status !== "in_progress") {
		return invalidState("Onboarding case must be in progress");
	}
	return ok(undefined);
}

export function canTransitionLifecycleTaskStatus(
	current: LifecycleTaskStatus,
	next: LifecycleTaskStatus,
): boolean {
	if (current === next) return false;
	if (current === "pending" && (next === "completed" || next === "waived")) {
		return true;
	}
	return false;
}

export function assertLifecycleTaskStatusTransition(
	current: LifecycleTaskStatus,
	next: LifecycleTaskStatus,
): Result<void> {
	if (current === next) {
		return alreadyInStatus("Task", next);
	}
	if (!canTransitionLifecycleTaskStatus(current, next)) {
		return cannotTransition("task", current, next);
	}
	return ok(undefined);
}

export function assertProbationOpen(status: ProbationStatus): Result<void> {
	if (status !== "open") {
		return invalidState("Probation review must be open");
	}
	return ok(undefined);
}

export function assertProbationDateRange(input: {
	startsOn: string;
	endsOn: string;
}): Result<void> {
	return assertValidDateRange(input.startsOn, input.endsOn);
}

export function assertProbationExtension(input: {
	currentEndsOn: string;
	newEndsOn: string;
}): Result<void> {
	if (input.newEndsOn <= input.currentEndsOn) {
		return invalidInput("Extension end date must be after current end date");
	}
	return ok(undefined);
}

export function assertLatestProbationPassed(input: {
	hasAnyProbation: boolean;
	latestClosedProbation: { outcome: string | null } | null;
}): Result<void> {
	if (!input.hasAnyProbation) {
		return ok(undefined);
	}
	if (!input.latestClosedProbation) {
		return invalidState("Probation review is still open");
	}
	if (input.latestClosedProbation.outcome !== "passed") {
		return invalidState("Latest probation review did not pass");
	}
	return ok(undefined);
}

export function canTransitionTerminationStatus(
	current: TerminationStatus,
	next: TerminationStatus,
): boolean {
	if (current === next) return false;
	if (current === "draft" && next === "finalized") {
		return true;
	}
	return false;
}

export function assertTerminationStatusTransition(
	current: TerminationStatus,
	next: TerminationStatus,
): Result<void> {
	if (current === next) {
		return alreadyInStatus("Termination", next);
	}
	if (!canTransitionTerminationStatus(current, next)) {
		return cannotTransition("termination", current, next);
	}
	return ok(undefined);
}

export function assertTerminationEffectiveDate(input: {
	effectiveOn: string;
	employmentStartsOn: string;
}): Result<void> {
	if (input.effectiveOn < input.employmentStartsOn) {
		return invalidInput(
			"Termination effective date cannot be before employment start date",
		);
	}
	return ok(undefined);
}

export function assertEmploymentForOffboarding(input: {
	employmentStatus: EmploymentStatus;
	hasTermination: boolean;
}): Result<void> {
	if (
		input.employmentStatus !== "notice" &&
		input.employmentStatus !== "terminated" &&
		!input.hasTermination
	) {
		return invalidState(
			"Employment must be in notice or terminated status, or have a finalized termination",
		);
	}
	return ok(undefined);
}

export function assertOffboardingCaseInProgress(
	status: OffboardingCaseStatus,
): Result<void> {
	if (status !== "in_progress") {
		return invalidState("Offboarding case must be in progress");
	}
	return ok(undefined);
}

export function assertOffboardingReadyToComplete(input: {
	mandatoryTasksComplete: boolean;
	hasExitInterview: boolean;
	clearanceStatus: ClearanceStatus | null;
}): Result<void> {
	if (!input.mandatoryTasksComplete) {
		return invalidState("All mandatory tasks must be completed or waived");
	}
	if (!input.hasExitInterview) {
		return invalidState("Exit interview must be recorded");
	}
	if (input.clearanceStatus !== "cleared") {
		return invalidState("Clearance must be completed");
	}
	return ok(undefined);
}

export function canTransitionClearanceStatus(
	current: ClearanceStatus,
	next: ClearanceStatus,
): boolean {
	if (current === next) return false;
	if (current === "pending" && next === "cleared") {
		return true;
	}
	return false;
}

export function assertClearanceStatusTransition(
	current: ClearanceStatus,
	next: ClearanceStatus,
): Result<void> {
	if (current === next) {
		return alreadyInStatus("Clearance", next);
	}
	if (!canTransitionClearanceStatus(current, next)) {
		return cannotTransition("clearance", current, next);
	}
	return ok(undefined);
}
