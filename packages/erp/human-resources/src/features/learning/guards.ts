import { errorResult, type Result } from "@afenda/errors";
import {
	conflict,
	invalidInput,
	invalidState,
} from "../../kernel/execution/domain-guards";
import {
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import type {
	HumanResourcesCourseId,
	HumanResourcesEmployeeId,
	HumanResourcesSessionId,
} from "../../kernel/identity/brands";
import type { EmploymentStatus } from "../workforce-records/employment/employment-status";
import {
	type AssignmentStatus,
	type CertificationStatus,
	type CourseStatus,
	isAssignmentTerminal,
	type SessionStatus,
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

// Course Guards

export function assertCourseActive(status: CourseStatus): Result<void> {
	if (status !== "active") {
		return invalidState("Course must be active");
	}
	return errorResult.ok(undefined);
}

export function canTransitionCourseStatus(
	current: CourseStatus,
	next: CourseStatus,
): boolean {
	if (current === next) {
		return false;
	}
	if (current === "active" && next === "archived") {
		return true;
	}
	if (current === "archived" && next === "active") {
		return true;
	}
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
	return errorResult.ok(undefined);
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
	return errorResult.ok(undefined);
}

// Session Guards

export function assertSessionSchedulable(input: {
	scheduledStartsAt: Date;
	scheduledEndsAt: Date;
}): Result<true> {
	if (input.scheduledEndsAt <= input.scheduledStartsAt) {
		return invalidInput("Session end date must be after start date");
	}
	return errorResult.ok(true);
}

export function canTransitionSessionStatus(
	current: SessionStatus,
	next: SessionStatus,
): boolean {
	if (current === next) {
		return false;
	}
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
	return errorResult.ok(undefined);
}

export function assertSessionNotTerminal(status: SessionStatus): Result<void> {
	if (status === "completed" || status === "cancelled") {
		return invalidState("Cannot modify completed or cancelled session");
	}
	return errorResult.ok(undefined);
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
	return errorResult.ok(undefined);
}

// Assignment Guards

export function assertEmploymentActiveForAssignment(
	status: EmploymentStatus,
): Result<void> {
	if (status !== "active") {
		return invalidState("Employment must be active to assign learning");
	}
	return errorResult.ok(undefined);
}

export function assertAssignmentWaivable(
	status: AssignmentStatus,
): Result<true> {
	if (isAssignmentTerminal(status)) {
		return invalidState("Cannot waive a terminal assignment");
	}
	return errorResult.ok(true);
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
		return errorResult.ok(undefined);
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
	if (current === next) {
		return false;
	}
	if (isAssignmentTerminal(current)) {
		return false;
	}
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
	return errorResult.ok(undefined);
}

export function assertAssignmentNotTerminal(
	status: AssignmentStatus,
): Result<void> {
	if (isAssignmentTerminal(status)) {
		return invalidState("Cannot modify completed or withdrawn assignment");
	}
	return errorResult.ok(undefined);
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
	return errorResult.ok(undefined);
}

export function assertNoDuplicateCompletion(input: {
	hasExistingCompletion: boolean;
}): Result<void> {
	if (input.hasExistingCompletion) {
		return conflict("Completion already recorded for this assignment");
	}
	return errorResult.ok(undefined);
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
	return errorResult.ok(undefined);
}

export function canTransitionCertificationStatus(
	current: CertificationStatus,
	next: CertificationStatus,
): boolean {
	if (current === next) {
		return false;
	}
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
	return errorResult.ok(undefined);
}

export function assertCertificationCanRevoke(
	status: CertificationStatus,
): Result<void> {
	if (status !== "active") {
		return invalidState("Can only revoke active certifications");
	}
	return errorResult.ok(undefined);
}

export function assertCertificationCanExpire(
	status: CertificationStatus,
): Result<void> {
	if (status !== "active") {
		return invalidState("Can only expire active certifications");
	}
	return errorResult.ok(undefined);
}

// Learning Attendance Guards

export function assertLearningAttendanceRecordable(input: {
	sessionStatus: SessionStatus;
	assignmentStatus: AssignmentStatus;
	assignmentSessionId: HumanResourcesSessionId | null;
	requestedSessionId: HumanResourcesSessionId;
}): Result<void> {
	if (
		input.sessionStatus !== "in_progress" &&
		input.sessionStatus !== "completed"
	) {
		return invalidState(
			"Learning attendance can only be recorded for in-progress or completed sessions",
		);
	}
	if (input.assignmentStatus !== "in_progress") {
		return invalidState(
			"Assignment must be in progress to record learning attendance",
		);
	}
	if (
		input.assignmentSessionId === null ||
		input.assignmentSessionId !== input.requestedSessionId
	) {
		return invalidState("Assignment is not enrolled in the requested session");
	}
	return errorResult.ok(undefined);
}

export function assertNoDuplicateLearningAttendance(input: {
	hasExistingAttendance: boolean;
}): Result<void> {
	if (input.hasExistingAttendance) {
		return conflict(
			"Attendance already recorded for this assignment and session",
		);
	}
	return errorResult.ok(undefined);
}

// Certification Renewal Guards

export function assertCertificationRenewable(input: {
	status: CertificationStatus;
	employeeId: HumanResourcesEmployeeId;
	courseId: HumanResourcesCourseId;
	completionEmployeeId: HumanResourcesEmployeeId;
	completionCourseId: HumanResourcesCourseId;
	completionOutcome: string;
}): Result<void> {
	if (input.status !== "expired") {
		return invalidState("Can only renew expired certifications");
	}
	if (
		input.employeeId !== input.completionEmployeeId ||
		input.courseId !== input.completionCourseId
	) {
		return invalidState(
			"Renewal completion does not match the certification employee and course",
		);
	}
	if (input.completionOutcome !== "passed") {
		return invalidState("Renewal requires a passed completion outcome");
	}
	return errorResult.ok(undefined);
}
