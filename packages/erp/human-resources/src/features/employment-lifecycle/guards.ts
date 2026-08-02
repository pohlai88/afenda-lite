import { errorResult, type Result } from "@afenda/errors";
import {
	invalidInput,
	invalidState,
} from "../../kernel/execution/domain-guards";
import {
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import type { EmploymentStatus } from "../workforce-records/employment/employment-status";
import { assertValidDateRange } from "../workforce-records/employment/employment-status";
import type {
	ClearanceStatus,
	LifecycleTaskStatus,
	OffboardingAccessRevocationStatus,
	OffboardingCaseStatus,
	OffboardingPayrollHandoffStatus,
	OnboardingAccessHandoffStatus,
	OnboardingCaseStatus,
	OnboardingEquipmentHandoffStatus,
	OnboardingOrientationStatus,
	ProbationStatus,
	TerminationStatus,
} from "./status";

function alreadyInStatus(_entity: string, _status: string): Result<never> {
	return errorResult.fail("BAD_REQUEST", {
		publicMessage: "The request is invalid",
		internalContext: humanResourcesErrorDetails(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		),
	});
}

function cannotTransition(
	_entity: string,
	_current: string,
	_next: string,
): Result<never> {
	return errorResult.fail("BAD_REQUEST", {
		publicMessage: "The request is invalid",
		internalContext: humanResourcesErrorDetails(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		),
	});
}

export function assertEmploymentActiveForOnboarding(
	status: EmploymentStatus,
): Result<void> {
	if (status !== "active") {
		return invalidState("Employment must be active to start onboarding");
	}
	return errorResult.ok(undefined);
}

export function assertOnboardingCaseInProgress(
	status: OnboardingCaseStatus,
): Result<void> {
	if (status !== "in_progress") {
		return invalidState("Onboarding case must be in progress");
	}
	return errorResult.ok(undefined);
}

export function canTransitionLifecycleTaskStatus(
	current: LifecycleTaskStatus,
	next: LifecycleTaskStatus,
): boolean {
	if (current === next) {
		return false;
	}
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
	return errorResult.ok(undefined);
}

export function assertProbationOpen(status: ProbationStatus): Result<void> {
	if (status !== "open") {
		return invalidState("Probation review must be open");
	}
	return errorResult.ok(undefined);
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
	return errorResult.ok(undefined);
}

export function assertProbationOutcomeRecordedOn(input: {
	startsOn: string;
	endsOn: string;
	outcomeRecordedOn: string;
}): Result<void> {
	if (
		input.outcomeRecordedOn < input.startsOn ||
		input.outcomeRecordedOn > input.endsOn
	) {
		return invalidInput(
			"Outcome recorded date must fall within the probation period",
		);
	}
	return errorResult.ok(undefined);
}

export function assertProbationAssessmentReviewedOn(input: {
	startsOn: string;
	endsOn: string;
	reviewedOn: string;
}): Result<void> {
	if (input.reviewedOn < input.startsOn || input.reviewedOn > input.endsOn) {
		return invalidInput(
			"Assessment review date must fall within the probation period",
		);
	}
	return errorResult.ok(undefined);
}

export function assertConfirmationEffectiveOn(input: {
	confirmedOn: string;
	latestPassedOutcomeRecordedOn: string | null;
}): Result<void> {
	if (
		input.latestPassedOutcomeRecordedOn !== null &&
		input.confirmedOn < input.latestPassedOutcomeRecordedOn
	) {
		return invalidInput(
			"Confirmation date must be on or after the latest passed probation outcome",
		);
	}
	return errorResult.ok(undefined);
}

export function assertLatestProbationPassed(input: {
	hasAnyProbation: boolean;
	latestClosedProbation: { outcome: string | null } | null;
}): Result<void> {
	if (!input.hasAnyProbation) {
		return errorResult.ok(undefined);
	}
	if (!input.latestClosedProbation) {
		return invalidState("Probation review is still open");
	}
	if (input.latestClosedProbation.outcome !== "passed") {
		return invalidState("Latest probation review did not pass");
	}
	return errorResult.ok(undefined);
}

export function canTransitionTerminationStatus(
	current: TerminationStatus,
	next: TerminationStatus,
): boolean {
	if (current === next) {
		return false;
	}
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
	return errorResult.ok(undefined);
}

export function assertTerminationApprovable(input: {
	status: TerminationStatus;
	approvedAt: Date | null;
}): Result<void> {
	if (input.status !== "draft") {
		return invalidState("Termination must be draft to approve");
	}
	if (input.approvedAt !== null) {
		return invalidState("Termination is already approved");
	}
	return errorResult.ok(undefined);
}

export function assertTerminationFinalizable(input: {
	status: TerminationStatus;
	approvedAt: Date | null;
	approvedBy: string | null;
}): Result<void> {
	if (input.status !== "draft") {
		return invalidState("Termination must be draft to finalize");
	}
	if (input.approvedAt === null || input.approvedBy === null) {
		return invalidState("Termination must be approved before finalize");
	}
	return errorResult.ok(undefined);
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
	return errorResult.ok(undefined);
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
	return errorResult.ok(undefined);
}

export function assertOffboardingCaseInProgress(
	status: OffboardingCaseStatus,
): Result<void> {
	if (status !== "in_progress") {
		return invalidState("Offboarding case must be in progress");
	}
	return errorResult.ok(undefined);
}

export function assertOffboardingReadyToComplete(input: {
	mandatoryTasksComplete: boolean;
	hasExitInterview: boolean;
	clearanceStatus: ClearanceStatus | null;
	accessRevocationStatus: OffboardingAccessRevocationStatus | null;
	payrollHandoffStatus: OffboardingPayrollHandoffStatus | null;
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
	if (input.accessRevocationStatus !== "revoked") {
		return invalidState("Access revocation must be completed");
	}
	if (input.payrollHandoffStatus !== "ready") {
		return invalidState("Final payroll handoff must be ready");
	}
	return errorResult.ok(undefined);
}

export function canTransitionOffboardingAccessRevocationStatus(
	current: OffboardingAccessRevocationStatus,
	next: OffboardingAccessRevocationStatus,
): boolean {
	if (current === next) {
		return false;
	}
	if (current === "pending" && next === "revoked") {
		return true;
	}
	return false;
}

export function assertOffboardingAccessRevocationStatusTransition(
	current: OffboardingAccessRevocationStatus,
	next: OffboardingAccessRevocationStatus,
): Result<void> {
	if (current === next) {
		return alreadyInStatus("Offboarding access revocation", next);
	}
	if (!canTransitionOffboardingAccessRevocationStatus(current, next)) {
		return cannotTransition("offboarding access revocation", current, next);
	}
	return errorResult.ok(undefined);
}

export function canTransitionOffboardingPayrollHandoffStatus(
	current: OffboardingPayrollHandoffStatus,
	next: OffboardingPayrollHandoffStatus,
): boolean {
	if (current === next) {
		return false;
	}
	if (current === "pending" && next === "ready") {
		return true;
	}
	return false;
}

export function assertOffboardingPayrollHandoffStatusTransition(
	current: OffboardingPayrollHandoffStatus,
	next: OffboardingPayrollHandoffStatus,
): Result<void> {
	if (current === next) {
		return alreadyInStatus("Offboarding payroll handoff", next);
	}
	if (!canTransitionOffboardingPayrollHandoffStatus(current, next)) {
		return cannotTransition("offboarding payroll handoff", current, next);
	}
	return errorResult.ok(undefined);
}

export function canTransitionClearanceStatus(
	current: ClearanceStatus,
	next: ClearanceStatus,
): boolean {
	if (current === next) {
		return false;
	}
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
	return errorResult.ok(undefined);
}

export function assertOnboardingReadyToComplete(input: {
	mandatoryTasksComplete: boolean;
	orientationStatus: OnboardingOrientationStatus | null;
	equipmentHandoffStatus: OnboardingEquipmentHandoffStatus | null;
	accessHandoffStatus: OnboardingAccessHandoffStatus | null;
}): Result<void> {
	if (!input.mandatoryTasksComplete) {
		return invalidState("All mandatory tasks must be completed or waived");
	}
	if (input.orientationStatus !== "acknowledged") {
		return invalidState("Orientation must be acknowledged");
	}
	if (input.equipmentHandoffStatus !== "handed_over") {
		return invalidState("Equipment handoff must be completed");
	}
	if (input.accessHandoffStatus !== "granted") {
		return invalidState("Access handoff must be completed");
	}
	return errorResult.ok(undefined);
}

export function canTransitionOnboardingOrientationStatus(
	current: OnboardingOrientationStatus,
	next: OnboardingOrientationStatus,
): boolean {
	if (current === next) {
		return false;
	}
	return current === "pending" && next === "acknowledged";
}

export function assertOnboardingOrientationStatusTransition(
	current: OnboardingOrientationStatus,
	next: OnboardingOrientationStatus,
): Result<void> {
	if (current === next) {
		return alreadyInStatus("Onboarding orientation", next);
	}
	if (!canTransitionOnboardingOrientationStatus(current, next)) {
		return cannotTransition("onboarding orientation", current, next);
	}
	return errorResult.ok(undefined);
}

export function canTransitionOnboardingEquipmentHandoffStatus(
	current: OnboardingEquipmentHandoffStatus,
	next: OnboardingEquipmentHandoffStatus,
): boolean {
	if (current === next) {
		return false;
	}
	return current === "pending" && next === "handed_over";
}

export function assertOnboardingEquipmentHandoffStatusTransition(
	current: OnboardingEquipmentHandoffStatus,
	next: OnboardingEquipmentHandoffStatus,
): Result<void> {
	if (current === next) {
		return alreadyInStatus("Onboarding equipment handoff", next);
	}
	if (!canTransitionOnboardingEquipmentHandoffStatus(current, next)) {
		return cannotTransition("onboarding equipment handoff", current, next);
	}
	return errorResult.ok(undefined);
}

export function canTransitionOnboardingAccessHandoffStatus(
	current: OnboardingAccessHandoffStatus,
	next: OnboardingAccessHandoffStatus,
): boolean {
	if (current === next) {
		return false;
	}
	return current === "pending" && next === "granted";
}

export function assertOnboardingAccessHandoffStatusTransition(
	current: OnboardingAccessHandoffStatus,
	next: OnboardingAccessHandoffStatus,
): Result<void> {
	if (current === next) {
		return alreadyInStatus("Onboarding access handoff", next);
	}
	if (!canTransitionOnboardingAccessHandoffStatus(current, next)) {
		return cannotTransition("onboarding access handoff", current, next);
	}
	return errorResult.ok(undefined);
}
