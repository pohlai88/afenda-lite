import { fail, ok, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	humanResourcesErrorDetails,
} from "../error-codes";
import { conflict, invalidInput, invalidState } from "./domain-guards";
import type { EmploymentStatus } from "./employment-status";
import {
	type AssignmentStatus,
	type CertificationStatus,
	type CourseStatus,
	isAssignmentTerminal,
	type SessionStatus,
} from "./learning-status";

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

// Course Guards

export function assertCourseActive(status: CourseStatus): Result<void> {
	if (status !== "active") {
		return invalidState("Course must be active");
	}
	return ok(undefined);
}

export function canTransitionCourseStatus(
	current: CourseStatus,
	next: CourseStatus,
): boolean {
	if (current === next) return false;
	if (current === "active" && next === "archived") return true;
	if (current === "archived" && next === "active") return true;
	return false;
}

export function assertCourseStatusTransition(
	current: CourseStatus,
	next: CourseStatus,
): Result<void> {
	if (current === next) {
		return alreadyInStatus("Course", next);
	}
	if (!canTransitionCourseStatus(current, next)) {
		return cannotTransition("course", current, next);
	}
	return ok(undefined);
}

export function assertCourseCanArchive(input: {
	status: CourseStatus;
	hasActiveAssignments: boolean;
}): Result<void> {
	const transition = assertCourseStatusTransition(input.status, "archived");
	if (!transition.ok) {
		return transition;
	}
	if (input.hasActiveAssignments) {
		return invalidState("Cannot archive course with active assignments");
	}
	return ok(undefined);
}

// Session Guards

export function assertSessionSchedulable(input: {
	scheduledStartsAt: Date;
	scheduledEndsAt: Date;
}): Result<true> {
	if (input.scheduledEndsAt <= input.scheduledStartsAt) {
		return invalidInput("Session end date must be after start date");
	}
	return ok(true);
}

export function canTransitionSessionStatus(
	current: SessionStatus,
	next: SessionStatus,
): boolean {
	if (current === next) return false;
	if (
		current === "scheduled" &&
		(next === "in_progress" || next === "cancelled")
	) {
		return true;
	}
	if (
		current === "in_progress" &&
		(next === "completed" || next === "cancelled")
	) {
		return true;
	}
	return false;
}

export function assertSessionStatusTransition(
	current: SessionStatus,
	next: SessionStatus,
): Result<void> {
	if (current === next) {
		return alreadyInStatus("Session", next);
	}
	if (!canTransitionSessionStatus(current, next)) {
		return cannotTransition("session", current, next);
	}
	return ok(undefined);
}

export function assertSessionNotTerminal(status: SessionStatus): Result<void> {
	if (status === "completed" || status === "cancelled") {
		return invalidState("Cannot modify completed or cancelled session");
	}
	return ok(undefined);
}

export function assertSessionCapacityAvailable(input: {
	maxParticipants: number | null;
	enrolledCount: number;
}): Result<void> {
	if (
		input.maxParticipants !== null &&
		input.enrolledCount >= input.maxParticipants
	) {
		return invalidState("Session is at full capacity");
	}
	return ok(undefined);
}

// Assignment Guards

export function assertEmploymentActiveForAssignment(
	status: EmploymentStatus,
): Result<void> {
	if (status !== "active") {
		return invalidState("Employment must be active to assign learning");
	}
	return ok(undefined);
}

export function assertAssignmentWaivable(
	status: AssignmentStatus,
): Result<true> {
	if (isAssignmentTerminal(status)) {
		return invalidState("Cannot waive a terminal assignment");
	}
	return ok(true);
}

export function assertAssignmentEnrollable(input: {
	assignmentStatus: AssignmentStatus;
	courseStatus: CourseStatus;
	sessionStatus: SessionStatus | null;
	maxParticipants: number | null;
	enrolledCount: number;
}): Result<void> {
	if (input.assignmentStatus !== "pending") {
		return invalidState("Assignment must be pending to enroll");
	}
	const courseActive = assertCourseActive(input.courseStatus);
	if (!courseActive.ok) {
		return courseActive;
	}
	if (input.sessionStatus === null) {
		return ok(undefined);
	}
	const sessionNotTerminal = assertSessionNotTerminal(input.sessionStatus);
	if (!sessionNotTerminal.ok) {
		return sessionNotTerminal;
	}
	return assertSessionCapacityAvailable({
		maxParticipants: input.maxParticipants,
		enrolledCount: input.enrolledCount,
	});
}

export function canTransitionAssignmentStatus(
	current: AssignmentStatus,
	next: AssignmentStatus,
): boolean {
	if (current === next) return false;
	if (isAssignmentTerminal(current)) return false;
	if (
		current === "pending" &&
		(next === "in_progress" || next === "withdrawn")
	) {
		return true;
	}
	if (
		current === "in_progress" &&
		(next === "completed" || next === "withdrawn")
	) {
		return true;
	}
	return false;
}

export function assertAssignmentStatusTransition(
	current: AssignmentStatus,
	next: AssignmentStatus,
): Result<void> {
	if (current === next) {
		return alreadyInStatus("Assignment", next);
	}
	if (!canTransitionAssignmentStatus(current, next)) {
		return cannotTransition("assignment", current, next);
	}
	return ok(undefined);
}

export function assertAssignmentNotTerminal(
	status: AssignmentStatus,
): Result<void> {
	if (isAssignmentTerminal(status)) {
		return invalidState("Cannot modify completed or withdrawn assignment");
	}
	return ok(undefined);
}

// Completion Guards

export function assertCompletionRecordable(input: {
	assignmentStatus: AssignmentStatus;
	sessionStatus: SessionStatus | null;
	completedAt: Date;
}): Result<void> {
	if (
		input.assignmentStatus !== "pending" &&
		input.assignmentStatus !== "in_progress"
	) {
		return invalidState(
			"Assignment must be pending or in progress to record completion",
		);
	}
	if (
		input.sessionStatus !== null &&
		(input.sessionStatus !== "completed" ||
			input.assignmentStatus !== "in_progress")
	) {
		return invalidState("Session must be completed to record completion");
	}
	return ok(undefined);
}

export function assertNoDuplicateCompletion(input: {
	hasExistingCompletion: boolean;
}): Result<void> {
	if (input.hasExistingCompletion) {
		return conflict("Completion already recorded for this assignment");
	}
	return ok(undefined);
}

// Certification Guards

export function assertCertificationIssuable(input: {
	hasRequiredCompletion: boolean;
	issuedOn: string;
	expiresOn: string | null;
	todayDate: string;
}): Result<void> {
	if (!input.hasRequiredCompletion) {
		return invalidState("Employee must complete required course first");
	}
	if (input.issuedOn > input.todayDate) {
		return invalidInput("Issue date cannot be in the future");
	}
	if (input.expiresOn !== null && input.expiresOn <= input.issuedOn) {
		return invalidInput("Expiry date must be after issue date");
	}
	return ok(undefined);
}

export function canTransitionCertificationStatus(
	current: CertificationStatus,
	next: CertificationStatus,
): boolean {
	if (current === next) return false;
	if (current === "active" && (next === "expired" || next === "revoked")) {
		return true;
	}
	return false;
}

export function assertCertificationStatusTransition(
	current: CertificationStatus,
	next: CertificationStatus,
): Result<void> {
	if (current === next) {
		return alreadyInStatus("Certification", next);
	}
	if (!canTransitionCertificationStatus(current, next)) {
		return cannotTransition("certification", current, next);
	}
	return ok(undefined);
}

export function assertCertificationCanRevoke(
	status: CertificationStatus,
): Result<void> {
	if (status !== "active") {
		return invalidState("Can only revoke active certifications");
	}
	return ok(undefined);
}

export function assertCertificationCanExpire(
	status: CertificationStatus,
): Result<void> {
	if (status !== "active") {
		return invalidState("Can only expire active certifications");
	}
	return ok(undefined);
}
