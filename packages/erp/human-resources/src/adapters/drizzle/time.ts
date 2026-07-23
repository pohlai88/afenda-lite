import { randomUUID } from "node:crypto";

import {
	and,
	db,
	eq,
	gte,
	hrAttendanceAdjustment,
	hrAttendanceEvent,
	hrAttendanceException,
	hrAttendanceImportBatch,
	hrAttendanceImportError,
	hrAttendanceSession,
	hrEmployee,
	hrEmploymentCalendarAssignment,
	hrOvertimeApproval,
	hrOvertimeRequest,
	hrShift,
	hrShiftAssignment,
	hrShiftBreak,
	hrTimesheet,
	hrTimesheetEntry,
	hrWorkCalendar,
	hrWorkCalendarHoliday,
	inArray,
	lte,
	ne,
	sql,
} from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";
import type { HumanResourcesEventType } from "@afenda/events";
import {
	HUMAN_RESOURCES_TIME_ATTENDANCE_CORRECTED_EVENT,
	HUMAN_RESOURCES_TIME_ATTENDANCE_RECORDED_EVENT,
	HUMAN_RESOURCES_TIME_EXCEPTION_CREATED_EVENT,
	HUMAN_RESOURCES_TIME_OVERTIME_APPROVED_EVENT,
	HUMAN_RESOURCES_TIME_PAYROLL_HANDOFF_READY_EVENT,
	HUMAN_RESOURCES_TIME_SCHEDULE_PUBLISHED_EVENT,
	HUMAN_RESOURCES_TIME_TIMESHEET_LOCKED_EVENT,
	HUMAN_RESOURCES_TIME_TIMESHEET_REOPENED_EVENT,
	HUMAN_RESOURCES_TIME_TIMESHEET_SUBMITTED_EVENT,
	HUMAN_RESOURCES_TIMESHEET_APPROVED_EVENT,
} from "@afenda/events/schemas";

import {
	parseHumanResourcesAttendanceEventId,
	parseHumanResourcesAttendanceExceptionId,
	parseHumanResourcesAttendanceSessionId,
	parseHumanResourcesEmployeeId,
	parseHumanResourcesEmploymentCalendarAssignmentId,
	parseHumanResourcesEmploymentId,
	parseHumanResourcesOvertimeRequestId,
	parseHumanResourcesShiftAssignmentId,
	parseHumanResourcesShiftBreakId,
	parseHumanResourcesShiftId,
	parseHumanResourcesTimesheetEntryId,
	parseHumanResourcesTimesheetId,
	parseHumanResourcesWorkCalendarHolidayId,
	parseHumanResourcesWorkCalendarId,
} from "../../brands";
import type { MutationPorts } from "../../ports";
import { assertExpectedVersion } from "../../shared/concurrency";
import { conflict, invalidState, notFound } from "../../shared/domain-guards";
import {
	isCreateIdempotencyUniqueViolation,
	isPostgresForeignKeyViolation,
	isPostgresUniqueViolation,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";
import {
	assertAssignmentStatusTransition,
	assertExceptionStatusTransition,
	assertNoSelfApprove,
	assertOvertimeStatusTransition,
	assertShiftStatusTransition,
	assertTimesheetStatusTransition,
} from "../../shared/time-guards";
import type { HumanResourcesStore } from "../../store";
import type {
	HumanResourcesTimeStore,
	TimesheetGenerationDeps,
} from "../../store/time";
import {
	buildImportEventFingerprint,
	isValidIanaTimeZone,
} from "../../time/attendance/import-keys";
import {
	ATTENDANCE_SESSION_DETECTION_SOURCE,
	type ExceptionDetectionHost,
	runAttendanceExceptionDetection,
	SCHEDULE_PUBLISH_DETECTION_SOURCE,
} from "../../time/attendance/exception-detection";
import { resolveSessionFromEvents } from "../../time/attendance/session-resolution";
import {
	approvedLeaveMinutesForDate,
	encodeAbsenceDetectionRemarks,
	hasExistingTimesheetGenerationAbsence,
	isActiveEmploymentOnDate,
	isBasicFullDayAbsence,
	iterDatesInclusive,
	mapApprovedLeaveFactToEntryInput,
	qualifyingWorkedMinutesForDate,
	resolveExpectedWorkMinutes,
	TIMESHEET_GENERATION_ABSENCE_SOURCE,
} from "../../time/timesheet-generation";
import type {
	ApprovedTimeHandoff,
	AttendanceEvent,
	AttendanceException,
	AttendanceImportAcceptedRow,
	AttendanceImportBatchStatus,
	AttendanceImportRejectedRow,
	AttendanceImportResult,
	AttendanceImportSkippedRow,
	AttendanceSession,
	EmploymentCalendarAssignment,
	OvertimeRequest,
	OvertimeType,
	Shift,
	ShiftAssignment,
	ShiftBreak,
	Timesheet,
	TimesheetEntry,
	WorkCalendar,
	WorkCalendarHolidayRecord,
	WorkWeekDayPatternJson,
} from "../../types";

function resolveImportBatchStatus(input: {
	accepted: number;
	skipped: number;
	rejected: number;
}): AttendanceImportBatchStatus {
	if (input.rejected === 0) return "completed";
	if (input.accepted === 0 && input.skipped === 0) return "failed";
	return "partial";
}

function isAttendanceSourceRefUniqueViolation(error: unknown): boolean {
	if (!isPostgresUniqueViolation(error)) return false;
	const message =
		error instanceof Error
			? error.message
			: typeof error === "object" &&
					error !== null &&
					"message" in error &&
					typeof (error as { message: unknown }).message === "string"
				? (error as { message: string }).message
				: String(error);
	return /hr_attendance_event_org_source_ref_uidx|source_reference/i.test(
		message,
	);
}

const OVERTIME_TYPES = new Set<OvertimeType>([
	"weekday_overtime",
	"rest_day_overtime",
	"public_holiday_overtime",
	"night_overtime",
	"call_back",
	"emergency_overtime",
]);

async function audit(
	ports: MutationPorts,
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId?: string;
		entity: string;
		entityId: string;
		action: "CREATE" | "UPDATE" | "DELETE";
	},
): Promise<Result<{ id: string }>> {
	return ports.audit.record({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId:
			input.correlationId ?? `hr-time-${input.entity}-${input.entityId}`,
		entity: input.entity,
		entityId: input.entityId,
		action: input.action,
		changes: [],
	});
}

async function emitOutbox(
	ports: MutationPorts,
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		eventType: HumanResourcesEventType;
		entityType: string;
		entityId: string;
	},
): Promise<Result<{ id: string }>> {
	return ports.outbox.append({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		type: input.eventType,
		payload: {
			organizationId: input.organizationId,
			entityType: input.entityType,
			entityId: input.entityId,
			actorId: input.actorUserId,
			correlationId: input.correlationId,
		},
	});
}

function parseWorkWeek(value: unknown): readonly WorkWeekDayPatternJson[] {
	if (!Array.isArray(value) || value.length !== 7) {
		return [
			{
				dayOfWeek: 0,
				isWorkingDay: false,
				standardStartTime: null,
				standardEndTime: null,
				standardMinutes: null,
			},
			{
				dayOfWeek: 1,
				isWorkingDay: true,
				standardStartTime: "09:00",
				standardEndTime: "17:00",
				standardMinutes: 480,
			},
			{
				dayOfWeek: 2,
				isWorkingDay: true,
				standardStartTime: "09:00",
				standardEndTime: "17:00",
				standardMinutes: 480,
			},
			{
				dayOfWeek: 3,
				isWorkingDay: true,
				standardStartTime: "09:00",
				standardEndTime: "17:00",
				standardMinutes: 480,
			},
			{
				dayOfWeek: 4,
				isWorkingDay: true,
				standardStartTime: "09:00",
				standardEndTime: "17:00",
				standardMinutes: 480,
			},
			{
				dayOfWeek: 5,
				isWorkingDay: true,
				standardStartTime: "09:00",
				standardEndTime: "17:00",
				standardMinutes: 480,
			},
			{
				dayOfWeek: 6,
				isWorkingDay: false,
				standardStartTime: null,
				standardEndTime: null,
				standardMinutes: null,
			},
		];
	}
	return value as WorkWeekDayPatternJson[];
}

function mapCalendar(
	row: typeof hrWorkCalendar.$inferSelect,
): Result<WorkCalendar> {
	const id = parseHumanResourcesWorkCalendarId(row.id);
	if (!id.ok) return id;
	if (row.status !== "active" && row.status !== "archived") {
		return fail("INTERNAL_ERROR", "Invalid work calendar status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		code: row.code,
		name: row.name,
		timezone: row.timezone,
		calendarVersion: row.calendarVersion,
		workWeek: parseWorkWeek(row.workWeekJson),
		standardHoursPerDay: row.standardHoursPerDay,
		status: row.status,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapHolidayOverrideKind(
	value: string,
): Result<WorkCalendarHolidayRecord["overrideKind"]> {
	if (
		value === "holiday" ||
		value === "half_day" ||
		value === "shortened_day" ||
		value === "replacement_workday" ||
		value === "closure"
	) {
		return ok(value);
	}
	return fail("INTERNAL_ERROR", "Invalid work calendar override kind");
}

function mapHoliday(
	row: typeof hrWorkCalendarHoliday.$inferSelect,
): Result<WorkCalendarHolidayRecord> {
	const id = parseHumanResourcesWorkCalendarHolidayId(row.id);
	if (!id.ok) return id;
	const calendarId = parseHumanResourcesWorkCalendarId(row.calendarId);
	if (!calendarId.ok) return calendarId;
	const overrideKind = mapHolidayOverrideKind(row.overrideKind);
	if (!overrideKind.ok) return overrideKind;
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		calendarId: calendarId.data,
		holidayDate: row.holidayDate,
		label: row.label,
		locationCode: row.locationCode,
		jurisdiction: row.jurisdiction,
		overrideKind: overrideKind.data,
		isWorkingDay: row.isWorkingDay,
		expectedMinutes: row.expectedMinutes,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapEmploymentCalendar(
	row: typeof hrEmploymentCalendarAssignment.$inferSelect,
): Result<EmploymentCalendarAssignment> {
	const id = parseHumanResourcesEmploymentCalendarAssignmentId(row.id);
	if (!id.ok) return id;
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) return employeeId;
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) return employmentId;
	const calendarId = parseHumanResourcesWorkCalendarId(row.calendarId);
	if (!calendarId.ok) return calendarId;
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		employmentId: employmentId.data,
		calendarId: calendarId.data,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		locationCode: row.locationCode,
		jurisdiction: row.jurisdiction,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapShift(row: typeof hrShift.$inferSelect): Result<Shift> {
	const id = parseHumanResourcesShiftId(row.id);
	if (!id.ok) return id;
	if (
		row.shiftKind !== "fixed" &&
		row.shiftKind !== "flexible" &&
		row.shiftKind !== "split" &&
		row.shiftKind !== "rest_day" &&
		row.shiftKind !== "public_holiday"
	) {
		return fail("INTERNAL_ERROR", "Invalid shift kind");
	}
	if (
		row.status !== "draft" &&
		row.status !== "active" &&
		row.status !== "inactive"
	) {
		return fail("INTERNAL_ERROR", "Invalid shift status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		code: row.code,
		name: row.name,
		shiftKind: row.shiftKind,
		startLocal: row.startLocal,
		endLocal: row.endLocal,
		isOvernight: row.isOvernight,
		expectedMinutes: row.expectedMinutes,
		graceEarlyMinutes: row.graceEarlyMinutes,
		graceLateMinutes: row.graceLateMinutes,
		minDurationMinutes: row.minDurationMinutes,
		maxDurationMinutes: row.maxDurationMinutes,
		earliestClockInLocal: row.earliestClockInLocal,
		latestClockOutLocal: row.latestClockOutLocal,
		overtimeEligible: row.overtimeEligible,
		timezone: row.timezone,
		locationKey: row.locationKey,
		status: row.status,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapShiftBreak(
	row: typeof hrShiftBreak.$inferSelect,
): Result<ShiftBreak> {
	const id = parseHumanResourcesShiftBreakId(row.id);
	if (!id.ok) return id;
	const shiftId = parseHumanResourcesShiftId(row.shiftId);
	if (!shiftId.ok) return shiftId;
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		shiftId: shiftId.data,
		breakOrder: row.breakOrder,
		startOffsetMinutes: row.startOffsetMinutes,
		durationMinutes: row.durationMinutes,
		isPaid: row.isPaid,
		label: row.label,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapAssignment(
	row: typeof hrShiftAssignment.$inferSelect,
): Result<ShiftAssignment> {
	const id = parseHumanResourcesShiftAssignmentId(row.id);
	if (!id.ok) return id;
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) return employeeId;
	let employmentId = null as ShiftAssignment["employmentId"];
	if (row.employmentId !== null) {
		const parsed = parseHumanResourcesEmploymentId(row.employmentId);
		if (!parsed.ok) return parsed;
		employmentId = parsed.data;
	}
	const shiftId = parseHumanResourcesShiftId(row.shiftId);
	if (!shiftId.ok) return shiftId;
	if (
		row.publicationStatus !== "planned" &&
		row.publicationStatus !== "published" &&
		row.publicationStatus !== "changed" &&
		row.publicationStatus !== "cancelled" &&
		row.publicationStatus !== "completed"
	) {
		return fail("INTERNAL_ERROR", "Invalid assignment status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		employmentId,
		shiftId: shiftId.data,
		scheduledDate: row.scheduledDate,
		startsAt: row.startsAt,
		endsAt: row.endsAt,
		locationKey: row.locationKey,
		timezone: row.timezone,
		publicationStatus: row.publicationStatus,
		assignmentSource: row.assignmentSource,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapEvent(
	row: typeof hrAttendanceEvent.$inferSelect,
): Result<AttendanceEvent> {
	const id = parseHumanResourcesAttendanceEventId(row.id);
	if (!id.ok) return id;
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) return employeeId;
	let employmentId = null as AttendanceEvent["employmentId"];
	if (row.employmentId !== null) {
		const parsed = parseHumanResourcesEmploymentId(row.employmentId);
		if (!parsed.ok) return parsed;
		employmentId = parsed.data;
	}
	let shiftAssignmentId = null as AttendanceEvent["shiftAssignmentId"];
	if (row.shiftAssignmentId !== null) {
		const parsed = parseHumanResourcesShiftAssignmentId(row.shiftAssignmentId);
		if (!parsed.ok) return parsed;
		shiftAssignmentId = parsed.data;
	}
	if (
		row.eventType !== "clock_in" &&
		row.eventType !== "clock_out" &&
		row.eventType !== "break_start" &&
		row.eventType !== "break_end" &&
		row.eventType !== "manual_adjustment"
	) {
		return fail("INTERNAL_ERROR", "Invalid attendance event type");
	}
	if (
		row.source !== "self" &&
		row.source !== "supervisor" &&
		row.source !== "import" &&
		row.source !== "system" &&
		row.source !== "manual"
	) {
		return fail("INTERNAL_ERROR", "Invalid attendance event source");
	}
	const deviceMetadata =
		row.deviceMetadata !== null &&
		typeof row.deviceMetadata === "object" &&
		!Array.isArray(row.deviceMetadata)
			? (row.deviceMetadata as Record<string, unknown>)
			: null;
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		employmentId,
		shiftAssignmentId,
		eventType: row.eventType,
		occurredAt: row.occurredAt,
		sourceTimezone: row.sourceTimezone,
		localWorkDate: row.localWorkDate,
		source: row.source,
		sourceReference: row.sourceReference,
		locationKey: row.locationKey,
		deviceMetadata,
		payloadChecksum: row.payloadChecksum,
		notes: row.notes,
		voidedAt: row.voidedAt,
		voidReason: row.voidReason,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapSession(
	row: typeof hrAttendanceSession.$inferSelect,
): Result<AttendanceSession> {
	const id = parseHumanResourcesAttendanceSessionId(row.id);
	if (!id.ok) return id;
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) return employeeId;
	let employmentId = null as AttendanceSession["employmentId"];
	if (row.employmentId !== null) {
		const parsed = parseHumanResourcesEmploymentId(row.employmentId);
		if (!parsed.ok) return parsed;
		employmentId = parsed.data;
	}
	let shiftAssignmentId = null as AttendanceSession["shiftAssignmentId"];
	if (row.shiftAssignmentId !== null) {
		const parsed = parseHumanResourcesShiftAssignmentId(row.shiftAssignmentId);
		if (!parsed.ok) return parsed;
		shiftAssignmentId = parsed.data;
	}
	if (
		row.resolutionStatus !== "incomplete" &&
		row.resolutionStatus !== "resolved" &&
		row.resolutionStatus !== "needs_review" &&
		row.resolutionStatus !== "voided"
	) {
		return fail("INTERNAL_ERROR", "Invalid session resolution status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		employmentId,
		shiftAssignmentId,
		localWorkDate: row.localWorkDate,
		timezone: row.timezone,
		firstClockInAt: row.firstClockInAt,
		finalClockOutAt: row.finalClockOutAt,
		breakMinutes: row.breakMinutes,
		workedMinutes: row.workedMinutes,
		grossMinutes: row.grossMinutes,
		resolutionStatus: row.resolutionStatus,
		requiresReview: row.requiresReview,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapException(
	row: typeof hrAttendanceException.$inferSelect,
): Result<AttendanceException> {
	const id = parseHumanResourcesAttendanceExceptionId(row.id);
	if (!id.ok) return id;
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) return employeeId;
	let sessionId = null as AttendanceException["sessionId"];
	if (row.sessionId !== null) {
		const parsed = parseHumanResourcesAttendanceSessionId(row.sessionId);
		if (!parsed.ok) return parsed;
		sessionId = parsed.data;
	}
	let eventId = null as AttendanceException["eventId"];
	if (row.eventId !== null) {
		const parsed = parseHumanResourcesAttendanceEventId(row.eventId);
		if (!parsed.ok) return parsed;
		eventId = parsed.data;
	}
	let shiftAssignmentId = null as AttendanceException["shiftAssignmentId"];
	if (row.shiftAssignmentId !== null) {
		const parsed = parseHumanResourcesShiftAssignmentId(row.shiftAssignmentId);
		if (!parsed.ok) return parsed;
		shiftAssignmentId = parsed.data;
	}
	if (
		row.severity !== "info" &&
		row.severity !== "warning" &&
		row.severity !== "critical"
	) {
		return fail("INTERNAL_ERROR", "Invalid exception severity");
	}
	if (
		row.reviewStatus !== "open" &&
		row.reviewStatus !== "in_review" &&
		row.reviewStatus !== "excused" &&
		row.reviewStatus !== "rejected" &&
		row.reviewStatus !== "resolved"
	) {
		return fail("INTERNAL_ERROR", "Invalid exception review status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		sessionId,
		eventId,
		shiftAssignmentId,
		exceptionType: row.exceptionType as AttendanceException["exceptionType"],
		severity: row.severity,
		reviewStatus: row.reviewStatus,
		resolution: row.resolution,
		reviewerUserId: row.reviewerUserId,
		evidenceReference: row.evidenceReference,
		remarks: row.remarks,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapTimesheet(row: typeof hrTimesheet.$inferSelect): Result<Timesheet> {
	const id = parseHumanResourcesTimesheetId(row.id);
	if (!id.ok) return id;
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) return employeeId;
	let employmentId = null as Timesheet["employmentId"];
	if (row.employmentId !== null) {
		const parsed = parseHumanResourcesEmploymentId(row.employmentId);
		if (!parsed.ok) return parsed;
		employmentId = parsed.data;
	}
	if (
		row.status !== "draft" &&
		row.status !== "submitted" &&
		row.status !== "returned" &&
		row.status !== "approved" &&
		row.status !== "rejected" &&
		row.status !== "locked" &&
		row.status !== "superseded"
	) {
		return fail("INTERNAL_ERROR", "Invalid timesheet status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		employmentId,
		periodStart: row.periodStart,
		periodEnd: row.periodEnd,
		status: row.status,
		totalRecordedMinutes: row.totalRecordedMinutes,
		totalApprovedMinutes: row.totalApprovedMinutes,
		submittedAt: row.submittedAt,
		approvedAt: row.approvedAt,
		approvedBy: row.approvedBy,
		approverNotes: row.approverNotes,
		rejectionReason: row.rejectionReason,
		lockedAt: row.lockedAt,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapEntry(
	row: typeof hrTimesheetEntry.$inferSelect,
): Result<TimesheetEntry> {
	const id = parseHumanResourcesTimesheetEntryId(row.id);
	if (!id.ok) return id;
	const timesheetId = parseHumanResourcesTimesheetId(row.timesheetId);
	if (!timesheetId.ok) return timesheetId;
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) return employeeId;
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		timesheetId: timesheetId.data,
		employeeId: employeeId.data,
		workDate: row.workDate,
		timezone: row.timezone,
		sourceType: row.sourceType as TimesheetEntry["sourceType"],
		sourceReference: row.sourceReference,
		timeType: row.timeType as TimesheetEntry["timeType"],
		startedAt: row.startedAt,
		endedAt: row.endedAt,
		recordedMinutes: row.recordedMinutes,
		approvedMinutes: row.approvedMinutes,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapOvertime(
	row: typeof hrOvertimeRequest.$inferSelect,
): Result<OvertimeRequest> {
	const id = parseHumanResourcesOvertimeRequestId(row.id);
	if (!id.ok) return id;
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) return employeeId;
	let employmentId = null as OvertimeRequest["employmentId"];
	if (row.employmentId !== null) {
		const parsed = parseHumanResourcesEmploymentId(row.employmentId);
		if (!parsed.ok) return parsed;
		employmentId = parsed.data;
	}
	if (
		row.status !== "requested" &&
		row.status !== "approved" &&
		row.status !== "rejected" &&
		row.status !== "worked" &&
		row.status !== "verified" &&
		row.status !== "cancelled"
	) {
		return fail("INTERNAL_ERROR", "Invalid overtime status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		employmentId,
		overtimeType: row.overtimeType as OvertimeType,
		requestedStartsAt: row.requestedStartsAt,
		requestedEndsAt: row.requestedEndsAt,
		requestedMinutes: row.requestedMinutes,
		approvedMaximumMinutes: row.approvedMaximumMinutes,
		actualMinutes: row.actualMinutes,
		payrollApprovedMinutes: row.payrollApprovedMinutes,
		reason: row.reason,
		evidenceReference: row.evidenceReference,
		status: row.status,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function parseOvertimeType(value: string | null): OvertimeType | null {
	if (value === null) return null;
	return OVERTIME_TYPES.has(value as OvertimeType)
		? (value as OvertimeType)
		: null;
}

function pageOffset(
	page?: number,
	pageSize?: number,
): { limit: number; offset: number } {
	const size = pageSize ?? 50;
	const current = page ?? 1;
	return { limit: size, offset: (current - 1) * size };
}

export const drizzleTimeMethods: HumanResourcesTimeStore = {
	async findWorkCalendarByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrWorkCalendar)
				.where(
					and(
						eq(hrWorkCalendar.organizationId, input.organizationId),
						eq(hrWorkCalendar.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			if (rows.length === 0) return ok(null);
			const mapped = mapCalendar(rows[0]!);
			if (!mapped.ok) return mapped;
			return ok({
				calendar: mapped.data,
				createRequestFingerprint: rows[0]!.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find work calendar");
		}
	},

	async createWorkCalendar(input, ports) {
		try {
			const id = randomUUID();
			const now = new Date();
			const [row] = await db
				.insert(hrWorkCalendar)
				.values({
					id,
					organizationId: input.organizationId,
					code: input.code,
					name: input.name,
					timezone: input.timezone,
					calendarVersion: input.calendarVersion,
					workWeekJson: input.workWeek,
					standardHoursPerDay: input.standardHoursPerDay,
					status: "active",
					effectiveFrom: input.effectiveFrom,
					effectiveTo: input.effectiveTo,
					version: 1,
					createIdempotencyKey: input.idempotencyKey,
					createRequestFingerprint: input.createRequestFingerprint,
					createdBy: input.createdBy,
					updatedBy: input.createdBy,
					createdAt: now,
					updatedAt: now,
				})
				.returning();
			const mapped = mapCalendar(row!);
			if (!mapped.ok) return mapped;
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.createdBy,
				correlationId: input.correlationId,
				entity: "hr_work_calendar",
				entityId: mapped.data.id,
				action: "CREATE",
			});
			if (!recorded.ok) return recorded;
			return ok(mapped.data);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findWorkCalendarByIdempotencyKey({
					organizationId: input.organizationId,
					idempotencyKey: input.idempotencyKey,
				});
				if (!replay.ok) return replay;
				if (
					replay.data !== null &&
					replay.data.createRequestFingerprint ===
						input.createRequestFingerprint
				) {
					return ok(replay.data.calendar);
				}
				return conflict("Idempotency key already used with different data");
			}
			return mapPersistenceFailure(error, "Failed to create work calendar");
		}
	},

	async updateWorkCalendar(input, ports) {
		try {
			const existing = await this.getWorkCalendar({
				organizationId: input.organizationId,
				calendarId: input.calendarId,
			});
			if (!existing.ok) return existing;
			if (existing.data === null) return notFound("Work calendar not found");
			const versionCheck = assertExpectedVersion(
				existing.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			const [row] = await db
				.update(hrWorkCalendar)
				.set({
					name: input.name ?? existing.data.name,
					timezone: input.timezone ?? existing.data.timezone,
					calendarVersion:
						input.calendarVersion ?? existing.data.calendarVersion,
					workWeekJson: input.workWeek ?? existing.data.workWeek,
					standardHoursPerDay:
						input.standardHoursPerDay ?? existing.data.standardHoursPerDay,
					effectiveTo:
						input.effectiveTo !== undefined
							? input.effectiveTo
							: existing.data.effectiveTo,
					version: existing.data.version + 1,
					updatedBy: input.actorUserId,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(hrWorkCalendar.organizationId, input.organizationId),
						eq(hrWorkCalendar.id, input.calendarId),
						eq(hrWorkCalendar.version, input.expectedVersion),
					),
				)
				.returning();
			if (!row) return notFound("Work calendar not found");
			const mapped = mapCalendar(row);
			if (!mapped.ok) return mapped;
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_work_calendar",
				entityId: mapped.data.id,
				action: "UPDATE",
			});
			if (!recorded.ok) return recorded;
			return ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update work calendar");
		}
	},

	async archiveWorkCalendar(input, ports) {
		try {
			const existing = await this.getWorkCalendar({
				organizationId: input.organizationId,
				calendarId: input.calendarId,
			});
			if (!existing.ok) return existing;
			if (existing.data === null) return notFound("Work calendar not found");
			const versionCheck = assertExpectedVersion(
				existing.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			if (existing.data.status === "archived") {
				return invalidState("Work calendar is already archived");
			}
			const [row] = await db
				.update(hrWorkCalendar)
				.set({
					status: "archived",
					version: existing.data.version + 1,
					updatedBy: input.actorUserId,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(hrWorkCalendar.organizationId, input.organizationId),
						eq(hrWorkCalendar.id, input.calendarId),
						eq(hrWorkCalendar.version, input.expectedVersion),
					),
				)
				.returning();
			if (!row) return notFound("Work calendar not found");
			const mapped = mapCalendar(row);
			if (!mapped.ok) return mapped;
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_work_calendar",
				entityId: mapped.data.id,
				action: "UPDATE",
			});
			if (!recorded.ok) return recorded;
			return ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to archive work calendar");
		}
	},

	async getWorkCalendar(input) {
		try {
			const rows = await db
				.select()
				.from(hrWorkCalendar)
				.where(
					and(
						eq(hrWorkCalendar.organizationId, input.organizationId),
						eq(hrWorkCalendar.id, input.calendarId),
					),
				)
				.limit(1);
			if (rows.length === 0) return ok(null);
			return mapCalendar(rows[0]!);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to get work calendar");
		}
	},

	async listWorkCalendars(input) {
		try {
			const { limit, offset } = pageOffset(input.page, input.pageSize);
			const conditions = [
				eq(hrWorkCalendar.organizationId, input.organizationId),
			];
			if (input.status !== undefined) {
				conditions.push(eq(hrWorkCalendar.status, input.status));
			}
			const rows = await db
				.select()
				.from(hrWorkCalendar)
				.where(and(...conditions))
				.limit(limit)
				.offset(offset);
			const mapped: WorkCalendar[] = [];
			for (const row of rows) {
				const item = mapCalendar(row);
				if (!item.ok) return item;
				mapped.push(item.data);
			}
			return ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list work calendars");
		}
	},

	async addWorkCalendarHoliday(input, ports) {
		try {
			const calendar = await this.getWorkCalendar({
				organizationId: input.organizationId,
				calendarId: input.calendarId,
			});
			if (!calendar.ok) return calendar;
			if (calendar.data === null) return notFound("Work calendar not found");
			const id = randomUUID();
			const now = new Date();
			const [row] = await db
				.insert(hrWorkCalendarHoliday)
				.values({
					id,
					organizationId: input.organizationId,
					calendarId: input.calendarId,
					holidayDate: input.holidayDate,
					label: input.label,
					locationCode: input.locationCode,
					jurisdiction: input.jurisdiction,
					overrideKind: input.overrideKind,
					isWorkingDay: input.isWorkingDay,
					expectedMinutes: input.expectedMinutes,
					createdBy: input.createdBy,
					updatedBy: input.createdBy,
					createdAt: now,
					updatedAt: now,
				})
				.returning();
			const mapped = mapHoliday(row!);
			if (!mapped.ok) return mapped;
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.createdBy,
				correlationId: input.correlationId,
				entity: "hr_work_calendar_holiday",
				entityId: mapped.data.id,
				action: "CREATE",
			});
			if (!recorded.ok) return recorded;
			return ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to add work calendar holiday",
			);
		}
	},

	async removeWorkCalendarHoliday(input, ports) {
		try {
			const deleted = await db
				.delete(hrWorkCalendarHoliday)
				.where(
					and(
						eq(hrWorkCalendarHoliday.organizationId, input.organizationId),
						eq(hrWorkCalendarHoliday.id, input.holidayId),
					),
				)
				.returning({ id: hrWorkCalendarHoliday.id });
			if (deleted.length === 0)
				return notFound("Work calendar holiday not found");
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_work_calendar_holiday",
				entityId: deleted[0]!.id,
				action: "DELETE",
			});
			if (!recorded.ok) return recorded;
			return ok(undefined);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to remove work calendar holiday",
			);
		}
	},

	async listWorkCalendarHolidays(input) {
		try {
			const conditions = [
				eq(hrWorkCalendarHoliday.organizationId, input.organizationId),
				eq(hrWorkCalendarHoliday.calendarId, input.calendarId),
			];
			if (input.fromDate !== undefined) {
				conditions.push(gte(hrWorkCalendarHoliday.holidayDate, input.fromDate));
			}
			if (input.toDate !== undefined) {
				conditions.push(lte(hrWorkCalendarHoliday.holidayDate, input.toDate));
			}
			const rows = await db
				.select()
				.from(hrWorkCalendarHoliday)
				.where(and(...conditions));
			const mapped: WorkCalendarHolidayRecord[] = [];
			for (const row of rows) {
				const item = mapHoliday(row);
				if (!item.ok) return item;
				mapped.push(item.data);
			}
			return ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list work calendar holidays",
			);
		}
	},

	async assignEmploymentCalendar(input, ports) {
		try {
			const calendar = await this.getWorkCalendar({
				organizationId: input.organizationId,
				calendarId: input.calendarId,
			});
			if (!calendar.ok) return calendar;
			if (calendar.data === null) return notFound("Work calendar not found");
			const id = randomUUID();
			const now = new Date();
			const [row] = await db
				.insert(hrEmploymentCalendarAssignment)
				.values({
					id,
					organizationId: input.organizationId,
					employeeId: input.employeeId,
					employmentId: input.employmentId,
					calendarId: input.calendarId,
					effectiveFrom: input.effectiveFrom,
					effectiveTo: input.effectiveTo,
					locationCode: input.locationCode,
					jurisdiction: input.jurisdiction,
					version: 1,
					createdBy: input.createdBy,
					updatedBy: input.createdBy,
					createdAt: now,
					updatedAt: now,
				})
				.returning();
			const mapped = mapEmploymentCalendar(row!);
			if (!mapped.ok) return mapped;
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.createdBy,
				correlationId: input.correlationId,
				entity: "hr_employment_calendar_assignment",
				entityId: mapped.data.id,
				action: "CREATE",
			});
			if (!recorded.ok) return recorded;
			return ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to assign employment calendar",
			);
		}
	},

	async endEmploymentCalendarAssignment(input, ports) {
		try {
			const rows = await db
				.select()
				.from(hrEmploymentCalendarAssignment)
				.where(
					and(
						eq(
							hrEmploymentCalendarAssignment.organizationId,
							input.organizationId,
						),
						eq(hrEmploymentCalendarAssignment.id, input.assignmentId),
					),
				)
				.limit(1);
			if (rows.length === 0) {
				return notFound("Employment calendar assignment not found");
			}
			const existing = mapEmploymentCalendar(rows[0]!);
			if (!existing.ok) return existing;
			const versionCheck = assertExpectedVersion(
				existing.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			if (existing.data.effectiveTo !== null) {
				return invalidState("Employment calendar assignment is already ended");
			}
			if (input.effectiveTo < existing.data.effectiveFrom) {
				return invalidState("effectiveTo must be on or after effectiveFrom");
			}
			const [row] = await db
				.update(hrEmploymentCalendarAssignment)
				.set({
					effectiveTo: input.effectiveTo,
					version: existing.data.version + 1,
					updatedBy: input.actorUserId,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(
							hrEmploymentCalendarAssignment.organizationId,
							input.organizationId,
						),
						eq(hrEmploymentCalendarAssignment.id, input.assignmentId),
						eq(hrEmploymentCalendarAssignment.version, input.expectedVersion),
					),
				)
				.returning();
			if (!row) return notFound("Employment calendar assignment not found");
			const mapped = mapEmploymentCalendar(row);
			if (!mapped.ok) return mapped;
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_employment_calendar_assignment",
				entityId: mapped.data.id,
				action: "UPDATE",
			});
			if (!recorded.ok) return recorded;
			return ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to end employment calendar assignment",
			);
		}
	},

	async resolveEmploymentCalendar(input) {
		try {
			const rows = await db
				.select()
				.from(hrEmploymentCalendarAssignment)
				.where(
					and(
						eq(
							hrEmploymentCalendarAssignment.organizationId,
							input.organizationId,
						),
						eq(hrEmploymentCalendarAssignment.employeeId, input.employeeId),
						eq(hrEmploymentCalendarAssignment.employmentId, input.employmentId),
						lte(hrEmploymentCalendarAssignment.effectiveFrom, input.asOf),
					),
				);
			const match = rows
				.filter(
					(row) => row.effectiveTo === null || row.effectiveTo >= input.asOf,
				)
				.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
			if (!match) return ok(null);
			return mapEmploymentCalendar(match);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to resolve employment calendar",
			);
		}
	},

	async findShiftByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrShift)
				.where(
					and(
						eq(hrShift.organizationId, input.organizationId),
						eq(hrShift.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			if (rows.length === 0) return ok(null);
			const mapped = mapShift(rows[0]!);
			if (!mapped.ok) return mapped;
			return ok({
				shift: mapped.data,
				createRequestFingerprint: rows[0]!.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find shift");
		}
	},

	async createShift(input, ports) {
		try {
			const id = randomUUID();
			const now = new Date();
			const [row] = await db
				.insert(hrShift)
				.values({
					id,
					organizationId: input.organizationId,
					code: input.code,
					name: input.name,
					shiftKind: input.shiftKind,
					startLocal: input.startLocal,
					endLocal: input.endLocal,
					isOvernight: input.isOvernight,
					expectedMinutes: input.expectedMinutes,
					graceEarlyMinutes: input.graceEarlyMinutes,
					graceLateMinutes: input.graceLateMinutes,
					minDurationMinutes: input.minDurationMinutes,
					maxDurationMinutes: input.maxDurationMinutes,
					earliestClockInLocal: input.earliestClockInLocal,
					latestClockOutLocal: input.latestClockOutLocal,
					overtimeEligible: input.overtimeEligible,
					timezone: input.timezone,
					locationKey: input.locationKey,
					status: "draft",
					effectiveFrom: input.effectiveFrom,
					effectiveTo: input.effectiveTo,
					version: 1,
					createIdempotencyKey: input.idempotencyKey,
					createRequestFingerprint: input.createRequestFingerprint,
					createdBy: input.createdBy,
					updatedBy: input.createdBy,
					createdAt: now,
					updatedAt: now,
				})
				.returning();
			const mapped = mapShift(row!);
			if (!mapped.ok) return mapped;
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.createdBy,
				correlationId: input.correlationId,
				entity: "hr_shift",
				entityId: mapped.data.id,
				action: "CREATE",
			});
			if (!recorded.ok) return recorded;
			return ok(mapped.data);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findShiftByIdempotencyKey({
					organizationId: input.organizationId,
					idempotencyKey: input.idempotencyKey,
				});
				if (!replay.ok) return replay;
				if (
					replay.data !== null &&
					replay.data.createRequestFingerprint ===
						input.createRequestFingerprint
				) {
					return ok(replay.data.shift);
				}
				return conflict("Idempotency key already used with different data");
			}
			return mapPersistenceFailure(error, "Failed to create shift");
		}
	},

	async updateShift(input, ports) {
		try {
			const existing = await this.getShift({
				organizationId: input.organizationId,
				shiftId: input.shiftId,
			});
			if (!existing.ok) return existing;
			if (existing.data === null) return notFound("Shift not found");
			const versionCheck = assertExpectedVersion(
				existing.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			const [row] = await db
				.update(hrShift)
				.set({
					name: input.name ?? existing.data.name,
					shiftKind: input.shiftKind ?? existing.data.shiftKind,
					startLocal: input.startLocal ?? existing.data.startLocal,
					endLocal: input.endLocal ?? existing.data.endLocal,
					isOvernight: input.isOvernight ?? existing.data.isOvernight,
					expectedMinutes:
						input.expectedMinutes ?? existing.data.expectedMinutes,
					graceEarlyMinutes:
						input.graceEarlyMinutes ?? existing.data.graceEarlyMinutes,
					graceLateMinutes:
						input.graceLateMinutes ?? existing.data.graceLateMinutes,
					minDurationMinutes:
						input.minDurationMinutes !== undefined
							? input.minDurationMinutes
							: existing.data.minDurationMinutes,
					maxDurationMinutes:
						input.maxDurationMinutes !== undefined
							? input.maxDurationMinutes
							: existing.data.maxDurationMinutes,
					earliestClockInLocal:
						input.earliestClockInLocal !== undefined
							? input.earliestClockInLocal
							: existing.data.earliestClockInLocal,
					latestClockOutLocal:
						input.latestClockOutLocal !== undefined
							? input.latestClockOutLocal
							: existing.data.latestClockOutLocal,
					overtimeEligible:
						input.overtimeEligible ?? existing.data.overtimeEligible,
					timezone:
						input.timezone !== undefined
							? input.timezone
							: existing.data.timezone,
					locationKey:
						input.locationKey !== undefined
							? input.locationKey
							: existing.data.locationKey,
					effectiveTo:
						input.effectiveTo !== undefined
							? input.effectiveTo
							: existing.data.effectiveTo,
					version: existing.data.version + 1,
					updatedBy: input.actorUserId,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(hrShift.organizationId, input.organizationId),
						eq(hrShift.id, input.shiftId),
						eq(hrShift.version, input.expectedVersion),
					),
				)
				.returning();
			if (!row) return notFound("Shift not found");
			const mapped = mapShift(row);
			if (!mapped.ok) return mapped;
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_shift",
				entityId: mapped.data.id,
				action: "UPDATE",
			});
			if (!recorded.ok) return recorded;
			return ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update shift");
		}
	},

	async activateShift(input, ports) {
		return transitionShiftStatus(this, ports, input, "active");
	},
	async deactivateShift(input, ports) {
		return transitionShiftStatus(this, ports, input, "inactive");
	},

	async getShift(input) {
		try {
			const rows = await db
				.select()
				.from(hrShift)
				.where(
					and(
						eq(hrShift.organizationId, input.organizationId),
						eq(hrShift.id, input.shiftId),
					),
				)
				.limit(1);
			if (rows.length === 0) return ok(null);
			return mapShift(rows[0]!);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to get shift");
		}
	},

	async listShifts(input) {
		try {
			const { limit, offset } = pageOffset(input.page, input.pageSize);
			const conditions = [eq(hrShift.organizationId, input.organizationId)];
			if (input.status !== undefined) {
				conditions.push(eq(hrShift.status, input.status));
			}
			const rows = await db
				.select()
				.from(hrShift)
				.where(and(...conditions))
				.limit(limit)
				.offset(offset);
			const mapped: Shift[] = [];
			for (const row of rows) {
				const item = mapShift(row);
				if (!item.ok) return item;
				mapped.push(item.data);
			}
			return ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list shifts");
		}
	},

	async addShiftBreak(input, ports) {
		try {
			const shift = await this.getShift({
				organizationId: input.organizationId,
				shiftId: input.shiftId,
			});
			if (!shift.ok) return shift;
			if (shift.data === null) return notFound("Shift not found");
			const id = randomUUID();
			const now = new Date();
			const [row] = await db
				.insert(hrShiftBreak)
				.values({
					id,
					organizationId: input.organizationId,
					shiftId: input.shiftId,
					breakOrder: input.breakOrder,
					startOffsetMinutes: input.startOffsetMinutes,
					durationMinutes: input.durationMinutes,
					isPaid: input.isPaid,
					label: input.label,
					createdAt: now,
					updatedAt: now,
				})
				.returning();
			const mapped = mapShiftBreak(row!);
			if (!mapped.ok) return mapped;
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: shift.data.updatedBy,
				correlationId: input.correlationId,
				entity: "hr_shift_break",
				entityId: mapped.data.id,
				action: "CREATE",
			});
			if (!recorded.ok) return recorded;
			return ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to add shift break");
		}
	},

	async removeShiftBreak(input, ports) {
		try {
			const deleted = await db
				.delete(hrShiftBreak)
				.where(
					and(
						eq(hrShiftBreak.organizationId, input.organizationId),
						eq(hrShiftBreak.id, input.breakId),
					),
				)
				.returning({ id: hrShiftBreak.id });
			if (deleted.length === 0) return notFound("Shift break not found");
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_shift_break",
				entityId: deleted[0]!.id,
				action: "DELETE",
			});
			if (!recorded.ok) return recorded;
			return ok(undefined);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to remove shift break");
		}
	},

	async listShiftBreaks(input) {
		try {
			const rows = await db
				.select()
				.from(hrShiftBreak)
				.where(
					and(
						eq(hrShiftBreak.organizationId, input.organizationId),
						eq(hrShiftBreak.shiftId, input.shiftId),
					),
				);
			const mapped: ShiftBreak[] = [];
			for (const row of rows) {
				const item = mapShiftBreak(row);
				if (!item.ok) return item;
				mapped.push(item.data);
			}
			return ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list shift breaks");
		}
	},

	async findShiftAssignmentByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrShiftAssignment)
				.where(
					and(
						eq(hrShiftAssignment.organizationId, input.organizationId),
						eq(hrShiftAssignment.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			if (rows.length === 0) return ok(null);
			const mapped = mapAssignment(rows[0]!);
			if (!mapped.ok) return mapped;
			return ok({
				assignment: mapped.data,
				createRequestFingerprint: rows[0]!.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find shift assignment");
		}
	},

	async assignShift(input, ports) {
		try {
			const shift = await this.getShift({
				organizationId: input.organizationId,
				shiftId: input.shiftId,
			});
			if (!shift.ok) return shift;
			if (shift.data === null) return notFound("Shift not found");
			if (shift.data.status !== "active") {
				return invalidState("Shift must be active to assign");
			}
			const overlaps = await this.findOverlappingShiftAssignments({
				organizationId: input.organizationId,
				employeeId: input.employeeId,
				startsAt: input.startsAt,
				endsAt: input.endsAt,
			});
			if (!overlaps.ok) return overlaps;
			if (overlaps.data.length > 0) {
				return conflict("Shift assignment overlaps an existing assignment");
			}
			const id = randomUUID();
			const now = new Date();
			const [row] = await db
				.insert(hrShiftAssignment)
				.values({
					id,
					organizationId: input.organizationId,
					employeeId: input.employeeId,
					employmentId: input.employmentId,
					shiftId: input.shiftId,
					scheduledDate: input.scheduledDate,
					startsAt: input.startsAt,
					endsAt: input.endsAt,
					locationKey: input.locationKey,
					timezone: input.timezone,
					publicationStatus: "planned",
					assignmentSource: input.assignmentSource,
					version: 1,
					createIdempotencyKey: input.idempotencyKey,
					createRequestFingerprint: input.createRequestFingerprint,
					createdBy: input.createdBy,
					updatedBy: input.createdBy,
					createdAt: now,
					updatedAt: now,
				})
				.returning();
			const mapped = mapAssignment(row!);
			if (!mapped.ok) return mapped;
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.createdBy,
				correlationId: input.correlationId,
				entity: "hr_shift_assignment",
				entityId: mapped.data.id,
				action: "CREATE",
			});
			if (!recorded.ok) return recorded;
			return ok(mapped.data);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findShiftAssignmentByIdempotencyKey({
					organizationId: input.organizationId,
					idempotencyKey: input.idempotencyKey,
				});
				if (!replay.ok) return replay;
				if (
					replay.data !== null &&
					replay.data.createRequestFingerprint ===
						input.createRequestFingerprint
				) {
					return ok(replay.data.assignment);
				}
				return conflict("Idempotency key already used with different data");
			}
			return mapPersistenceFailure(error, "Failed to assign shift");
		}
	},

	async publishShiftAssignment(input, ports) {
		const before = await this.getShiftAssignment({
			organizationId: input.organizationId,
			assignmentId: input.assignmentId,
		});
		if (!before.ok) return before;
		const previous = before.data;

		const published = await transitionAssignment(
			this,
			ports,
			input,
			"published",
		);
		if (!published.ok) return published;

		const sessions = await this.listAttendanceSessions({
			organizationId: input.organizationId,
			employeeId: published.data.employeeId,
			fromDate: published.data.scheduledDate,
			toDate: published.data.scheduledDate,
			page: 1,
			pageSize: 10,
		});
		if (!sessions.ok) {
			if (previous !== null) {
				await restoreShiftAssignmentPublication(previous);
			}
			return sessions;
		}
		const session = sessions.data[0];
		if (session === undefined) {
			return published;
		}

		const events = await this.listAttendanceEvents({
			organizationId: input.organizationId,
			employeeId: session.employeeId,
			fromDate: session.localWorkDate,
			toDate: session.localWorkDate,
			page: 1,
			pageSize: 500,
		});
		if (!events.ok) {
			if (previous !== null) {
				await restoreShiftAssignmentPublication(previous);
			}
			return events;
		}

		const detected = await runAttendanceExceptionDetection(
			drizzleExceptionDetectionHost(this),
			{
				organizationId: input.organizationId,
				employeeId: session.employeeId,
				session,
				events: events.data,
				detectionSource: SCHEDULE_PUBLISH_DETECTION_SOURCE,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
			},
			ports,
		);
		if (!detected.ok) {
			if (previous !== null) {
				await restoreShiftAssignmentPublication(previous);
			}
			return detected;
		}
		return published;
	},
	async cancelShiftAssignment(input, ports) {
		return transitionAssignment(this, ports, input, "cancelled");
	},
	async completeShiftAssignment(input, ports) {
		return transitionAssignment(this, ports, input, "completed");
	},

	async changeShiftAssignment(input, ports) {
		try {
			const existing = await this.getShiftAssignment({
				organizationId: input.organizationId,
				assignmentId: input.assignmentId,
			});
			if (!existing.ok) return existing;
			if (existing.data === null) return notFound("Shift assignment not found");
			const versionCheck = assertExpectedVersion(
				existing.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			const transition = assertAssignmentStatusTransition(
				existing.data.publicationStatus,
				"changed",
			);
			if (!transition.ok) return transition;
			const startsAt = input.startsAt ?? existing.data.startsAt;
			const endsAt = input.endsAt ?? existing.data.endsAt;
			const overlaps = await this.findOverlappingShiftAssignments({
				organizationId: input.organizationId,
				employeeId: existing.data.employeeId,
				startsAt,
				endsAt,
				excludeAssignmentId: existing.data.id,
			});
			if (!overlaps.ok) return overlaps;
			if (overlaps.data.length > 0) {
				return conflict("Shift assignment overlaps an existing assignment");
			}
			const [row] = await db
				.update(hrShiftAssignment)
				.set({
					shiftId: input.shiftId ?? existing.data.shiftId,
					scheduledDate: input.scheduledDate ?? existing.data.scheduledDate,
					startsAt,
					endsAt,
					locationKey:
						input.locationKey !== undefined
							? input.locationKey
							: existing.data.locationKey,
					timezone: input.timezone ?? existing.data.timezone,
					publicationStatus: "changed",
					version: existing.data.version + 1,
					updatedBy: input.actorUserId,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(hrShiftAssignment.organizationId, input.organizationId),
						eq(hrShiftAssignment.id, input.assignmentId),
						eq(hrShiftAssignment.version, input.expectedVersion),
					),
				)
				.returning();
			if (!row) return notFound("Shift assignment not found");
			const mapped = mapAssignment(row);
			if (!mapped.ok) return mapped;
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_shift_assignment",
				entityId: mapped.data.id,
				action: "UPDATE",
			});
			if (!recorded.ok) return recorded;
			return ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to change shift assignment");
		}
	},

	async getShiftAssignment(input) {
		try {
			const rows = await db
				.select()
				.from(hrShiftAssignment)
				.where(
					and(
						eq(hrShiftAssignment.organizationId, input.organizationId),
						eq(hrShiftAssignment.id, input.assignmentId),
					),
				)
				.limit(1);
			if (rows.length === 0) return ok(null);
			return mapAssignment(rows[0]!);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to get shift assignment");
		}
	},

	async listShiftAssignments(input) {
		try {
			const { limit, offset } = pageOffset(input.page, input.pageSize);
			const conditions = [
				eq(hrShiftAssignment.organizationId, input.organizationId),
			];
			if (input.employeeId !== undefined) {
				conditions.push(eq(hrShiftAssignment.employeeId, input.employeeId));
			}
			if (input.fromDate !== undefined) {
				conditions.push(gte(hrShiftAssignment.scheduledDate, input.fromDate));
			}
			if (input.toDate !== undefined) {
				conditions.push(lte(hrShiftAssignment.scheduledDate, input.toDate));
			}
			if (input.scheduledDate !== undefined) {
				conditions.push(
					eq(hrShiftAssignment.scheduledDate, input.scheduledDate),
				);
			}
			if (input.locationKey !== undefined) {
				conditions.push(eq(hrShiftAssignment.locationKey, input.locationKey));
			}
			if (input.publicationStatus !== undefined) {
				conditions.push(
					eq(hrShiftAssignment.publicationStatus, input.publicationStatus),
				);
			}
			const rows = await db
				.select()
				.from(hrShiftAssignment)
				.where(and(...conditions))
				.limit(limit)
				.offset(offset);
			const mapped: ShiftAssignment[] = [];
			for (const row of rows) {
				const item = mapAssignment(row);
				if (!item.ok) return item;
				mapped.push(item.data);
			}
			return ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list shift assignments");
		}
	},

	async getScheduledShiftForEmployeeDate(input) {
		try {
			const rows = await db
				.select()
				.from(hrShiftAssignment)
				.where(
					and(
						eq(hrShiftAssignment.organizationId, input.organizationId),
						eq(hrShiftAssignment.employeeId, input.employeeId),
						eq(hrShiftAssignment.scheduledDate, input.scheduledDate),
						ne(hrShiftAssignment.publicationStatus, "cancelled"),
					),
				);
			const mapped: ShiftAssignment[] = [];
			for (const row of rows) {
				const item = mapAssignment(row);
				if (!item.ok) return item;
				mapped.push(item.data);
			}
			const rank: Record<ShiftAssignment["publicationStatus"], number> = {
				published: 3,
				changed: 2,
				planned: 1,
				completed: 0,
				cancelled: -1,
			};
			mapped.sort(
				(a, b) => rank[b.publicationStatus] - rank[a.publicationStatus],
			);
			return ok(mapped[0] ?? null);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to get scheduled shift for employee date",
			);
		}
	},

	async listLocationSchedule(input) {
		return this.listShiftAssignments({
			organizationId: input.organizationId,
			locationKey: input.locationKey,
			fromDate: input.fromDate,
			toDate: input.toDate,
			publicationStatus: input.publicationStatus,
			page: input.page,
			pageSize: input.pageSize,
		});
	},

	async findOverlappingShiftAssignments(input) {
		try {
			const conditions = [
				eq(hrShiftAssignment.organizationId, input.organizationId),
				eq(hrShiftAssignment.employeeId, input.employeeId),
				ne(hrShiftAssignment.publicationStatus, "cancelled"),
				sql`${hrShiftAssignment.startsAt} < ${input.endsAt}`,
				sql`${hrShiftAssignment.endsAt} > ${input.startsAt}`,
			];
			if (input.excludeAssignmentId !== undefined) {
				conditions.push(ne(hrShiftAssignment.id, input.excludeAssignmentId));
			}
			const rows = await db
				.select()
				.from(hrShiftAssignment)
				.where(and(...conditions));
			const mapped: ShiftAssignment[] = [];
			for (const row of rows) {
				const item = mapAssignment(row);
				if (!item.ok) return item;
				mapped.push(item.data);
			}
			return ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find overlapping assignments",
			);
		}
	},

	async findAttendanceEventByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrAttendanceEvent)
				.where(
					and(
						eq(hrAttendanceEvent.organizationId, input.organizationId),
						eq(hrAttendanceEvent.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			if (rows.length === 0) return ok(null);
			const mapped = mapEvent(rows[0]!);
			if (!mapped.ok) return mapped;
			return ok({
				event: mapped.data,
				createRequestFingerprint: rows[0]!.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find attendance event");
		}
	},

	async findAttendanceEventBySourceReference(input) {
		try {
			const rows = await db
				.select()
				.from(hrAttendanceEvent)
				.where(
					and(
						eq(hrAttendanceEvent.organizationId, input.organizationId),
						eq(hrAttendanceEvent.source, input.source),
						eq(hrAttendanceEvent.sourceReference, input.sourceReference),
					),
				)
				.limit(1);
			if (rows.length === 0) return ok(null);
			const mapped = mapEvent(rows[0]!);
			if (!mapped.ok) return mapped;
			return ok({
				event: mapped.data,
				createRequestFingerprint: rows[0]!.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find attendance event by source reference",
			);
		}
	},

	async findAttendanceImportBatchByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrAttendanceImportBatch)
				.where(
					and(
						eq(hrAttendanceImportBatch.organizationId, input.organizationId),
						eq(
							hrAttendanceImportBatch.createIdempotencyKey,
							input.idempotencyKey,
						),
					),
				)
				.limit(1);
			if (rows.length === 0) return ok(null);
			const snapshot = rows[0]!.resultSnapshot;
			if (
				snapshot === null ||
				typeof snapshot !== "object" ||
				Array.isArray(snapshot)
			) {
				return fail("INTERNAL_ERROR", "Invalid import batch snapshot");
			}
			return ok({
				result: snapshot as AttendanceImportResult,
				createRequestFingerprint: rows[0]!.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find attendance import batch");
		}
	},

	async importAttendanceEvents(input, ports) {
		try {
			const existingBatch = await this.findAttendanceImportBatchByIdempotencyKey(
				{
					organizationId: input.organizationId,
					idempotencyKey: input.idempotencyKey,
				},
			);
			if (!existingBatch.ok) return existingBatch;
			if (existingBatch.data !== null) {
				if (
					existingBatch.data.createRequestFingerprint !==
					input.createRequestFingerprint
				) {
					return conflict("Idempotency key already used with different data");
				}
				return ok(existingBatch.data.result);
			}

			const importBatchId = randomUUID();
			const accepted: AttendanceImportAcceptedRow[] = [];
			const skipped: AttendanceImportSkippedRow[] = [];
			const rejected: AttendanceImportRejectedRow[] = [];
			const errorRows: Array<{
				id: string;
				organizationId: string;
				importBatchId: string;
				rowIndex: number;
				sourceReference: string | null;
				errorCode: string;
				errorMessage: string;
				payloadChecksum: string | null;
				createdAt: Date;
			}> = [];
			const now = new Date();

			for (let rowIndex = 0; rowIndex < input.events.length; rowIndex += 1) {
				const row = input.events[rowIndex]!;
				if (!isValidIanaTimeZone(row.sourceTimezone)) {
					const rejection: AttendanceImportRejectedRow = {
						rowIndex,
						sourceReference: row.sourceReference,
						errorCode: "INVALID_TIMEZONE",
						errorMessage: "Invalid IANA timezone",
					};
					rejected.push(rejection);
					errorRows.push({
						id: randomUUID(),
						organizationId: input.organizationId,
						importBatchId,
						rowIndex,
						sourceReference: row.sourceReference,
						errorCode: rejection.errorCode,
						errorMessage: rejection.errorMessage,
						payloadChecksum: row.payloadChecksum ?? null,
						createdAt: now,
					});
					continue;
				}

				const employeeRows = await db
					.select({ id: hrEmployee.id })
					.from(hrEmployee)
					.where(
						and(
							eq(hrEmployee.organizationId, input.organizationId),
							eq(hrEmployee.id, row.employeeId),
						),
					)
					.limit(1);
				if (employeeRows.length === 0) {
					const rejection: AttendanceImportRejectedRow = {
						rowIndex,
						sourceReference: row.sourceReference,
						errorCode: "UNKNOWN_EMPLOYEE",
						errorMessage: "Employee not found in organization",
					};
					rejected.push(rejection);
					errorRows.push({
						id: randomUUID(),
						organizationId: input.organizationId,
						importBatchId,
						rowIndex,
						sourceReference: row.sourceReference,
						errorCode: rejection.errorCode,
						errorMessage: rejection.errorMessage,
						payloadChecksum: row.payloadChecksum ?? null,
						createdAt: now,
					});
					continue;
				}

				const fingerprint = buildImportEventFingerprint({
					employeeId: row.employeeId,
					employmentId: row.employmentId ?? null,
					shiftAssignmentId: row.shiftAssignmentId ?? null,
					eventType: row.eventType,
					occurredAtIso: row.occurredAt.toISOString(),
					sourceTimezone: row.sourceTimezone,
					localWorkDate: row.localWorkDate,
					sourceKey: input.sourceKey,
					sourceReference: row.sourceReference,
					payloadChecksum: row.payloadChecksum ?? null,
				});

				const existingByRef = await this.findAttendanceEventBySourceReference({
					organizationId: input.organizationId,
					source: "import",
					sourceReference: row.sourceReference,
				});
				if (!existingByRef.ok) {
					rejected.push({
						rowIndex,
						sourceReference: row.sourceReference,
						errorCode: "STORE_ERROR",
						errorMessage: existingByRef.message,
					});
					continue;
				}
				if (existingByRef.data !== null) {
					if (existingByRef.data.createRequestFingerprint === fingerprint) {
						skipped.push({
							rowIndex,
							sourceReference: row.sourceReference,
							eventId: existingByRef.data.event.id,
							reason: "already_imported",
						});
					} else {
						const rejection: AttendanceImportRejectedRow = {
							rowIndex,
							sourceReference: row.sourceReference,
							errorCode: "SOURCE_REFERENCE_CONFLICT",
							errorMessage:
								"Source reference already used with different payload",
						};
						rejected.push(rejection);
						errorRows.push({
							id: randomUUID(),
							organizationId: input.organizationId,
							importBatchId,
							rowIndex,
							sourceReference: row.sourceReference,
							errorCode: rejection.errorCode,
							errorMessage: rejection.errorMessage,
							payloadChecksum: row.payloadChecksum ?? null,
							createdAt: now,
						});
					}
					continue;
				}

				const recorded = await this.recordAttendanceEvent(
					{
						organizationId: input.organizationId,
						employeeId: row.employeeId,
						employmentId: row.employmentId ?? null,
						shiftAssignmentId: row.shiftAssignmentId ?? null,
						eventType: row.eventType,
						occurredAt: row.occurredAt,
						sourceTimezone: row.sourceTimezone,
						localWorkDate: row.localWorkDate,
						source: "import",
						sourceReference: row.sourceReference,
						locationKey: row.locationKey ?? null,
						deviceMetadata: row.deviceMetadata ?? null,
						payloadChecksum: row.payloadChecksum ?? null,
						notes: row.notes ?? null,
						idempotencyKey: `import:${row.sourceReference}`,
						createRequestFingerprint: fingerprint,
						createdBy: input.createdBy,
						correlationId: input.correlationId ?? input.batchId,
					},
					ports,
				);
				if (!recorded.ok) {
					const rejection: AttendanceImportRejectedRow = {
						rowIndex,
						sourceReference: row.sourceReference,
						errorCode: recorded.code,
						errorMessage: recorded.message,
					};
					rejected.push(rejection);
					errorRows.push({
						id: randomUUID(),
						organizationId: input.organizationId,
						importBatchId,
						rowIndex,
						sourceReference: row.sourceReference,
						errorCode: rejection.errorCode,
						errorMessage: rejection.errorMessage,
						payloadChecksum: row.payloadChecksum ?? null,
						createdAt: now,
					});
					continue;
				}
				accepted.push({
					rowIndex,
					sourceReference: row.sourceReference,
					eventId: recorded.data.id,
				});
			}

			const status = resolveImportBatchStatus({
				accepted: accepted.length,
				skipped: skipped.length,
				rejected: rejected.length,
			});
			const result: AttendanceImportResult = {
				importBatchId,
				batchId: input.batchId,
				sourceKey: input.sourceKey,
				status,
				accepted,
				skipped,
				rejected,
				totals: {
					accepted: accepted.length,
					skipped: skipped.length,
					rejected: rejected.length,
				},
				nextCursor: input.nextCursor,
			};

			try {
				await db.insert(hrAttendanceImportBatch).values({
					id: importBatchId,
					organizationId: input.organizationId,
					batchId: input.batchId,
					sourceKey: input.sourceKey,
					status,
					acceptedCount: accepted.length,
					skippedCount: skipped.length,
					rejectedCount: rejected.length,
					createIdempotencyKey: input.idempotencyKey,
					createRequestFingerprint: input.createRequestFingerprint,
					resultSnapshot: result,
					createdBy: input.createdBy,
					createdAt: now,
					completedAt: now,
				});
			} catch (error) {
				if (isCreateIdempotencyUniqueViolation(error)) {
					const replay = await this.findAttendanceImportBatchByIdempotencyKey({
						organizationId: input.organizationId,
						idempotencyKey: input.idempotencyKey,
					});
					if (!replay.ok) return replay;
					if (
						replay.data !== null &&
						replay.data.createRequestFingerprint ===
							input.createRequestFingerprint
					) {
						return ok(replay.data.result);
					}
					return conflict("Idempotency key already used with different data");
				}
				return mapPersistenceFailure(error, "Failed to persist import batch");
			}

			if (errorRows.length > 0) {
				await db.insert(hrAttendanceImportError).values(errorRows);
			}

			const audited = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.createdBy,
				correlationId: input.correlationId,
				entity: "hr_attendance_import_batch",
				entityId: importBatchId,
				action: "CREATE",
			});
			if (!audited.ok) return audited;
			return ok(result);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to import attendance events");
		}
	},

	async recordAttendanceEvent(input, ports) {
		try {
			const id = randomUUID();
			const now = new Date();
			const [row] = await db
				.insert(hrAttendanceEvent)
				.values({
					id,
					organizationId: input.organizationId,
					employeeId: input.employeeId,
					employmentId: input.employmentId ?? null,
					shiftAssignmentId: input.shiftAssignmentId ?? null,
					eventType: input.eventType,
					occurredAt: input.occurredAt,
					sourceTimezone: input.sourceTimezone,
					localWorkDate: input.localWorkDate,
					source: input.source,
					sourceReference: input.sourceReference ?? null,
					deviceMetadata: input.deviceMetadata ?? null,
					locationKey: input.locationKey ?? null,
					payloadChecksum: input.payloadChecksum ?? null,
					notes: input.notes ?? null,
					voidedAt: null,
					voidReason: null,
					version: 1,
					createIdempotencyKey: input.idempotencyKey,
					createRequestFingerprint: input.createRequestFingerprint,
					createdBy: input.createdBy,
					updatedBy: input.createdBy,
					createdAt: now,
					updatedAt: now,
				})
				.returning();
			const mapped = mapEvent(row!);
			if (!mapped.ok) return mapped;
			const correlationId =
				input.correlationId ??
				`hr-time-hr_attendance_event-${mapped.data.id}`;
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.createdBy,
				correlationId,
				entity: "hr_attendance_event",
				entityId: mapped.data.id,
				action: "CREATE",
			});
			if (!recorded.ok) return recorded;
			const event = await emitOutbox(ports, {
				organizationId: input.organizationId,
				actorUserId: input.createdBy,
				correlationId,
				eventType: HUMAN_RESOURCES_TIME_ATTENDANCE_RECORDED_EVENT,
				entityType: "hr_attendance_event",
				entityId: mapped.data.id,
			});
			if (!event.ok) return event;
			return ok(mapped.data);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findAttendanceEventByIdempotencyKey({
					organizationId: input.organizationId,
					idempotencyKey: input.idempotencyKey,
				});
				if (!replay.ok) return replay;
				if (
					replay.data !== null &&
					replay.data.createRequestFingerprint ===
						input.createRequestFingerprint
				) {
					return ok(replay.data.event);
				}
				return conflict("Idempotency key already used with different data");
			}
			if (
				isAttendanceSourceRefUniqueViolation(error) &&
				input.sourceReference !== null &&
				input.sourceReference !== undefined
			) {
				const replay = await this.findAttendanceEventBySourceReference({
					organizationId: input.organizationId,
					source: input.source,
					sourceReference: input.sourceReference,
				});
				if (!replay.ok) return replay;
				if (
					replay.data !== null &&
					replay.data.createRequestFingerprint ===
						input.createRequestFingerprint
				) {
					return ok(replay.data.event);
				}
				return conflict(
					"Source reference already used with different data",
				);
			}
			if (isPostgresForeignKeyViolation(error)) {
				return fail("VALIDATION_ERROR", "Employee not found in organization");
			}
			return mapPersistenceFailure(error, "Failed to record attendance event");
		}
	},

	async correctAttendanceEvent(input, ports) {
		try {
			const existing = await this.getAttendanceEvent({
				organizationId: input.organizationId,
				eventId: input.eventId,
			});
			if (!existing.ok) return existing;
			if (existing.data === null) return notFound("Attendance event not found");
			if (existing.data.voidedAt !== null) {
				return invalidState("Cannot correct a voided attendance event");
			}
			const versionCheck = assertExpectedVersion(
				existing.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			const [row] = await db
				.update(hrAttendanceEvent)
				.set({
					occurredAt: input.occurredAt,
					notes: input.notes !== undefined ? input.notes : existing.data.notes,
					version: existing.data.version + 1,
					updatedBy: input.actorUserId,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(hrAttendanceEvent.organizationId, input.organizationId),
						eq(hrAttendanceEvent.id, input.eventId),
						eq(hrAttendanceEvent.version, input.expectedVersion),
					),
				)
				.returning();
			if (!row) return notFound("Attendance event not found");
			await db.insert(hrAttendanceAdjustment).values({
				id: randomUUID(),
				organizationId: input.organizationId,
				eventId: input.eventId,
				previousOccurredAt: existing.data.occurredAt,
				newOccurredAt: input.occurredAt,
				adjustmentReason: input.adjustmentReason,
				actorUserId: input.actorUserId,
				createdAt: new Date(),
			});
			const mapped = mapEvent(row);
			if (!mapped.ok) return mapped;
			const correlationId =
				input.correlationId ??
				`hr-time-hr_attendance_event-${mapped.data.id}`;
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId,
				entity: "hr_attendance_event",
				entityId: mapped.data.id,
				action: "UPDATE",
			});
			if (!recorded.ok) return recorded;
			const event = await emitOutbox(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId,
				eventType: HUMAN_RESOURCES_TIME_ATTENDANCE_CORRECTED_EVENT,
				entityType: "hr_attendance_event",
				entityId: mapped.data.id,
			});
			if (!event.ok) return event;
			return ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to correct attendance event");
		}
	},

	async voidAttendanceEvent(input, ports) {
		try {
			const existing = await this.getAttendanceEvent({
				organizationId: input.organizationId,
				eventId: input.eventId,
			});
			if (!existing.ok) return existing;
			if (existing.data === null) return notFound("Attendance event not found");
			const versionCheck = assertExpectedVersion(
				existing.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			if (existing.data.voidedAt !== null) {
				return invalidState("Attendance event is already voided");
			}
			const [row] = await db
				.update(hrAttendanceEvent)
				.set({
					voidedAt: new Date(),
					voidReason: input.voidReason,
					version: existing.data.version + 1,
					updatedBy: input.actorUserId,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(hrAttendanceEvent.organizationId, input.organizationId),
						eq(hrAttendanceEvent.id, input.eventId),
						eq(hrAttendanceEvent.version, input.expectedVersion),
					),
				)
				.returning();
			if (!row) return notFound("Attendance event not found");
			const mapped = mapEvent(row);
			if (!mapped.ok) return mapped;
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_attendance_event",
				entityId: mapped.data.id,
				action: "UPDATE",
			});
			if (!recorded.ok) return recorded;
			return ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to void attendance event");
		}
	},

	async getAttendanceEvent(input) {
		try {
			const rows = await db
				.select()
				.from(hrAttendanceEvent)
				.where(
					and(
						eq(hrAttendanceEvent.organizationId, input.organizationId),
						eq(hrAttendanceEvent.id, input.eventId),
					),
				)
				.limit(1);
			if (rows.length === 0) return ok(null);
			return mapEvent(rows[0]!);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to get attendance event");
		}
	},

	async listAttendanceEvents(input) {
		try {
			const { limit, offset } = pageOffset(input.page, input.pageSize);
			const conditions = [
				eq(hrAttendanceEvent.organizationId, input.organizationId),
			];
			if (input.employeeId !== undefined) {
				conditions.push(eq(hrAttendanceEvent.employeeId, input.employeeId));
			}
			if (input.fromDate !== undefined) {
				conditions.push(gte(hrAttendanceEvent.localWorkDate, input.fromDate));
			}
			if (input.toDate !== undefined) {
				conditions.push(lte(hrAttendanceEvent.localWorkDate, input.toDate));
			}
			if (input.eventType !== undefined) {
				conditions.push(eq(hrAttendanceEvent.eventType, input.eventType));
			}
			const rows = await db
				.select()
				.from(hrAttendanceEvent)
				.where(and(...conditions))
				.limit(limit)
				.offset(offset);
			const mapped: AttendanceEvent[] = [];
			for (const row of rows) {
				const item = mapEvent(row);
				if (!item.ok) return item;
				mapped.push(item.data);
			}
			return ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list attendance events");
		}
	},

	async findAttendanceSessionByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrAttendanceSession)
				.where(
					and(
						eq(hrAttendanceSession.organizationId, input.organizationId),
						eq(hrAttendanceSession.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			if (rows.length === 0) return ok(null);
			const mapped = mapSession(rows[0]!);
			if (!mapped.ok) return mapped;
			return ok({
				session: mapped.data,
				createRequestFingerprint: rows[0]!.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find attendance session");
		}
	},

	async resolveAttendanceSession(input, ports) {
		try {
			const eventRows = await db
				.select()
				.from(hrAttendanceEvent)
				.where(
					and(
						eq(hrAttendanceEvent.organizationId, input.organizationId),
						eq(hrAttendanceEvent.employeeId, input.employeeId),
						eq(hrAttendanceEvent.localWorkDate, input.localWorkDate),
					),
				);
			const events: AttendanceEvent[] = [];
			for (const row of eventRows) {
				const mapped = mapEvent(row);
				if (!mapped.ok) return mapped;
				events.push(mapped.data);
			}
			events.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
			const resolved = resolveSessionFromEvents(events);

			const existingRows = await db
				.select()
				.from(hrAttendanceSession)
				.where(
					and(
						eq(hrAttendanceSession.organizationId, input.organizationId),
						eq(hrAttendanceSession.employeeId, input.employeeId),
						eq(hrAttendanceSession.localWorkDate, input.localWorkDate),
					),
				)
				.limit(1);

			if (existingRows.length > 0) {
				const current = mapSession(existingRows[0]!);
				if (!current.ok) return current;
				const previous = current.data;
				const [row] = await db
					.update(hrAttendanceSession)
					.set({
						timezone: input.timezone,
						firstClockInAt: resolved.firstClockInAt,
						finalClockOutAt: resolved.finalClockOutAt,
						breakMinutes: resolved.breakMinutes,
						workedMinutes: resolved.workedMinutes,
						grossMinutes: resolved.grossMinutes,
						resolutionStatus: resolved.resolutionStatus,
						requiresReview: resolved.requiresReview,
						version: current.data.version + 1,
						createIdempotencyKey: input.idempotencyKey,
						createRequestFingerprint: input.createRequestFingerprint,
						updatedBy: input.createdBy,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(hrAttendanceSession.organizationId, input.organizationId),
							eq(hrAttendanceSession.id, current.data.id),
						),
					)
					.returning();
				const mapped = mapSession(row!);
				if (!mapped.ok) return mapped;
				const recorded = await audit(ports, {
					organizationId: input.organizationId,
					actorUserId: input.createdBy,
					correlationId: input.correlationId,
					entity: "hr_attendance_session",
					entityId: mapped.data.id,
					action: "UPDATE",
				});
				if (!recorded.ok) return recorded;
				const detected = await runAttendanceExceptionDetection(
					drizzleExceptionDetectionHost(this),
					{
						organizationId: input.organizationId,
						employeeId: input.employeeId,
						session: mapped.data,
						events,
						detectionSource: ATTENDANCE_SESSION_DETECTION_SOURCE,
						actorUserId: input.createdBy,
						correlationId: input.correlationId,
					},
					ports,
				);
				if (!detected.ok) {
					await restoreAttendanceSession(previous);
					return detected;
				}
				return ok(mapped.data);
			}

			const id = randomUUID();
			const now = new Date();
			const [row] = await db
				.insert(hrAttendanceSession)
				.values({
					id,
					organizationId: input.organizationId,
					employeeId: input.employeeId,
					employmentId: events[0]?.employmentId ?? null,
					shiftAssignmentId: events[0]?.shiftAssignmentId ?? null,
					localWorkDate: input.localWorkDate,
					timezone: input.timezone,
					firstClockInAt: resolved.firstClockInAt,
					finalClockOutAt: resolved.finalClockOutAt,
					breakMinutes: resolved.breakMinutes,
					workedMinutes: resolved.workedMinutes,
					grossMinutes: resolved.grossMinutes,
					resolutionStatus: resolved.resolutionStatus,
					requiresReview: resolved.requiresReview,
					version: 1,
					createIdempotencyKey: input.idempotencyKey,
					createRequestFingerprint: input.createRequestFingerprint,
					createdBy: input.createdBy,
					updatedBy: input.createdBy,
					createdAt: now,
					updatedAt: now,
				})
				.returning();
			const mapped = mapSession(row!);
			if (!mapped.ok) return mapped;
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.createdBy,
				correlationId: input.correlationId,
				entity: "hr_attendance_session",
				entityId: mapped.data.id,
				action: "CREATE",
			});
			if (!recorded.ok) return recorded;
			const detected = await runAttendanceExceptionDetection(
				drizzleExceptionDetectionHost(this),
				{
					organizationId: input.organizationId,
					employeeId: input.employeeId,
					session: mapped.data,
					events,
					detectionSource: ATTENDANCE_SESSION_DETECTION_SOURCE,
					actorUserId: input.createdBy,
					correlationId: input.correlationId,
				},
				ports,
			);
			if (!detected.ok) {
				await db
					.delete(hrAttendanceSession)
					.where(
						and(
							eq(hrAttendanceSession.organizationId, input.organizationId),
							eq(hrAttendanceSession.id, mapped.data.id),
						),
					);
				return detected;
			}
			return ok(mapped.data);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findAttendanceSessionByIdempotencyKey({
					organizationId: input.organizationId,
					idempotencyKey: input.idempotencyKey,
				});
				if (!replay.ok) return replay;
				if (
					replay.data !== null &&
					replay.data.createRequestFingerprint ===
						input.createRequestFingerprint
				) {
					return ok(replay.data.session);
				}
				return conflict("Idempotency key already used with different data");
			}
			return mapPersistenceFailure(
				error,
				"Failed to resolve attendance session",
			);
		}
	},

	async getAttendanceSession(input) {
		try {
			const rows = await db
				.select()
				.from(hrAttendanceSession)
				.where(
					and(
						eq(hrAttendanceSession.organizationId, input.organizationId),
						eq(hrAttendanceSession.id, input.sessionId),
					),
				)
				.limit(1);
			if (rows.length === 0) return ok(null);
			return mapSession(rows[0]!);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to get attendance session");
		}
	},

	async listAttendanceSessions(input) {
		try {
			const { limit, offset } = pageOffset(input.page, input.pageSize);
			const conditions = [
				eq(hrAttendanceSession.organizationId, input.organizationId),
			];
			if (input.employeeId !== undefined) {
				conditions.push(eq(hrAttendanceSession.employeeId, input.employeeId));
			}
			if (input.fromDate !== undefined) {
				conditions.push(gte(hrAttendanceSession.localWorkDate, input.fromDate));
			}
			if (input.toDate !== undefined) {
				conditions.push(lte(hrAttendanceSession.localWorkDate, input.toDate));
			}
			const rows = await db
				.select()
				.from(hrAttendanceSession)
				.where(and(...conditions))
				.limit(limit)
				.offset(offset);
			const mapped: AttendanceSession[] = [];
			for (const row of rows) {
				const item = mapSession(row);
				if (!item.ok) return item;
				mapped.push(item.data);
			}
			return ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list attendance sessions");
		}
	},

	async createAttendanceException(input, ports) {
		try {
			const id = randomUUID();
			const now = new Date();
			const [row] = await db
				.insert(hrAttendanceException)
				.values({
					id,
					organizationId: input.organizationId,
					employeeId: input.employeeId,
					sessionId: input.sessionId,
					eventId: input.eventId,
					shiftAssignmentId: input.shiftAssignmentId,
					exceptionType: input.exceptionType,
					severity: input.severity,
					reviewStatus: "open",
					resolution: null,
					reviewerUserId: null,
					evidenceReference: null,
					remarks: input.remarks,
					version: 1,
					createdBy: input.createdBy,
					updatedBy: input.createdBy,
					createdAt: now,
					updatedAt: now,
				})
				.returning();
			const mapped = mapException(row!);
			if (!mapped.ok) return mapped;
			const correlationId =
				input.correlationId ??
				`hr-time-hr_attendance_exception-${mapped.data.id}`;
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.createdBy,
				correlationId,
				entity: "hr_attendance_exception",
				entityId: mapped.data.id,
				action: "CREATE",
			});
			if (!recorded.ok) return recorded;
			const event = await emitOutbox(ports, {
				organizationId: input.organizationId,
				actorUserId: input.createdBy,
				correlationId,
				eventType: HUMAN_RESOURCES_TIME_EXCEPTION_CREATED_EVENT,
				entityType: "hr_attendance_exception",
				entityId: mapped.data.id,
			});
			if (!event.ok) return event;
			return ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to create attendance exception",
			);
		}
	},

	async reviewAttendanceException(input, ports) {
		return transitionException(this, ports, input, "in_review");
	},
	async excuseAttendanceException(input, ports) {
		return transitionException(this, ports, input, "excused", {
			resolution: input.resolution,
			evidenceReference: input.evidenceReference,
		});
	},
	async rejectAttendanceException(input, ports) {
		return transitionException(this, ports, input, "rejected", {
			resolution: input.resolution,
		});
	},
	async resolveAttendanceException(input, ports) {
		return transitionException(this, ports, input, "resolved", {
			resolution: input.resolution,
		});
	},

	async getAttendanceException(input) {
		try {
			const rows = await db
				.select()
				.from(hrAttendanceException)
				.where(
					and(
						eq(hrAttendanceException.organizationId, input.organizationId),
						eq(hrAttendanceException.id, input.exceptionId),
					),
				)
				.limit(1);
			if (rows.length === 0) return ok(null);
			return mapException(rows[0]!);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to get attendance exception");
		}
	},

	async listAttendanceExceptions(input) {
		try {
			const { limit, offset } = pageOffset(input.page, input.pageSize);
			const conditions = [
				eq(hrAttendanceException.organizationId, input.organizationId),
			];
			if (input.employeeId !== undefined) {
				conditions.push(eq(hrAttendanceException.employeeId, input.employeeId));
			}
			if (input.reviewStatus !== undefined) {
				conditions.push(
					eq(hrAttendanceException.reviewStatus, input.reviewStatus),
				);
			}
			const rows = await db
				.select()
				.from(hrAttendanceException)
				.where(and(...conditions))
				.limit(limit)
				.offset(offset);
			const mapped: AttendanceException[] = [];
			for (const row of rows) {
				const item = mapException(row);
				if (!item.ok) return item;
				mapped.push(item.data);
			}
			return ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list attendance exceptions",
			);
		}
	},

	async listUnresolvedAttendanceExceptions(input) {
		try {
			const { limit, offset } = pageOffset(input.page, input.pageSize);
			const conditions = [
				eq(hrAttendanceException.organizationId, input.organizationId),
				inArray(hrAttendanceException.reviewStatus, ["open", "in_review"]),
			];
			if (input.employeeId !== undefined) {
				conditions.push(eq(hrAttendanceException.employeeId, input.employeeId));
			}
			const rows = await db
				.select()
				.from(hrAttendanceException)
				.where(and(...conditions))
				.limit(limit)
				.offset(offset);
			const mapped: AttendanceException[] = [];
			for (const row of rows) {
				const item = mapException(row);
				if (!item.ok) return item;
				mapped.push(item.data);
			}
			return ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list unresolved attendance exceptions",
			);
		}
	},

	async getDailyAttendanceSummary(input) {
		try {
			const scheduled = await this.getScheduledShiftForEmployeeDate({
				organizationId: input.organizationId,
				employeeId: input.employeeId,
				scheduledDate: input.localWorkDate,
			});
			if (!scheduled.ok) return scheduled;
			const sessions = await this.listAttendanceSessions({
				organizationId: input.organizationId,
				employeeId: input.employeeId,
				fromDate: input.localWorkDate,
				toDate: input.localWorkDate,
				page: 1,
				pageSize: 100,
			});
			if (!sessions.ok) return sessions;
			const session =
				sessions.data.find((row) => row.timezone === input.timezone) ??
				sessions.data[0] ??
				null;
			const events = await this.listAttendanceEvents({
				organizationId: input.organizationId,
				employeeId: input.employeeId,
				fromDate: input.localWorkDate,
				toDate: input.localWorkDate,
				page: 1,
				pageSize: 500,
			});
			if (!events.ok) return events;
			const unresolved = await this.listUnresolvedAttendanceExceptions({
				organizationId: input.organizationId,
				employeeId: input.employeeId,
				page: 1,
				pageSize: 500,
			});
			if (!unresolved.ok) return unresolved;
			const unresolvedForDate = unresolved.data.filter((exception) => {
				if (exception.sessionId !== null && session !== null) {
					return exception.sessionId === session.id;
				}
				if (exception.eventId !== null) {
					return events.data.some((event) => event.id === exception.eventId);
				}
				if (exception.shiftAssignmentId !== null && scheduled.data !== null) {
					return exception.shiftAssignmentId === scheduled.data.id;
				}
				return true;
			});
			return ok({
				organizationId: input.organizationId,
				employeeId: input.employeeId,
				localWorkDate: input.localWorkDate,
				timezone: input.timezone,
				scheduledAssignment: scheduled.data,
				session,
				events: events.data,
				unresolvedExceptions: unresolvedForDate,
				workedMinutes: session?.workedMinutes ?? 0,
				breakMinutes: session?.breakMinutes ?? 0,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to get daily attendance summary",
			);
		}
	},

	async findTimesheetByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrTimesheet)
				.where(
					and(
						eq(hrTimesheet.organizationId, input.organizationId),
						eq(hrTimesheet.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			if (rows.length === 0) return ok(null);
			const mapped = mapTimesheet(rows[0]!);
			if (!mapped.ok) return mapped;
			return ok({
				timesheet: mapped.data,
				createRequestFingerprint: rows[0]!.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find timesheet");
		}
	},

	async createTimesheet(input, ports) {
		try {
			const id = randomUUID();
			const now = new Date();
			const [row] = await db
				.insert(hrTimesheet)
				.values({
					id,
					organizationId: input.organizationId,
					employeeId: input.employeeId,
					employmentId: input.employmentId ?? null,
					periodStart: input.periodStart,
					periodEnd: input.periodEnd,
					status: "draft",
					totalRecordedMinutes: 0,
					totalApprovedMinutes: 0,
					version: 1,
					createIdempotencyKey: input.idempotencyKey,
					createRequestFingerprint: input.createRequestFingerprint,
					createdBy: input.createdBy,
					updatedBy: input.createdBy,
					createdAt: now,
					updatedAt: now,
				})
				.returning();
			const mapped = mapTimesheet(row!);
			if (!mapped.ok) return mapped;
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.createdBy,
				correlationId: input.correlationId,
				entity: "hr_timesheet",
				entityId: mapped.data.id,
				action: "CREATE",
			});
			if (!recorded.ok) return recorded;
			return ok(mapped.data);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findTimesheetByIdempotencyKey({
					organizationId: input.organizationId,
					idempotencyKey: input.idempotencyKey,
				});
				if (!replay.ok) return replay;
				if (
					replay.data !== null &&
					replay.data.createRequestFingerprint ===
						input.createRequestFingerprint
				) {
					return ok(replay.data.timesheet);
				}
				return conflict("Idempotency key already used with different data");
			}
			return mapPersistenceFailure(error, "Failed to create timesheet");
		}
	},

	async generateTimesheetEntries(input, ports, deps: TimesheetGenerationDeps) {
		try {
			const existing = await this.getTimesheet({
				organizationId: input.organizationId,
				timesheetId: input.timesheetId,
			});
			if (!existing.ok) return existing;
			if (existing.data === null) return notFound("Timesheet not found");
			const versionCheck = assertExpectedVersion(
				existing.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			if (
				existing.data.status !== "draft" &&
				existing.data.status !== "returned"
			) {
				return invalidState("Timesheet is not editable for entry generation");
			}

			const leaveFacts =
				await deps.approvedLeave.listApprovedLeaveForEmployeePeriod({
					organizationId: input.organizationId,
					employeeId: existing.data.employeeId,
					periodStart: existing.data.periodStart,
					periodEnd: existing.data.periodEnd,
				});
			if (!leaveFacts.ok) return leaveFacts;

			const sessions = await this.listAttendanceSessions({
				organizationId: input.organizationId,
				employeeId: existing.data.employeeId,
				fromDate: existing.data.periodStart,
				toDate: existing.data.periodEnd,
				page: 1,
				pageSize: 500,
			});
			if (!sessions.ok) return sessions;
			const currentEntries = await this.listTimesheetEntries({
				organizationId: input.organizationId,
				timesheetId: input.timesheetId,
			});
			if (!currentEntries.ok) return currentEntries;
			const existingAttendanceRefs = new Set(
				currentEntries.data
					.filter((entry) => entry.sourceType === "attendance")
					.map((entry) => entry.sourceReference),
			);
			const existingLeaveRefs = new Set(
				currentEntries.data
					.filter((entry) => entry.sourceType === "leave")
					.map((entry) => entry.sourceReference),
			);
			let totalRecorded = existing.data.totalRecordedMinutes;
			let totalApproved = existing.data.totalApprovedMinutes;
			const resolvedSessions = sessions.data.filter(
				(session) => session.resolutionStatus === "resolved",
			);
			for (const session of resolvedSessions) {
				if (existingAttendanceRefs.has(session.id)) continue;
				const id = randomUUID();
				const now = new Date();
				await db.insert(hrTimesheetEntry).values({
					id,
					organizationId: input.organizationId,
					timesheetId: input.timesheetId,
					employeeId: existing.data.employeeId,
					workDate: session.localWorkDate,
					timezone: session.timezone,
					sourceType: "attendance",
					sourceReference: session.id,
					timeType: "regular",
					startedAt: session.firstClockInAt,
					endedAt: session.finalClockOutAt,
					recordedMinutes: session.workedMinutes,
					approvedMinutes: session.workedMinutes,
					version: 1,
					createdBy: input.actorUserId,
					updatedBy: input.actorUserId,
					createdAt: now,
					updatedAt: now,
				});
				totalRecorded += session.workedMinutes;
				totalApproved += session.workedMinutes;
			}

			for (const fact of leaveFacts.data) {
				if (existingLeaveRefs.has(fact.segmentId)) continue;
				const mapped = mapApprovedLeaveFactToEntryInput({
					fact,
					timesheet: existing.data,
					actorUserId: input.actorUserId,
					correlationId: input.correlationId,
				});
				const id = randomUUID();
				const now = new Date();
				await db.insert(hrTimesheetEntry).values({
					id,
					organizationId: mapped.organizationId,
					timesheetId: mapped.timesheetId,
					employeeId: mapped.employeeId,
					workDate: mapped.workDate,
					timezone: mapped.timezone,
					sourceType: mapped.sourceType,
					sourceReference: mapped.sourceReference,
					timeType: mapped.timeType,
					startedAt: mapped.startedAt,
					endedAt: mapped.endedAt,
					recordedMinutes: mapped.recordedMinutes,
					approvedMinutes: mapped.approvedMinutes,
					version: 1,
					createdBy: mapped.createdBy,
					updatedBy: mapped.createdBy,
					createdAt: now,
					updatedAt: now,
				});
				totalRecorded += mapped.recordedMinutes;
				totalApproved += mapped.approvedMinutes;
			}

			const periodEntries = await this.listTimesheetEntries({
				organizationId: input.organizationId,
				timesheetId: input.timesheetId,
			});
			if (!periodEntries.ok) return periodEntries;

			const fullStore = this as HumanResourcesStore;
			let employment = null as Awaited<
				ReturnType<HumanResourcesStore["getEmploymentById"]>
			> extends Result<infer T>
				? T
				: never;
			if (existing.data.employmentId !== null) {
				const employmentResult = await fullStore.getEmploymentById({
					organizationId: input.organizationId,
					employmentId: existing.data.employmentId,
				});
				if (!employmentResult.ok) return employmentResult;
				employment = employmentResult.data;
			} else {
				const found = await fullStore.findOpenEmploymentByEmployee({
					organizationId: input.organizationId,
					employeeId: existing.data.employeeId,
				});
				if (!found.ok) return found;
				employment = found.data;
			}

			const existingExceptions = await this.listAttendanceExceptions({
				organizationId: input.organizationId,
				employeeId: existing.data.employeeId,
				page: 1,
				pageSize: 500,
			});
			if (!existingExceptions.ok) return existingExceptions;
			const exceptionBucket = [...existingExceptions.data];

			for (const workDate of iterDatesInclusive(
				existing.data.periodStart,
				existing.data.periodEnd,
			)) {
				const expected = await resolveExpectedWorkMinutes({
					host: this,
					organizationId: input.organizationId,
					employeeId: existing.data.employeeId,
					employmentId: existing.data.employmentId ?? employment?.id ?? null,
					workDate,
				});
				if (!expected.ok) return expected;

				const leaveMinutes = approvedLeaveMinutesForDate(
					workDate,
					leaveFacts.data,
				);
				const workedMinutes = qualifyingWorkedMinutesForDate(
					workDate,
					resolvedSessions,
					periodEntries.data,
				);

				if (
					!isBasicFullDayAbsence({
						activeEmployment: isActiveEmploymentOnDate(employment, workDate),
						expectedWorkMinutes: expected.data.expectedWorkMinutes,
						qualifyingWorkedMinutes: workedMinutes,
						approvedLeaveCoveredMinutes: leaveMinutes,
					})
				) {
					continue;
				}

				if (
					hasExistingTimesheetGenerationAbsence({
						exceptions: exceptionBucket,
						employeeId: existing.data.employeeId,
						workDate,
					})
				) {
					continue;
				}

				const created = await this.createAttendanceException(
					{
						organizationId: input.organizationId,
						employeeId: existing.data.employeeId,
						sessionId: null,
						eventId: null,
						shiftAssignmentId: expected.data.shiftAssignmentId,
						exceptionType: "absence",
						severity: "warning",
						remarks: encodeAbsenceDetectionRemarks({
							workDate,
							expectedMinutes: expected.data.expectedWorkMinutes,
							detectionSource: TIMESHEET_GENERATION_ABSENCE_SOURCE,
							shiftAssignmentId: expected.data.shiftAssignmentId,
							timesheetId: existing.data.id,
						}),
						createdBy: input.actorUserId,
						correlationId: input.correlationId,
					},
					ports,
				);
				if (!created.ok) return created;
				exceptionBucket.push(created.data);
			}

			const [row] = await db
				.update(hrTimesheet)
				.set({
					totalRecordedMinutes: totalRecorded,
					totalApprovedMinutes: totalApproved,
					version: existing.data.version + 1,
					updatedBy: input.actorUserId,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(hrTimesheet.organizationId, input.organizationId),
						eq(hrTimesheet.id, input.timesheetId),
						eq(hrTimesheet.version, input.expectedVersion),
					),
				)
				.returning();
			if (!row) return notFound("Timesheet not found");
			const timesheet = mapTimesheet(row);
			if (!timesheet.ok) return timesheet;
			const entries = await this.listTimesheetEntries({
				organizationId: input.organizationId,
				timesheetId: input.timesheetId,
			});
			if (!entries.ok) return entries;
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_timesheet",
				entityId: timesheet.data.id,
				action: "UPDATE",
			});
			if (!recorded.ok) return recorded;
			return ok({ timesheet: timesheet.data, entries: entries.data });
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to generate timesheet entries",
			);
		}
	},

	async addTimesheetEntry(input, ports) {
		try {
			const timesheet = await this.getTimesheet({
				organizationId: input.organizationId,
				timesheetId: input.timesheetId,
			});
			if (!timesheet.ok) return timesheet;
			if (timesheet.data === null) return notFound("Timesheet not found");
			if (
				timesheet.data.status !== "draft" &&
				timesheet.data.status !== "returned"
			) {
				return invalidState("Timesheet is not editable");
			}
			const id = randomUUID();
			const now = new Date();
			const [row] = await db
				.insert(hrTimesheetEntry)
				.values({
					id,
					organizationId: input.organizationId,
					timesheetId: input.timesheetId,
					employeeId: input.employeeId,
					workDate: input.workDate,
					timezone: input.timezone,
					sourceType: input.sourceType,
					sourceReference: input.sourceReference,
					timeType: input.timeType,
					startedAt: input.startedAt,
					endedAt: input.endedAt,
					recordedMinutes: input.recordedMinutes,
					approvedMinutes: input.approvedMinutes,
					version: 1,
					createdBy: input.createdBy,
					updatedBy: input.createdBy,
					createdAt: now,
					updatedAt: now,
				})
				.returning();
			await db
				.update(hrTimesheet)
				.set({
					totalRecordedMinutes:
						timesheet.data.totalRecordedMinutes + input.recordedMinutes,
					totalApprovedMinutes:
						timesheet.data.totalApprovedMinutes + input.approvedMinutes,
					version: timesheet.data.version + 1,
					updatedBy: input.createdBy,
					updatedAt: now,
				})
				.where(
					and(
						eq(hrTimesheet.organizationId, input.organizationId),
						eq(hrTimesheet.id, input.timesheetId),
					),
				);
			const mapped = mapEntry(row!);
			if (!mapped.ok) return mapped;
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.createdBy,
				correlationId: input.correlationId,
				entity: "hr_timesheet_entry",
				entityId: mapped.data.id,
				action: "CREATE",
			});
			if (!recorded.ok) return recorded;
			return ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to add timesheet entry");
		}
	},

	async updateTimesheetEntry(input, ports) {
		try {
			const rows = await db
				.select()
				.from(hrTimesheetEntry)
				.where(
					and(
						eq(hrTimesheetEntry.organizationId, input.organizationId),
						eq(hrTimesheetEntry.id, input.entryId),
					),
				)
				.limit(1);
			if (rows.length === 0) return notFound("Timesheet entry not found");
			const existing = mapEntry(rows[0]!);
			if (!existing.ok) return existing;
			const versionCheck = assertExpectedVersion(
				existing.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			const timesheet = await this.getTimesheet({
				organizationId: input.organizationId,
				timesheetId: existing.data.timesheetId,
			});
			if (!timesheet.ok) return timesheet;
			if (timesheet.data === null) return notFound("Timesheet not found");
			if (
				timesheet.data.status !== "draft" &&
				timesheet.data.status !== "returned"
			) {
				return invalidState("Timesheet is not editable");
			}
			const [row] = await db
				.update(hrTimesheetEntry)
				.set({
					workDate: input.workDate ?? existing.data.workDate,
					timeType: input.timeType ?? existing.data.timeType,
					startedAt:
						input.startedAt !== undefined
							? input.startedAt
							: existing.data.startedAt,
					endedAt:
						input.endedAt !== undefined ? input.endedAt : existing.data.endedAt,
					recordedMinutes:
						input.recordedMinutes ?? existing.data.recordedMinutes,
					approvedMinutes:
						input.approvedMinutes ?? existing.data.approvedMinutes,
					version: existing.data.version + 1,
					updatedBy: input.actorUserId,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(hrTimesheetEntry.organizationId, input.organizationId),
						eq(hrTimesheetEntry.id, input.entryId),
						eq(hrTimesheetEntry.version, input.expectedVersion),
					),
				)
				.returning();
			if (!row) return notFound("Timesheet entry not found");
			await recomputeTimesheetTotals(
				input.organizationId,
				existing.data.timesheetId,
			);
			const mapped = mapEntry(row);
			if (!mapped.ok) return mapped;
			const recordedAudit = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_timesheet_entry",
				entityId: mapped.data.id,
				action: "UPDATE",
			});
			if (!recordedAudit.ok) return recordedAudit;
			return ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update timesheet entry");
		}
	},

	async removeTimesheetEntry(input, ports) {
		try {
			const rows = await db
				.select()
				.from(hrTimesheetEntry)
				.where(
					and(
						eq(hrTimesheetEntry.organizationId, input.organizationId),
						eq(hrTimesheetEntry.id, input.entryId),
					),
				)
				.limit(1);
			if (rows.length === 0) return notFound("Timesheet entry not found");
			const existing = mapEntry(rows[0]!);
			if (!existing.ok) return existing;
			const versionCheck = assertExpectedVersion(
				existing.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			await db
				.delete(hrTimesheetEntry)
				.where(
					and(
						eq(hrTimesheetEntry.organizationId, input.organizationId),
						eq(hrTimesheetEntry.id, input.entryId),
					),
				);
			await recomputeTimesheetTotals(
				input.organizationId,
				existing.data.timesheetId,
			);
			const recordedAudit = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_timesheet_entry",
				entityId: existing.data.id,
				action: "DELETE",
			});
			if (!recordedAudit.ok) return recordedAudit;
			return ok(undefined);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to remove timesheet entry");
		}
	},

	async submitTimesheet(input, ports) {
		return transitionTimesheet(this, ports, input, "submitted", {
			submittedAt: new Date(),
		});
	},
	async returnTimesheet(input, ports) {
		return transitionTimesheet(this, ports, input, "returned", {
			approverNotes: input.approverNotes ?? null,
		});
	},
	async approveTimesheet(input, ports) {
		const existing = await this.getTimesheet({
			organizationId: input.organizationId,
			timesheetId: input.timesheetId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) return notFound("Timesheet not found");
		const selfCheck = assertNoSelfApprove({
			actorUserId: input.actorUserId,
			createdBy: existing.data.createdBy,
		});
		if (!selfCheck.ok) return selfCheck;
		return transitionTimesheet(this, ports, input, "approved", {
			approvedAt: new Date(),
			approvedBy: input.actorUserId,
			approverNotes: input.approverNotes ?? null,
		});
	},
	async rejectTimesheet(input, ports) {
		return transitionTimesheet(this, ports, input, "rejected", {
			rejectionReason: input.rejectionReason,
		});
	},
	async reopenTimesheet(input, ports) {
		return transitionTimesheet(this, ports, input, "draft");
	},
	async lockTimesheet(input, ports) {
		return transitionTimesheet(this, ports, input, "locked", {
			lockedAt: new Date(),
		});
	},

	async supersedeTimesheet(input, ports) {
		try {
			const existing = await this.getTimesheet({
				organizationId: input.organizationId,
				timesheetId: input.timesheetId,
			});
			if (!existing.ok) return existing;
			if (existing.data === null) return notFound("Timesheet not found");
			const versionCheck = assertExpectedVersion(
				existing.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			const transition = assertTimesheetStatusTransition(
				existing.data.status,
				"superseded",
			);
			if (!transition.ok) return transition;
			await db
				.update(hrTimesheet)
				.set({
					status: "superseded",
					version: existing.data.version + 1,
					updatedBy: input.actorUserId,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(hrTimesheet.organizationId, input.organizationId),
						eq(hrTimesheet.id, input.timesheetId),
						eq(hrTimesheet.version, input.expectedVersion),
					),
				);
			return this.createTimesheet(
				{
					organizationId: existing.data.organizationId,
					employeeId: existing.data.employeeId,
					employmentId: existing.data.employmentId,
					periodStart: existing.data.periodStart,
					periodEnd: existing.data.periodEnd,
					idempotencyKey: input.idempotencyKey,
					createRequestFingerprint: input.createRequestFingerprint,
					createdBy: input.actorUserId,
					correlationId: input.correlationId,
				},
				ports,
			);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to supersede timesheet");
		}
	},

	async getTimesheet(input) {
		try {
			const rows = await db
				.select()
				.from(hrTimesheet)
				.where(
					and(
						eq(hrTimesheet.organizationId, input.organizationId),
						eq(hrTimesheet.id, input.timesheetId),
					),
				)
				.limit(1);
			if (rows.length === 0) return ok(null);
			return mapTimesheet(rows[0]!);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to get timesheet");
		}
	},

	async findTimesheetForEmployeePeriod(input) {
		try {
			const rows = await db
				.select()
				.from(hrTimesheet)
				.where(
					and(
						eq(hrTimesheet.organizationId, input.organizationId),
						eq(hrTimesheet.employeeId, input.employeeId),
						eq(hrTimesheet.periodStart, input.periodStart),
						eq(hrTimesheet.periodEnd, input.periodEnd),
						ne(hrTimesheet.status, "superseded"),
					),
				)
				.limit(1);
			if (rows.length === 0) return ok(null);
			return mapTimesheet(rows[0]!);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find timesheet for employee period",
			);
		}
	},

	async listTimesheets(input) {
		try {
			const { limit, offset } = pageOffset(input.page, input.pageSize);
			const conditions = [eq(hrTimesheet.organizationId, input.organizationId)];
			if (input.employeeId !== undefined) {
				conditions.push(eq(hrTimesheet.employeeId, input.employeeId));
			}
			if (input.status !== undefined) {
				conditions.push(eq(hrTimesheet.status, input.status));
			}
			if (input.periodStart !== undefined) {
				conditions.push(eq(hrTimesheet.periodStart, input.periodStart));
			}
			const rows = await db
				.select()
				.from(hrTimesheet)
				.where(and(...conditions))
				.limit(limit)
				.offset(offset);
			const mapped: Timesheet[] = [];
			for (const row of rows) {
				const item = mapTimesheet(row);
				if (!item.ok) return item;
				mapped.push(item.data);
			}
			return ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list timesheets");
		}
	},

	async listTimesheetEntries(input) {
		try {
			const rows = await db
				.select()
				.from(hrTimesheetEntry)
				.where(
					and(
						eq(hrTimesheetEntry.organizationId, input.organizationId),
						eq(hrTimesheetEntry.timesheetId, input.timesheetId),
					),
				);
			const mapped: TimesheetEntry[] = [];
			for (const row of rows) {
				const item = mapEntry(row);
				if (!item.ok) return item;
				mapped.push(item.data);
			}
			return ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list timesheet entries");
		}
	},

	async getTimesheetTotals(input) {
		try {
			const timesheet = await this.getTimesheet(input);
			if (!timesheet.ok) return timesheet;
			if (timesheet.data === null) return ok(null);
			const entries = await this.listTimesheetEntries(input);
			if (!entries.ok) return entries;
			return ok({
				timesheetId: timesheet.data.id,
				totalRecordedMinutes: timesheet.data.totalRecordedMinutes,
				totalApprovedMinutes: timesheet.data.totalApprovedMinutes,
				entryCount: entries.data.length,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to get timesheet totals");
		}
	},

	async getApprovedTimeHandoff(input) {
		try {
			const timesheet = await this.getTimesheet(input);
			if (!timesheet.ok) return timesheet;
			if (timesheet.data === null) return ok(null);
			if (
				timesheet.data.status !== "approved" &&
				timesheet.data.status !== "locked"
			) {
				return ok(null);
			}
			const entries = await this.listTimesheetEntries({
				organizationId: input.organizationId,
				timesheetId: input.timesheetId,
			});
			if (!entries.ok) return entries;
			const overtimeMap = new Map<OvertimeType, number>();
			let regularMinutes = 0;
			let publicHolidayMinutes = 0;
			let restDayMinutes = 0;
			let nightMinutes = 0;
			let unpaidMinutes = 0;
			let paidLeaveMinutes = 0;
			let unpaidLeaveMinutes = 0;
			for (const entry of entries.data) {
				const minutes = entry.approvedMinutes;
				switch (entry.timeType) {
					case "regular":
						regularMinutes += minutes;
						break;
					case "overtime": {
						const type =
							parseOvertimeType(entry.sourceReference) ?? "weekday_overtime";
						overtimeMap.set(type, (overtimeMap.get(type) ?? 0) + minutes);
						break;
					}
					case "public_holiday":
						publicHolidayMinutes += minutes;
						break;
					case "rest_day":
						restDayMinutes += minutes;
						break;
					case "night":
						nightMinutes += minutes;
						break;
					case "unpaid":
						unpaidMinutes += minutes;
						if (entry.sourceType === "leave") unpaidLeaveMinutes += minutes;
						break;
					case "call_back":
						overtimeMap.set(
							"call_back",
							(overtimeMap.get("call_back") ?? 0) + minutes,
						);
						break;
					case "training":
					case "travel":
					case "standby":
						if (entry.sourceType === "leave") paidLeaveMinutes += minutes;
						break;
					default: {
						const _exhaustive: never = entry.timeType;
						void _exhaustive;
					}
				}
			}
			const handoff: ApprovedTimeHandoff = {
				organizationId: timesheet.data.organizationId,
				employeeId: timesheet.data.employeeId,
				employmentId: timesheet.data.employmentId,
				periodStart: timesheet.data.periodStart,
				periodEnd: timesheet.data.periodEnd,
				regularMinutes,
				overtime: Array.from(overtimeMap.entries()).map(([type, minutes]) => ({
					type,
					minutes,
				})),
				publicHolidayMinutes,
				restDayMinutes,
				nightMinutes,
				unpaidMinutes,
				paidLeaveMinutes,
				unpaidLeaveMinutes,
				timesheetId: timesheet.data.id,
				timesheetVersion: timesheet.data.version,
				approvedAt: (
					timesheet.data.approvedAt ?? timesheet.data.updatedAt
				).toISOString(),
				approvalReference: timesheet.data.approvedBy ?? timesheet.data.id,
			};
			return ok(handoff);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to get approved time handoff",
			);
		}
	},

	async findOvertimeRequestByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrOvertimeRequest)
				.where(
					and(
						eq(hrOvertimeRequest.organizationId, input.organizationId),
						eq(hrOvertimeRequest.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			if (rows.length === 0) return ok(null);
			const mapped = mapOvertime(rows[0]!);
			if (!mapped.ok) return mapped;
			return ok({
				request: mapped.data,
				createRequestFingerprint: rows[0]!.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find overtime request");
		}
	},

	async createOvertimeRequest(input, ports) {
		try {
			const id = randomUUID();
			const now = new Date();
			const [row] = await db
				.insert(hrOvertimeRequest)
				.values({
					id,
					organizationId: input.organizationId,
					employeeId: input.employeeId,
					employmentId: input.employmentId,
					overtimeType: input.overtimeType,
					requestedStartsAt: input.requestedStartsAt,
					requestedEndsAt: input.requestedEndsAt,
					requestedMinutes: input.requestedMinutes,
					reason: input.reason,
					evidenceReference: input.evidenceReference,
					status: "requested",
					version: 1,
					createIdempotencyKey: input.idempotencyKey,
					createRequestFingerprint: input.createRequestFingerprint,
					createdBy: input.createdBy,
					updatedBy: input.createdBy,
					createdAt: now,
					updatedAt: now,
				})
				.returning();
			const mapped = mapOvertime(row!);
			if (!mapped.ok) return mapped;
			const recordedAudit = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.createdBy,
				correlationId: input.correlationId,
				entity: "hr_overtime_request",
				entityId: mapped.data.id,
				action: "CREATE",
			});
			if (!recordedAudit.ok) return recordedAudit;
			return ok(mapped.data);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findOvertimeRequestByIdempotencyKey({
					organizationId: input.organizationId,
					idempotencyKey: input.idempotencyKey,
				});
				if (!replay.ok) return replay;
				if (
					replay.data !== null &&
					replay.data.createRequestFingerprint ===
						input.createRequestFingerprint
				) {
					return ok(replay.data.request);
				}
				return conflict("Idempotency key already used with different data");
			}
			return mapPersistenceFailure(error, "Failed to create overtime request");
		}
	},

	async approveOvertimeRequest(input, ports) {
		try {
			const existing = await this.getOvertimeRequest({
				organizationId: input.organizationId,
				requestId: input.requestId,
			});
			if (!existing.ok) return existing;
			if (existing.data === null) return notFound("Overtime request not found");
			const selfCheck = assertNoSelfApprove({
				actorUserId: input.actorUserId,
				createdBy: existing.data.createdBy,
			});
			if (!selfCheck.ok) return selfCheck;
			const versionCheck = assertExpectedVersion(
				existing.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			const transition = assertOvertimeStatusTransition(
				existing.data.status,
				"approved",
			);
			if (!transition.ok) return transition;
			const [row] = await db
				.update(hrOvertimeRequest)
				.set({
					status: "approved",
					approvedMaximumMinutes: input.approvedMaximumMinutes,
					version: existing.data.version + 1,
					updatedBy: input.actorUserId,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(hrOvertimeRequest.organizationId, input.organizationId),
						eq(hrOvertimeRequest.id, input.requestId),
						eq(hrOvertimeRequest.version, input.expectedVersion),
					),
				)
				.returning();
			if (!row) return notFound("Overtime request not found");
			await db.insert(hrOvertimeApproval).values({
				id: randomUUID(),
				organizationId: input.organizationId,
				overtimeRequestId: input.requestId,
				decision: "approved",
				approvedMaximumMinutes: input.approvedMaximumMinutes,
				actorUserId: input.actorUserId,
				comment: input.comment ?? null,
				decidedAt: new Date(),
				versionApproved: existing.data.version + 1,
			});
			const mapped = mapOvertime(row);
			if (!mapped.ok) return mapped;
			const correlationId =
				input.correlationId ??
				`hr-time-hr_overtime_request-${mapped.data.id}`;
			const recordedAudit = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId,
				entity: "hr_overtime_request",
				entityId: mapped.data.id,
				action: "UPDATE",
			});
			if (!recordedAudit.ok) return recordedAudit;
			const event = await emitOutbox(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId,
				eventType: HUMAN_RESOURCES_TIME_OVERTIME_APPROVED_EVENT,
				entityType: "hr_overtime_request",
				entityId: mapped.data.id,
			});
			if (!event.ok) return event;
			return ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to approve overtime request");
		}
	},

	async rejectOvertimeRequest(input, ports) {
		return transitionOvertime(this, ports, input, "rejected", {
			comment: input.comment,
		});
	},
	async cancelOvertimeRequest(input, ports) {
		return transitionOvertime(this, ports, input, "cancelled");
	},

	async recordOvertimeActual(input, ports) {
		try {
			const existing = await this.getOvertimeRequest({
				organizationId: input.organizationId,
				requestId: input.requestId,
			});
			if (!existing.ok) return existing;
			if (existing.data === null) return notFound("Overtime request not found");
			const versionCheck = assertExpectedVersion(
				existing.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			const transition = assertOvertimeStatusTransition(
				existing.data.status,
				"worked",
			);
			if (!transition.ok) return transition;
			const [row] = await db
				.update(hrOvertimeRequest)
				.set({
					status: "worked",
					actualMinutes: input.actualMinutes,
					version: existing.data.version + 1,
					updatedBy: input.actorUserId,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(hrOvertimeRequest.organizationId, input.organizationId),
						eq(hrOvertimeRequest.id, input.requestId),
						eq(hrOvertimeRequest.version, input.expectedVersion),
					),
				)
				.returning();
			if (!row) return notFound("Overtime request not found");
			const mapped = mapOvertime(row);
			if (!mapped.ok) return mapped;
			const recordedAudit = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_overtime_request",
				entityId: mapped.data.id,
				action: "UPDATE",
			});
			if (!recordedAudit.ok) return recordedAudit;
			return ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to record overtime actual");
		}
	},

	async verifyOvertimeRequest(input, ports) {
		try {
			const existing = await this.getOvertimeRequest({
				organizationId: input.organizationId,
				requestId: input.requestId,
			});
			if (!existing.ok) return existing;
			if (existing.data === null) return notFound("Overtime request not found");
			const versionCheck = assertExpectedVersion(
				existing.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			const transition = assertOvertimeStatusTransition(
				existing.data.status,
				"verified",
			);
			if (!transition.ok) return transition;
			const [row] = await db
				.update(hrOvertimeRequest)
				.set({
					status: "verified",
					payrollApprovedMinutes: input.payrollApprovedMinutes,
					version: existing.data.version + 1,
					updatedBy: input.actorUserId,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(hrOvertimeRequest.organizationId, input.organizationId),
						eq(hrOvertimeRequest.id, input.requestId),
						eq(hrOvertimeRequest.version, input.expectedVersion),
					),
				)
				.returning();
			if (!row) return notFound("Overtime request not found");
			await db.insert(hrOvertimeApproval).values({
				id: randomUUID(),
				organizationId: input.organizationId,
				overtimeRequestId: input.requestId,
				decision: "verified",
				approvedMaximumMinutes: input.payrollApprovedMinutes,
				actorUserId: input.actorUserId,
				comment: null,
				decidedAt: new Date(),
				versionApproved: existing.data.version + 1,
			});
			const mapped = mapOvertime(row);
			if (!mapped.ok) return mapped;
			const recordedAudit = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_overtime_request",
				entityId: mapped.data.id,
				action: "UPDATE",
			});
			if (!recordedAudit.ok) return recordedAudit;
			return ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to verify overtime request");
		}
	},

	async getOvertimeRequest(input) {
		try {
			const rows = await db
				.select()
				.from(hrOvertimeRequest)
				.where(
					and(
						eq(hrOvertimeRequest.organizationId, input.organizationId),
						eq(hrOvertimeRequest.id, input.requestId),
					),
				)
				.limit(1);
			if (rows.length === 0) return ok(null);
			return mapOvertime(rows[0]!);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to get overtime request");
		}
	},

	async listOvertimeRequests(input) {
		try {
			const { limit, offset } = pageOffset(input.page, input.pageSize);
			const conditions = [
				eq(hrOvertimeRequest.organizationId, input.organizationId),
			];
			if (input.employeeId !== undefined) {
				conditions.push(eq(hrOvertimeRequest.employeeId, input.employeeId));
			}
			if (input.status !== undefined) {
				conditions.push(eq(hrOvertimeRequest.status, input.status));
			}
			const rows = await db
				.select()
				.from(hrOvertimeRequest)
				.where(and(...conditions))
				.limit(limit)
				.offset(offset);
			const mapped: OvertimeRequest[] = [];
			for (const row of rows) {
				const item = mapOvertime(row);
				if (!item.ok) return item;
				mapped.push(item.data);
			}
			return ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list overtime requests");
		}
	},
};

async function recomputeTimesheetTotals(
	organizationId: string,
	timesheetId: string,
): Promise<void> {
	const entries = await db
		.select()
		.from(hrTimesheetEntry)
		.where(
			and(
				eq(hrTimesheetEntry.organizationId, organizationId),
				eq(hrTimesheetEntry.timesheetId, timesheetId),
			),
		);
	const totalRecordedMinutes = entries.reduce(
		(sum, entry) => sum + entry.recordedMinutes,
		0,
	);
	const totalApprovedMinutes = entries.reduce(
		(sum, entry) => sum + entry.approvedMinutes,
		0,
	);
	const current = await db
		.select({ version: hrTimesheet.version })
		.from(hrTimesheet)
		.where(
			and(
				eq(hrTimesheet.organizationId, organizationId),
				eq(hrTimesheet.id, timesheetId),
			),
		)
		.limit(1);
	const version = current[0]?.version ?? 1;
	await db
		.update(hrTimesheet)
		.set({
			totalRecordedMinutes,
			totalApprovedMinutes,
			version: version + 1,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(hrTimesheet.organizationId, organizationId),
				eq(hrTimesheet.id, timesheetId),
			),
		);
}

async function transitionShiftStatus(
	store: HumanResourcesTimeStore,
	ports: MutationPorts,
	input: {
		organizationId: string;
		shiftId: Shift["id"];
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
	},
	next: Shift["status"],
): Promise<Result<Shift>> {
	const existing = await store.getShift({
		organizationId: input.organizationId,
		shiftId: input.shiftId,
	});
	if (!existing.ok) return existing;
	if (existing.data === null) return notFound("Shift not found");
	const versionCheck = assertExpectedVersion(
		existing.data.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) return versionCheck;
	const transition = assertShiftStatusTransition(existing.data.status, next);
	if (!transition.ok) return transition;
	try {
		const [row] = await db
			.update(hrShift)
			.set({
				status: next,
				version: existing.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(hrShift.organizationId, input.organizationId),
					eq(hrShift.id, input.shiftId),
					eq(hrShift.version, input.expectedVersion),
				),
			)
			.returning();
		if (!row) return notFound("Shift not found");
		const mapped = mapShift(row);
		if (!mapped.ok) return mapped;
		const recorded = await audit(ports, {
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: input.correlationId,
			entity: "hr_shift",
			entityId: mapped.data.id,
			action: "UPDATE",
		});
		if (!recorded.ok) return recorded;
		return ok(mapped.data);
	} catch (error) {
		return mapPersistenceFailure(error, "Failed to transition shift status");
	}
}

function drizzleExceptionDetectionHost(
	store: HumanResourcesTimeStore,
): ExceptionDetectionHost {
	return {
		getScheduledShiftForEmployeeDate: (input) =>
			store.getScheduledShiftForEmployeeDate(input),
		getShift: (input) => store.getShift(input),
		listUnresolvedAttendanceExceptions: (input) =>
			store.listUnresolvedAttendanceExceptions(input),
		createAttendanceException: (input, ports) =>
			store.createAttendanceException(input, ports),
		async deleteAttendanceExceptionForRollback(input) {
			try {
				await db
					.delete(hrAttendanceException)
					.where(
						and(
							eq(hrAttendanceException.organizationId, input.organizationId),
							eq(hrAttendanceException.id, input.exceptionId),
						),
					);
				return ok(undefined);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to roll back attendance exception",
				);
			}
		},
	};
}

async function restoreAttendanceSession(
	previous: AttendanceSession,
): Promise<void> {
	await db
		.update(hrAttendanceSession)
		.set({
			timezone: previous.timezone,
			firstClockInAt: previous.firstClockInAt,
			finalClockOutAt: previous.finalClockOutAt,
			breakMinutes: previous.breakMinutes,
			workedMinutes: previous.workedMinutes,
			grossMinutes: previous.grossMinutes,
			resolutionStatus: previous.resolutionStatus,
			requiresReview: previous.requiresReview,
			version: previous.version,
			updatedBy: previous.updatedBy,
			updatedAt: previous.updatedAt,
		})
		.where(
			and(
				eq(hrAttendanceSession.organizationId, previous.organizationId),
				eq(hrAttendanceSession.id, previous.id),
			),
		);
}

async function restoreShiftAssignmentPublication(
	previous: ShiftAssignment,
): Promise<void> {
	await db
		.update(hrShiftAssignment)
		.set({
			publicationStatus: previous.publicationStatus,
			version: previous.version,
			updatedBy: previous.updatedBy,
			updatedAt: previous.updatedAt,
		})
		.where(
			and(
				eq(hrShiftAssignment.organizationId, previous.organizationId),
				eq(hrShiftAssignment.id, previous.id),
			),
		);
}

async function transitionAssignment(
	store: HumanResourcesTimeStore,
	ports: MutationPorts,
	input: {
		organizationId: string;
		assignmentId: ShiftAssignment["id"];
		expectedVersion: number;
		actorUserId: string;
		correlationId?: string;
	},
	next: ShiftAssignment["publicationStatus"],
): Promise<Result<ShiftAssignment>> {
	const existing = await store.getShiftAssignment({
		organizationId: input.organizationId,
		assignmentId: input.assignmentId,
	});
	if (!existing.ok) return existing;
	if (existing.data === null) return notFound("Shift assignment not found");
	const versionCheck = assertExpectedVersion(
		existing.data.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) return versionCheck;
	const transition = assertAssignmentStatusTransition(
		existing.data.publicationStatus,
		next,
	);
	if (!transition.ok) return transition;
	try {
		const [row] = await db
			.update(hrShiftAssignment)
			.set({
				publicationStatus: next,
				version: existing.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(hrShiftAssignment.organizationId, input.organizationId),
					eq(hrShiftAssignment.id, input.assignmentId),
					eq(hrShiftAssignment.version, input.expectedVersion),
				),
			)
			.returning();
		if (!row) return notFound("Shift assignment not found");
		const mapped = mapAssignment(row);
		if (!mapped.ok) return mapped;
		const correlationId =
			input.correlationId ??
			`hr-time-hr_shift_assignment-${mapped.data.id}`;
		const recorded = await audit(ports, {
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId,
			entity: "hr_shift_assignment",
			entityId: mapped.data.id,
			action: "UPDATE",
		});
		if (!recorded.ok) return recorded;
		if (next === "published") {
			const event = await emitOutbox(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId,
				eventType: HUMAN_RESOURCES_TIME_SCHEDULE_PUBLISHED_EVENT,
				entityType: "hr_shift_assignment",
				entityId: mapped.data.id,
			});
			if (!event.ok) return event;
		}
		return ok(mapped.data);
	} catch (error) {
		return mapPersistenceFailure(error, "Failed to transition assignment");
	}
}

async function transitionException(
	store: HumanResourcesTimeStore,
	ports: MutationPorts,
	input: {
		organizationId: string;
		exceptionId: AttendanceException["id"];
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
	},
	next: AttendanceException["reviewStatus"],
	extra?: { resolution?: string; evidenceReference?: string | null },
): Promise<Result<AttendanceException>> {
	const existing = await store.getAttendanceException({
		organizationId: input.organizationId,
		exceptionId: input.exceptionId,
	});
	if (!existing.ok) return existing;
	if (existing.data === null) return notFound("Attendance exception not found");
	const versionCheck = assertExpectedVersion(
		existing.data.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) return versionCheck;
	const transition = assertExceptionStatusTransition(
		existing.data.reviewStatus,
		next,
	);
	if (!transition.ok) return transition;
	try {
		const [row] = await db
			.update(hrAttendanceException)
			.set({
				reviewStatus: next,
				reviewerUserId: input.actorUserId,
				resolution: extra?.resolution ?? existing.data.resolution,
				evidenceReference:
					extra?.evidenceReference !== undefined
						? extra.evidenceReference
						: existing.data.evidenceReference,
				version: existing.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(hrAttendanceException.organizationId, input.organizationId),
					eq(hrAttendanceException.id, input.exceptionId),
					eq(hrAttendanceException.version, input.expectedVersion),
				),
			)
			.returning();
		if (!row) return notFound("Attendance exception not found");
		const mapped = mapException(row);
		if (!mapped.ok) return mapped;
		const recorded = await audit(ports, {
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: input.correlationId,
			entity: "hr_attendance_exception",
			entityId: mapped.data.id,
			action: "UPDATE",
		});
		if (!recorded.ok) return recorded;
		return ok(mapped.data);
	} catch (error) {
		return mapPersistenceFailure(error, "Failed to transition exception");
	}
}

async function transitionTimesheet(
	store: HumanResourcesTimeStore,
	ports: MutationPorts,
	input: {
		organizationId: string;
		timesheetId: Timesheet["id"];
		expectedVersion: number;
		actorUserId: string;
		correlationId?: string;
	},
	next: Timesheet["status"],
	extra?: Partial<{
		submittedAt: Date;
		approvedAt: Date;
		approvedBy: string;
		approverNotes: string | null;
		rejectionReason: string;
		lockedAt: Date;
	}>,
): Promise<Result<Timesheet>> {
	const existing = await store.getTimesheet({
		organizationId: input.organizationId,
		timesheetId: input.timesheetId,
	});
	if (!existing.ok) return existing;
	if (existing.data === null) return notFound("Timesheet not found");
	const versionCheck = assertExpectedVersion(
		existing.data.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) return versionCheck;
	const transition = assertTimesheetStatusTransition(
		existing.data.status,
		next,
	);
	if (!transition.ok) return transition;
	try {
		const [row] = await db
			.update(hrTimesheet)
			.set({
				status: next,
				submittedAt: extra?.submittedAt ?? existing.data.submittedAt,
				approvedAt: extra?.approvedAt ?? existing.data.approvedAt,
				approvedBy: extra?.approvedBy ?? existing.data.approvedBy,
				approverNotes:
					extra?.approverNotes !== undefined
						? extra.approverNotes
						: existing.data.approverNotes,
				rejectionReason:
					extra?.rejectionReason ?? existing.data.rejectionReason,
				lockedAt: extra?.lockedAt ?? existing.data.lockedAt,
				version: existing.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(hrTimesheet.organizationId, input.organizationId),
					eq(hrTimesheet.id, input.timesheetId),
					eq(hrTimesheet.version, input.expectedVersion),
				),
			)
			.returning();
		if (!row) return notFound("Timesheet not found");
		const mapped = mapTimesheet(row);
		if (!mapped.ok) return mapped;
		const correlationId =
			input.correlationId ?? `hr-time-hr_timesheet-${mapped.data.id}`;
		const recorded = await audit(ports, {
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId,
			entity: "hr_timesheet",
			entityId: mapped.data.id,
			action: "UPDATE",
		});
		if (!recorded.ok) return recorded;
		const eventTypes: HumanResourcesEventType[] = [];
		if (next === "submitted") {
			eventTypes.push(HUMAN_RESOURCES_TIME_TIMESHEET_SUBMITTED_EVENT);
		} else if (next === "approved") {
			eventTypes.push(HUMAN_RESOURCES_TIMESHEET_APPROVED_EVENT);
		} else if (next === "draft") {
			eventTypes.push(HUMAN_RESOURCES_TIME_TIMESHEET_REOPENED_EVENT);
		} else if (next === "locked") {
			eventTypes.push(
				HUMAN_RESOURCES_TIME_TIMESHEET_LOCKED_EVENT,
				HUMAN_RESOURCES_TIME_PAYROLL_HANDOFF_READY_EVENT,
			);
		}
		for (const eventType of eventTypes) {
			const event = await emitOutbox(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId,
				eventType,
				entityType: "hr_timesheet",
				entityId: mapped.data.id,
			});
			if (!event.ok) return event;
		}
		return ok(mapped.data);
	} catch (error) {
		return mapPersistenceFailure(error, "Failed to transition timesheet");
	}
}

async function transitionOvertime(
	store: HumanResourcesTimeStore,
	ports: MutationPorts,
	input: {
		organizationId: string;
		requestId: OvertimeRequest["id"];
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
		comment?: string;
	},
	next: OvertimeRequest["status"],
	extra?: { comment?: string },
): Promise<Result<OvertimeRequest>> {
	const existing = await store.getOvertimeRequest({
		organizationId: input.organizationId,
		requestId: input.requestId,
	});
	if (!existing.ok) return existing;
	if (existing.data === null) return notFound("Overtime request not found");
	const versionCheck = assertExpectedVersion(
		existing.data.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) return versionCheck;
	const transition = assertOvertimeStatusTransition(existing.data.status, next);
	if (!transition.ok) return transition;
	try {
		const [row] = await db
			.update(hrOvertimeRequest)
			.set({
				status: next,
				version: existing.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(hrOvertimeRequest.organizationId, input.organizationId),
					eq(hrOvertimeRequest.id, input.requestId),
					eq(hrOvertimeRequest.version, input.expectedVersion),
				),
			)
			.returning();
		if (!row) return notFound("Overtime request not found");
		if (next === "rejected" || next === "cancelled") {
			await db.insert(hrOvertimeApproval).values({
				id: randomUUID(),
				organizationId: input.organizationId,
				overtimeRequestId: input.requestId,
				decision: next === "rejected" ? "rejected" : "cancelled",
				approvedMaximumMinutes: null,
				actorUserId: input.actorUserId,
				comment: extra?.comment ?? input.comment ?? null,
				decidedAt: new Date(),
				versionApproved: existing.data.version + 1,
			});
		}
		const mapped = mapOvertime(row);
		if (!mapped.ok) return mapped;
		const recorded = await audit(ports, {
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: input.correlationId,
			entity: "hr_overtime_request",
			entityId: mapped.data.id,
			action: "UPDATE",
		});
		if (!recorded.ok) return recorded;
		return ok(mapped.data);
	} catch (error) {
		return mapPersistenceFailure(
			error,
			"Failed to transition overtime request",
		);
	}
}
