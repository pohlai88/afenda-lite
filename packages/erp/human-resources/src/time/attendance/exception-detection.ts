import type { Result } from "@afenda/errors/result";
import { ok } from "@afenda/errors/result";

import type {
	HumanResourcesAttendanceSessionId,
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentId,
	HumanResourcesShiftAssignmentId,
	HumanResourcesShiftId,
} from "../../brands";
import type { MutationPorts } from "../../ports";
import type { AttendanceExceptionCreateRecord } from "../../store/time";
import type {
	AttendanceEvent,
	AttendanceException,
	AttendanceExceptionType,
	AttendanceSession,
	Shift,
	ShiftAssignment,
	ShiftBreak,
	TimePolicy,
} from "../../types";

export const ATTENDANCE_SESSION_DETECTION_SOURCE =
	"attendance_session_resolution" as const;
export const SCHEDULE_PUBLISH_DETECTION_SOURCE = "schedule_publish" as const;

export type ExceptionDetectionSource =
	| typeof ATTENDANCE_SESSION_DETECTION_SOURCE
	| typeof SCHEDULE_PUBLISH_DETECTION_SOURCE;

export type ExceptionDetectionRemarks = {
	detectionSource: ExceptionDetectionSource;
	workDate: string;
	sessionId: string;
	exceptionType: AttendanceExceptionType;
	shiftAssignmentId: string | null;
};

export type DetectedExceptionCandidate = {
	exceptionType: AttendanceExceptionType;
	severity: "info" | "warning" | "critical";
	shiftAssignmentId: HumanResourcesShiftAssignmentId | null;
};

export type ExceptionDetectionHost = {
	getScheduledShiftForEmployeeDate(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		scheduledDate: string;
	}): Promise<Result<ShiftAssignment | null>>;
	getShift(input: {
		organizationId: string;
		shiftId: HumanResourcesShiftId;
	}): Promise<Result<Shift | null>>;
	listShiftBreaks(input: {
		organizationId: string;
		shiftId: HumanResourcesShiftId;
	}): Promise<Result<ShiftBreak[]>>;
	getPreviousCompletedAttendanceSession(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		before: Date;
		excludeSessionId: HumanResourcesAttendanceSessionId;
	}): Promise<Result<AttendanceSession | null>>;
	resolveTimePolicy(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
		asOf: string;
	}): Promise<Result<TimePolicy | null>>;
	listUnresolvedAttendanceExceptions(input: {
		organizationId: string;
		employeeId?: HumanResourcesEmployeeId;
		page?: number;
		pageSize?: number;
	}): Promise<Result<AttendanceException[]>>;
	createAttendanceException(
		input: AttendanceExceptionCreateRecord,
		ports: MutationPorts,
	): Promise<Result<AttendanceException>>;
	/** Optional: adapters that can delete a just-created exception on detection failure. */
	deleteAttendanceExceptionForRollback?(input: {
		organizationId: string;
		exceptionId: AttendanceException["id"];
	}): Promise<Result<void>>;
};

function isPublishedOrChanged(
	assignment: ShiftAssignment | null,
): assignment is ShiftAssignment {
	return (
		assignment !== null &&
		(assignment.publicationStatus === "published" ||
			assignment.publicationStatus === "changed")
	);
}

function minutesToMs(minutes: number): number {
	return Math.max(0, minutes) * 60_000;
}

/**
 * Pure rule evaluation for P0-06 auto-detection on a resolved session.
 */
export function detectAttendanceExceptionsForSession(input: {
	session: AttendanceSession;
	events: readonly AttendanceEvent[];
	scheduledAssignment: ShiftAssignment | null;
	shift: Shift | null;
	shiftBreaks: readonly ShiftBreak[];
	previousSession: AttendanceSession | null;
	minimumRestMinutes: number | null;
}): DetectedExceptionCandidate[] {
	const {
		session,
		events,
		scheduledAssignment,
		shift,
		shiftBreaks,
		previousSession,
		minimumRestMinutes,
	} = input;
	const candidates: DetectedExceptionCandidate[] = [];
	const hasActiveEvents = events.some((event) => event.voidedAt === null);
	const hasAttendanceActivity =
		session.firstClockInAt !== null ||
		session.finalClockOutAt !== null ||
		hasActiveEvents;
	const scheduled = isPublishedOrChanged(scheduledAssignment)
		? scheduledAssignment
		: null;
	const activeEvents = events
		.filter((event) => event.voidedAt === null)
		.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
	let clockedIn = false;
	let overlappingAttendance = false;
	for (const event of activeEvents) {
		if (event.eventType === "clock_in") {
			if (clockedIn) overlappingAttendance = true;
			clockedIn = true;
		}
		if (event.eventType === "clock_out") {
			clockedIn = false;
		}
	}
	if (overlappingAttendance) {
		candidates.push({
			exceptionType: "overlapping_attendance",
			severity: "critical",
			shiftAssignmentId: scheduled?.id ?? session.shiftAssignmentId,
		});
	}
	if (
		minimumRestMinutes !== null &&
		previousSession?.finalClockOutAt !== null &&
		previousSession?.finalClockOutAt !== undefined &&
		session.firstClockInAt !== null
	) {
		const restMinutes = Math.floor(
			(session.firstClockInAt.getTime() -
				previousSession.finalClockOutAt.getTime()) /
				60_000,
		);
		if (restMinutes >= 0 && restMinutes < minimumRestMinutes) {
			candidates.push({
				exceptionType: "insufficient_rest",
				severity: "critical",
				shiftAssignmentId: scheduled?.id ?? session.shiftAssignmentId,
			});
		}
	}

	if (session.finalClockOutAt !== null && session.firstClockInAt === null) {
		candidates.push({
			exceptionType: "missing_clock_in",
			severity: "critical",
			shiftAssignmentId: scheduled?.id ?? session.shiftAssignmentId,
		});
	}

	if (session.firstClockInAt !== null && session.finalClockOutAt === null) {
		candidates.push({
			exceptionType: "missing_clock_out",
			severity: "warning",
			shiftAssignmentId: scheduled?.id ?? session.shiftAssignmentId,
		});
	}

	if (scheduled === null) {
		if (hasAttendanceActivity) {
			candidates.push({
				exceptionType: "unplanned_attendance",
				severity: "info",
				shiftAssignmentId: null,
			});
		}
		return candidates;
	}

	if (
		session.shiftAssignmentId !== null &&
		session.shiftAssignmentId !== scheduled.id
	) {
		candidates.push({
			exceptionType: "schedule_mismatch",
			severity: "warning",
			shiftAssignmentId: scheduled.id,
		});
	}

	const scheduledBreakMinutes = shiftBreaks.reduce(
		(total, shiftBreak) => total + shiftBreak.durationMinutes,
		0,
	);
	if (session.breakMinutes > scheduledBreakMinutes) {
		candidates.push({
			exceptionType: "excessive_break",
			severity: "warning",
			shiftAssignmentId: scheduled.id,
		});
	}

	if (
		scheduled.locationKey !== null &&
		activeEvents.some(
			(event) =>
				event.locationKey !== null &&
				event.locationKey !== scheduled.locationKey,
		)
	) {
		candidates.push({
			exceptionType: "location_mismatch",
			severity: "warning",
			shiftAssignmentId: scheduled.id,
		});
	}

	if (
		shift?.overtimeEligible === true &&
		session.workedMinutes > shift.expectedMinutes
	) {
		candidates.push({
			exceptionType: "overtime_candidate",
			severity: "info",
			shiftAssignmentId: scheduled.id,
		});
	}

	const graceLateMinutes = shift?.graceLateMinutes ?? 0;
	const graceEarlyMinutes = shift?.graceEarlyMinutes ?? 0;

	if (session.firstClockInAt !== null) {
		const lateThreshold =
			scheduled.startsAt.getTime() + minutesToMs(graceLateMinutes);
		if (session.firstClockInAt.getTime() > lateThreshold) {
			candidates.push({
				exceptionType: "late_arrival",
				severity: "warning",
				shiftAssignmentId: scheduled.id,
			});
		}
	}

	if (session.finalClockOutAt !== null) {
		const earlyThreshold =
			scheduled.endsAt.getTime() - minutesToMs(graceEarlyMinutes);
		if (session.finalClockOutAt.getTime() < earlyThreshold) {
			candidates.push({
				exceptionType: "early_departure",
				severity: "warning",
				shiftAssignmentId: scheduled.id,
			});
		}
	}

	return candidates;
}

export function encodeExceptionDetectionRemarks(
	input: ExceptionDetectionRemarks,
): string {
	return JSON.stringify(input);
}

export function parseExceptionDetectionRemarks(
	remarks: string | null,
): ExceptionDetectionRemarks | null {
	if (remarks === null || remarks.trim().length === 0) {
		return null;
	}
	try {
		const parsed: unknown = JSON.parse(remarks);
		if (
			typeof parsed !== "object" ||
			parsed === null ||
			!("detectionSource" in parsed) ||
			!("workDate" in parsed) ||
			!("sessionId" in parsed) ||
			!("exceptionType" in parsed)
		) {
			return null;
		}
		const record = parsed as Record<string, unknown>;
		const detectionSource = record.detectionSource;
		if (
			detectionSource !== ATTENDANCE_SESSION_DETECTION_SOURCE &&
			detectionSource !== SCHEDULE_PUBLISH_DETECTION_SOURCE
		) {
			return null;
		}
		if (
			typeof record.workDate !== "string" ||
			typeof record.sessionId !== "string" ||
			typeof record.exceptionType !== "string"
		) {
			return null;
		}
		return {
			detectionSource,
			workDate: record.workDate,
			sessionId: record.sessionId,
			exceptionType: record.exceptionType as AttendanceExceptionType,
			shiftAssignmentId:
				typeof record.shiftAssignmentId === "string"
					? record.shiftAssignmentId
					: record.shiftAssignmentId === null
						? null
						: null,
		};
	} catch {
		return null;
	}
}

export function hasExistingAutoDetectedException(input: {
	exceptions: readonly AttendanceException[];
	employeeId: HumanResourcesEmployeeId;
	sessionId: HumanResourcesAttendanceSessionId;
	exceptionType: AttendanceExceptionType;
	detectionSource: ExceptionDetectionSource;
}): boolean {
	return input.exceptions.some((exception) => {
		if (exception.employeeId !== input.employeeId) return false;
		if (exception.exceptionType !== input.exceptionType) return false;
		if (exception.sessionId !== input.sessionId) return false;
		if (
			exception.reviewStatus !== "open" &&
			exception.reviewStatus !== "in_review"
		) {
			return false;
		}
		const decoded = parseExceptionDetectionRemarks(exception.remarks);
		return (
			decoded !== null &&
			decoded.detectionSource === input.detectionSource &&
			decoded.sessionId === input.sessionId &&
			decoded.exceptionType === input.exceptionType
		);
	});
}

export async function runAttendanceExceptionDetection(
	host: ExceptionDetectionHost,
	input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		session: AttendanceSession;
		events: readonly AttendanceEvent[];
		detectionSource: ExceptionDetectionSource;
		actorUserId: string;
		correlationId: string;
	},
	ports: MutationPorts,
): Promise<Result<void>> {
	const scheduled = await host.getScheduledShiftForEmployeeDate({
		organizationId: input.organizationId,
		employeeId: input.employeeId,
		scheduledDate: input.session.localWorkDate,
	});
	if (!scheduled.ok) return scheduled;

	let shift: Shift | null = null;
	let shiftBreaks: ShiftBreak[] = [];
	let minimumRestMinutes: number | null = null;
	let previousSession: AttendanceSession | null = null;
	if (
		scheduled.data !== null &&
		(scheduled.data.publicationStatus === "published" ||
			scheduled.data.publicationStatus === "changed")
	) {
		const shiftResult = await host.getShift({
			organizationId: input.organizationId,
			shiftId: scheduled.data.shiftId,
		});
		if (!shiftResult.ok) return shiftResult;
		shift = shiftResult.data;
		const breaksResult = await host.listShiftBreaks({
			organizationId: input.organizationId,
			shiftId: scheduled.data.shiftId,
		});
		if (!breaksResult.ok) return breaksResult;
		shiftBreaks = breaksResult.data;
	}
	if (input.session.employmentId !== null) {
		const policy = await host.resolveTimePolicy({
			organizationId: input.organizationId,
			employmentId: input.session.employmentId,
			asOf: input.session.localWorkDate,
		});
		if (!policy.ok) return policy;
		minimumRestMinutes = policy.data?.minimumRestMinutes ?? null;
	}
	const currentClockIn = input.session.firstClockInAt;
	if (minimumRestMinutes !== null && currentClockIn !== null) {
		const preceding = await host.getPreviousCompletedAttendanceSession({
			organizationId: input.organizationId,
			employeeId: input.employeeId,
			before: currentClockIn,
			excludeSessionId: input.session.id,
		});
		if (!preceding.ok) return preceding;
		previousSession = preceding.data;
	}

	const existing = await host.listUnresolvedAttendanceExceptions({
		organizationId: input.organizationId,
		employeeId: input.employeeId,
		page: 1,
		pageSize: 500,
	});
	if (!existing.ok) return existing;

	const candidates = detectAttendanceExceptionsForSession({
		session: input.session,
		events: input.events,
		scheduledAssignment: scheduled.data,
		shift,
		shiftBreaks,
		previousSession,
		minimumRestMinutes,
	});

	const known = [...existing.data];
	const createdIds: AttendanceException["id"][] = [];
	for (const candidate of candidates) {
		if (
			hasExistingAutoDetectedException({
				exceptions: known,
				employeeId: input.employeeId,
				sessionId: input.session.id,
				exceptionType: candidate.exceptionType,
				detectionSource: input.detectionSource,
			})
		) {
			continue;
		}

		const created = await host.createAttendanceException(
			{
				organizationId: input.organizationId,
				employeeId: input.employeeId,
				sessionId: input.session.id,
				eventId: null,
				shiftAssignmentId: candidate.shiftAssignmentId,
				exceptionType: candidate.exceptionType,
				severity: candidate.severity,
				remarks: encodeExceptionDetectionRemarks({
					detectionSource: input.detectionSource,
					workDate: input.session.localWorkDate,
					sessionId: input.session.id,
					exceptionType: candidate.exceptionType,
					shiftAssignmentId: candidate.shiftAssignmentId,
				}),
				createdBy: input.actorUserId,
				correlationId: input.correlationId,
			},
			ports,
		);
		if (!created.ok) {
			if (host.deleteAttendanceExceptionForRollback !== undefined) {
				for (const exceptionId of createdIds) {
					await host.deleteAttendanceExceptionForRollback({
						organizationId: input.organizationId,
						exceptionId,
					});
				}
			}
			return created;
		}
		createdIds.push(created.data.id);
		known.push(created.data);
	}

	return ok(undefined);
}
