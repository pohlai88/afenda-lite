import { randomUUID } from "node:crypto";

import {
	database as afendaDatabase,
	and,
	asc,
	desc,
	eq,
	gte,
	hrAttendanceAdjustment,
	hrAttendanceBreakWaiverDecision,
	hrAttendanceEvent,
	hrAttendanceException,
	hrAttendanceImportBatch,
	hrAttendanceSession,
	hrEmployee,
	hrEmployment,
	hrEmploymentCalendarAssignment,
	hrOvertimeApproval,
	hrOvertimeRequest,
	hrShift,
	hrShiftAssignment,
	hrShiftAssignmentSegment,
	hrShiftBreak,
	hrTimeApprovalAuthorityAssignment,
	hrTimePolicy,
	hrTimePolicyAssignment,
	hrTimesheet,
	hrTimesheetApprovalDecision,
	hrTimesheetEntry,
	hrWorkCalendar,
	hrWorkCalendarHoliday,
	hrWorkCalendarScopeAssignment,
	inArray,
	isNull,
	lt,
	lte,
	ne,
	or,
	sql,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";
import type { HumanResourcesEventType } from "@afenda/events";
import {
	HUMAN_RESOURCES_TIME_ATTENDANCE_CORRECTED_EVENT,
	HUMAN_RESOURCES_TIME_ATTENDANCE_RECORDED_EVENT,
	HUMAN_RESOURCES_TIME_EXCEPTION_CREATED_EVENT,
	HUMAN_RESOURCES_TIME_OVERTIME_APPROVED_EVENT,
	HUMAN_RESOURCES_TIME_PAYROLL_HANDOFF_READY_EVENT,
	HUMAN_RESOURCES_TIME_SCHEDULE_PUBLISHED_EVENT,
	HUMAN_RESOURCES_TIME_TIMESHEET_APPROVAL_STEP_RECORDED_EVENT,
	HUMAN_RESOURCES_TIME_TIMESHEET_LOCKED_EVENT,
	HUMAN_RESOURCES_TIME_TIMESHEET_REOPENED_EVENT,
	HUMAN_RESOURCES_TIME_TIMESHEET_SUBMITTED_EVENT,
	HUMAN_RESOURCES_TIMESHEET_APPROVED_EVENT,
} from "@afenda/events/schemas";
import { z } from "zod";

import {
	parseHumanResourcesAttendanceAdjustmentId,
	parseHumanResourcesAttendanceBreakWaiverDecisionId,
	parseHumanResourcesAttendanceEventId,
	parseHumanResourcesAttendanceExceptionId,
	parseHumanResourcesAttendanceSessionId,
	parseHumanResourcesEmployeeId,
	parseHumanResourcesEmploymentCalendarAssignmentId,
	parseHumanResourcesEmploymentId,
	parseHumanResourcesOvertimeRequestId,
	parseHumanResourcesShiftAssignmentId,
	parseHumanResourcesShiftAssignmentSegmentId,
	parseHumanResourcesShiftBreakId,
	parseHumanResourcesShiftId,
	parseHumanResourcesTimeApprovalAuthorityAssignmentId,
	parseHumanResourcesTimePolicyAssignmentId,
	parseHumanResourcesTimePolicyId,
	parseHumanResourcesTimesheetApprovalDecisionId,
	parseHumanResourcesTimesheetEntryId,
	parseHumanResourcesTimesheetId,
	parseHumanResourcesWorkCalendarHolidayId,
	parseHumanResourcesWorkCalendarId,
	parseHumanResourcesWorkCalendarScopeAssignmentId,
} from "../../brands";
import type { MutationPorts } from "../../ports";
import { assertExpectedVersion } from "../../shared/concurrency";
import { conflict, invalidState, notFound } from "../../shared/domain-guards";
import { selectEffectiveLineageRecord } from "../../shared/effective-lineage";
import {
	isCreateIdempotencyUniqueViolation,
	isPostgresForeignKeyViolation,
	isPostgresUndefinedTable,
	isPostgresUniqueConstraint,
	isPostgresUniqueViolation,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";
import { isResultFailure } from "../../shared/result-guards";
import {
	runSequential,
	sequentialContinue,
	sequentialReturn,
} from "../../shared/run-sequential";
import {
	assertAssignmentStatusTransition,
	assertExceptionStatusTransition,
	assertNoSelfApprove,
	assertOvertimeStatusTransition,
	assertShiftStatusTransition,
	assertTimesheetStatusTransition,
	timesheetReopenSnapshot,
} from "../../shared/time-guards";
import type { HumanResourcesStore } from "../../store";
import type {
	HumanResourcesTimeStore,
	ShiftCreateRecord,
	TimePolicyCreateRecord,
	TimesheetGenerationDeps,
	WorkCalendarCreateRecord,
} from "../../store/time";
import {
	filterAttendanceEventsForWorkDay,
	resolveAttendanceEventSourceSequence,
	resolveImportRowSourceSequence,
	sortAttendanceEventsForSession,
} from "../../time/attendance/event-order";
import {
	ATTENDANCE_SESSION_DETECTION_SOURCE,
	type ExceptionDetectionHost,
	planAttendanceExceptionDetection,
	runAttendanceExceptionDetection,
	SCHEDULE_PUBLISH_DETECTION_SOURCE,
} from "../../time/attendance/exception-detection";
import {
	buildImportEventFingerprint,
	isValidIanaTimeZone,
} from "../../time/attendance/import-keys";
import {
	applyAutomaticBreakPolicy,
	resolveSessionFromEvents,
} from "../../time/attendance/session-resolution";
import { aggregatePayrollMinutes } from "../../time/payroll-minute-totals";
import {
	approvedLeaveMinutesForDate,
	buildAttendanceTimesheetEntryPlans,
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
	AttendanceAdjustment,
	AttendanceBreakWaiverDecision,
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
	ShiftAssignmentSegment,
	ShiftBreak,
	TimeApprovalAuthority,
	TimeApprovalAuthorityAssignment,
	TimePolicy,
	TimePolicyAssignment,
	Timesheet,
	TimesheetApprovalDecision,
	TimesheetEntry,
	WorkCalendar,
	WorkCalendarHolidayRecord,
	WorkCalendarScopeAssignment,
	WorkCalendarScopeType,
	WorkWeekDayPatternJson,
} from "../../types";
import {
	attendanceBreakWaiverDecisionFromSql,
	attendanceEventFromSql,
	attendanceExceptionFromSql,
	attendanceSessionFromSql,
	buildDetectedAttendanceExceptionInsert,
	buildTimeAuditInsert,
	buildTimeOutboxInsert,
	type EmploymentCalendarAssignmentSqlRow,
	employmentCalendarAssignmentFromSql,
	prepareTimeAudit,
	runTimeTransaction,
	type ShiftBreakSqlRow,
	type ShiftSqlRow,
	shiftAssignmentFromSql,
	shiftBreakFromSql,
	shiftFromSql,
	type TimePolicySqlRow,
	timeApprovalAuthorityAssignmentFromSql,
	timePolicyAssignmentFromSql,
	timePolicyFromSql,
	timesheetApprovalDecisionFromSql,
	timesheetFromSql,
	type WorkCalendarHolidaySqlRow,
	type WorkCalendarScopeAssignmentSqlRow,
	type WorkCalendarSqlRow,
	workCalendarFromSql,
	workCalendarHolidayFromSql,
	workCalendarScopeAssignmentFromSql,
} from "./time-transactions";

const HR_REGEX_1 = /hr_attendance_event_org_source_ref_uidx|source_reference/i;

const ATTENDANCE_IMPORT_LOOKUP_FAILED_MESSAGE =
	"Attendance import source reference lookup failed";
const ATTENDANCE_IMPORT_RECORD_FAILED_MESSAGE =
	"Attendance import row could not be recorded";

function resolveImportBatchStatus(input: {
	accepted: number;
	skipped: number;
	rejected: number;
}): AttendanceImportBatchStatus {
	if (input.rejected === 0) {
		return "completed";
	}
	if (input.accepted === 0 && input.skipped === 0) {
		return "failed";
	}
	return "partial";
}

function isAttendanceSourceRefUniqueViolation(error: unknown): boolean {
	return isPostgresUniqueConstraint(error, HR_REGEX_1);
}

const attendanceCorrectionTails = new Map<string, Promise<void>>();

function requirePersistenceRow<T>(row: T | undefined): T {
	if (row === undefined) {
		throw new Error("Persistence operation returned no row");
	}
	return row;
}

async function audit(
	ports: MutationPorts,
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId?: string | undefined;
		entity: string;
		entityId: string;
		action: "CREATE" | "UPDATE" | "DELETE";
	},
): Promise<Result<{ id: string }>> {
	return await ports.audit.record({
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
	return await ports.outbox.append({
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
	if (!id.ok) {
		return id;
	}
	const supersedesCalendarId =
		row.supersedesCalendarId === null
			? errorResult.ok(null)
			: parseHumanResourcesWorkCalendarId(row.supersedesCalendarId);
	if (isResultFailure(supersedesCalendarId)) {
		return supersedesCalendarId;
	}
	if (
		row.status !== "active" &&
		row.status !== "superseded" &&
		row.status !== "archived"
	) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
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
		supersedesCalendarId: supersedesCalendarId.data,
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
		return errorResult.ok(value);
	}
	return errorResult.fail("INTERNAL_ERROR");
}

function mapHoliday(
	row: typeof hrWorkCalendarHoliday.$inferSelect,
): Result<WorkCalendarHolidayRecord> {
	const id = parseHumanResourcesWorkCalendarHolidayId(row.id);
	if (!id.ok) {
		return id;
	}
	const calendarId = parseHumanResourcesWorkCalendarId(row.calendarId);
	if (!calendarId.ok) {
		return calendarId;
	}
	const overrideKind = mapHolidayOverrideKind(row.overrideKind);
	if (!overrideKind.ok) {
		return overrideKind;
	}
	return errorResult.ok({
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
	if (!id.ok) {
		return id;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) {
		return employmentId;
	}
	const calendarId = parseHumanResourcesWorkCalendarId(row.calendarId);
	if (!calendarId.ok) {
		return calendarId;
	}
	return errorResult.ok({
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

function parseTimeApprovalSteps(
	value: unknown,
): Result<TimeApprovalAuthority[]> {
	if (!Array.isArray(value)) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	const steps: TimeApprovalAuthority[] = [];
	for (const step of value) {
		if (
			step !== "line_manager" &&
			step !== "department" &&
			step !== "hr" &&
			step !== "payroll"
		) {
			return errorResult.fail("INTERNAL_ERROR");
		}
		steps.push(step);
	}
	return errorResult.ok(steps);
}

function mapTimePolicy(
	row: typeof hrTimePolicy.$inferSelect,
): Result<TimePolicy> {
	const id = parseHumanResourcesTimePolicyId(row.id);
	if (!id.ok) {
		return id;
	}
	if (
		row.status !== "draft" &&
		row.status !== "active" &&
		row.status !== "superseded" &&
		row.status !== "archived"
	) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	const approvalSteps = parseTimeApprovalSteps(row.approvalSteps);
	if (!approvalSteps.ok) {
		return approvalSteps;
	}
	let supersedesPolicyId = null as TimePolicy["supersedesPolicyId"];
	if (row.supersedesPolicyId !== null) {
		const parsed = parseHumanResourcesTimePolicyId(row.supersedesPolicyId);
		if (!parsed.ok) {
			return parsed;
		}
		supersedesPolicyId = parsed.data;
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		code: row.code,
		name: row.name,
		status: row.status,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		minimumRestMinutes: row.minimumRestMinutes,
		automaticBreakAfterMinutes: row.automaticBreakAfterMinutes,
		automaticBreakMinutes: row.automaticBreakMinutes,
		approvalSteps: approvalSteps.data,
		supersedesPolicyId,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapTimePolicyAssignment(
	row: typeof hrTimePolicyAssignment.$inferSelect,
): Result<TimePolicyAssignment> {
	const id = parseHumanResourcesTimePolicyAssignmentId(row.id);
	if (!id.ok) {
		return id;
	}
	const policyId = parseHumanResourcesTimePolicyId(row.policyId);
	if (!policyId.ok) {
		return policyId;
	}
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) {
		return employmentId;
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		policyId: policyId.data,
		employmentId: employmentId.data,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapTimeApprovalAuthorityAssignment(
	row: typeof hrTimeApprovalAuthorityAssignment.$inferSelect,
): Result<TimeApprovalAuthorityAssignment> {
	const id = parseHumanResourcesTimeApprovalAuthorityAssignmentId(row.id);
	if (!id.ok) {
		return id;
	}
	if (
		row.authority !== "line_manager" &&
		row.authority !== "department" &&
		row.authority !== "hr" &&
		row.authority !== "payroll"
	) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		actorUserId: row.actorUserId,
		authority: row.authority,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

const WORK_CALENDAR_SCOPE_TYPES = new Set<WorkCalendarScopeType>([
	"employment",
	"employee",
	"location",
	"department",
	"legal_entity",
	"organization",
]);

function mapWorkCalendarScopeAssignment(
	row: typeof hrWorkCalendarScopeAssignment.$inferSelect,
): Result<WorkCalendarScopeAssignment> {
	const id = parseHumanResourcesWorkCalendarScopeAssignmentId(row.id);
	if (!id.ok) {
		return id;
	}
	const calendarId = parseHumanResourcesWorkCalendarId(row.calendarId);
	if (!calendarId.ok) {
		return calendarId;
	}
	if (!WORK_CALENDAR_SCOPE_TYPES.has(row.scopeType as WorkCalendarScopeType)) {
		return invalidState("Work calendar scope type is invalid");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		scopeType: row.scopeType as WorkCalendarScopeType,
		scopeKey: row.scopeKey,
		calendarId: calendarId.data,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapShift(row: typeof hrShift.$inferSelect): Result<Shift> {
	const id = parseHumanResourcesShiftId(row.id);
	if (!id.ok) {
		return id;
	}
	const supersedesShiftId =
		row.supersedesShiftId === null
			? errorResult.ok(null)
			: parseHumanResourcesShiftId(row.supersedesShiftId);
	if (isResultFailure(supersedesShiftId)) {
		return supersedesShiftId;
	}
	if (
		row.shiftKind !== "fixed" &&
		row.shiftKind !== "flexible" &&
		row.shiftKind !== "split" &&
		row.shiftKind !== "rest_day" &&
		row.shiftKind !== "public_holiday"
	) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	if (
		row.status !== "draft" &&
		row.status !== "active" &&
		row.status !== "superseded" &&
		row.status !== "inactive"
	) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
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
		supersedesShiftId: supersedesShiftId.data,
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
	if (!id.ok) {
		return id;
	}
	const shiftId = parseHumanResourcesShiftId(row.shiftId);
	if (!shiftId.ok) {
		return shiftId;
	}
	return errorResult.ok({
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
	if (!id.ok) {
		return id;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	let employmentId = null as ShiftAssignment["employmentId"];
	if (row.employmentId !== null) {
		const parsed = parseHumanResourcesEmploymentId(row.employmentId);
		if (!parsed.ok) {
			return parsed;
		}
		employmentId = parsed.data;
	}
	const shiftId = parseHumanResourcesShiftId(row.shiftId);
	if (!shiftId.ok) {
		return shiftId;
	}
	if (
		row.publicationStatus !== "planned" &&
		row.publicationStatus !== "published" &&
		row.publicationStatus !== "changed" &&
		row.publicationStatus !== "cancelled" &&
		row.publicationStatus !== "completed"
	) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
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

function mapAssignmentSegment(
	row: typeof hrShiftAssignmentSegment.$inferSelect,
): Result<ShiftAssignmentSegment> {
	const id = parseHumanResourcesShiftAssignmentSegmentId(row.id);
	if (!id.ok) {
		return id;
	}
	const assignmentId = parseHumanResourcesShiftAssignmentId(row.assignmentId);
	if (!assignmentId.ok) {
		return assignmentId;
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		assignmentId: assignmentId.data,
		segmentOrder: row.segmentOrder,
		startsAt: row.startsAt,
		endsAt: row.endsAt,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapEvent(
	row: typeof hrAttendanceEvent.$inferSelect,
): Result<AttendanceEvent> {
	const id = parseHumanResourcesAttendanceEventId(row.id);
	if (!id.ok) {
		return id;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	let employmentId = null as AttendanceEvent["employmentId"];
	if (row.employmentId !== null) {
		const parsed = parseHumanResourcesEmploymentId(row.employmentId);
		if (!parsed.ok) {
			return parsed;
		}
		employmentId = parsed.data;
	}
	let shiftAssignmentId = null as AttendanceEvent["shiftAssignmentId"];
	if (row.shiftAssignmentId !== null) {
		const parsed = parseHumanResourcesShiftAssignmentId(row.shiftAssignmentId);
		if (!parsed.ok) {
			return parsed;
		}
		shiftAssignmentId = parsed.data;
	}
	if (
		row.eventType !== "clock_in" &&
		row.eventType !== "clock_out" &&
		row.eventType !== "break_start" &&
		row.eventType !== "break_end" &&
		row.eventType !== "manual_adjustment"
	) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	if (
		row.source !== "self" &&
		row.source !== "supervisor" &&
		row.source !== "import" &&
		row.source !== "system" &&
		row.source !== "manual"
	) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	const deviceMetadata =
		row.deviceMetadata !== null &&
		typeof row.deviceMetadata === "object" &&
		!Array.isArray(row.deviceMetadata)
			? (row.deviceMetadata as Record<string, unknown>)
			: null;
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		employmentId,
		shiftAssignmentId,
		eventType: row.eventType,
		capturedOccurredAt: row.capturedOccurredAt,
		occurredAt: row.occurredAt,
		sourceSequence: row.sourceSequence,
		sourceTimezone: row.sourceTimezone,
		localWorkDate: row.localWorkDate,
		source: row.source,
		sourceReference: row.sourceReference,
		locationKey: row.locationKey,
		deviceMetadata,
		payloadChecksum: row.payloadChecksum,
		capturedNotes: row.capturedNotes,
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

function mapAttendanceAdjustment(
	row: typeof hrAttendanceAdjustment.$inferSelect,
): Result<AttendanceAdjustment> {
	const id = parseHumanResourcesAttendanceAdjustmentId(row.id);
	if (!id.ok) {
		return id;
	}
	const eventId = parseHumanResourcesAttendanceEventId(row.eventId);
	if (!eventId.ok) {
		return eventId;
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		eventId: eventId.data,
		sequence: row.sequence,
		eventVersionBefore: row.eventVersionBefore,
		eventVersionAfter: row.eventVersionAfter,
		previousOccurredAt: row.previousOccurredAt,
		newOccurredAt: row.newOccurredAt,
		previousNotes: row.previousNotes,
		newNotes: row.newNotes,
		adjustmentReason: row.adjustmentReason,
		evidenceReference: row.evidenceReference,
		actorUserId: row.actorUserId,
		correlationId: row.correlationId,
		createdAt: row.createdAt,
	});
}

function mapSession(
	row: typeof hrAttendanceSession.$inferSelect,
): Result<AttendanceSession> {
	const id = parseHumanResourcesAttendanceSessionId(row.id);
	if (!id.ok) {
		return id;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	let employmentId = null as AttendanceSession["employmentId"];
	if (row.employmentId !== null) {
		const parsed = parseHumanResourcesEmploymentId(row.employmentId);
		if (!parsed.ok) {
			return parsed;
		}
		employmentId = parsed.data;
	}
	let shiftAssignmentId = null as AttendanceSession["shiftAssignmentId"];
	if (row.shiftAssignmentId !== null) {
		const parsed = parseHumanResourcesShiftAssignmentId(row.shiftAssignmentId);
		if (!parsed.ok) {
			return parsed;
		}
		shiftAssignmentId = parsed.data;
	}
	if (
		row.resolutionStatus !== "incomplete" &&
		row.resolutionStatus !== "resolved" &&
		row.resolutionStatus !== "needs_review" &&
		row.resolutionStatus !== "voided"
	) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	const provenanceResult = z
		.object({
			automaticBreak: z
				.object({
					policyId: z.string().uuid(),
					minutes: z.number().int().nonnegative(),
					applied: z.boolean(),
				})
				.nullable(),
			breakIntervals: z
				.array(
					z.object({
						startedAt: z.string().datetime(),
						endedAt: z.string().datetime(),
					}),
				)
				.optional(),
		})
		.safeParse(row.provenance ?? { automaticBreak: null });
	if (!provenanceResult.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	let automaticBreak: AttendanceSession["provenance"]["automaticBreak"] = null;
	if (provenanceResult.data.automaticBreak !== null) {
		const policyId = parseHumanResourcesTimePolicyId(
			provenanceResult.data.automaticBreak.policyId,
		);
		if (!policyId.ok) {
			return policyId;
		}
		automaticBreak = {
			...provenanceResult.data.automaticBreak,
			policyId: policyId.data,
		};
	}
	return errorResult.ok({
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
		provenance: {
			automaticBreak,
			breakIntervals: provenanceResult.data.breakIntervals ?? [],
		},
		resolutionStatus: row.resolutionStatus,
		requiresReview: row.requiresReview,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapAttendanceBreakWaiverDecision(
	row: typeof hrAttendanceBreakWaiverDecision.$inferSelect,
): Result<AttendanceBreakWaiverDecision> {
	const id = parseHumanResourcesAttendanceBreakWaiverDecisionId(row.id);
	if (!id.ok) {
		return id;
	}
	const sessionId = parseHumanResourcesAttendanceSessionId(row.sessionId);
	if (!sessionId.ok) {
		return sessionId;
	}
	const policyId = parseHumanResourcesTimePolicyId(row.policyId);
	if (!policyId.ok) {
		return policyId;
	}
	const authorityAssignmentId =
		parseHumanResourcesTimeApprovalAuthorityAssignmentId(
			row.authorityAssignmentId,
		);
	if (!authorityAssignmentId.ok) {
		return authorityAssignmentId;
	}
	if (
		row.authority !== "line_manager" &&
		row.authority !== "department" &&
		row.authority !== "hr" &&
		row.authority !== "payroll"
	) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		sessionId: sessionId.data,
		policyId: policyId.data,
		authorityAssignmentId: authorityAssignmentId.data,
		authority: row.authority,
		actorUserId: row.actorUserId,
		reason: row.reason,
		evidenceReference: row.evidenceReference,
		automaticBreakMinutes: row.automaticBreakMinutes,
		recordedBreakMinutes: row.recordedBreakMinutes,
		sessionVersion: row.sessionVersion,
		correlationId: row.correlationId,
		decidedAt: row.decidedAt,
		createdAt: row.createdAt,
	});
}

function mapException(
	row: typeof hrAttendanceException.$inferSelect,
): Result<AttendanceException> {
	const id = parseHumanResourcesAttendanceExceptionId(row.id);
	if (!id.ok) {
		return id;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	let sessionId = null as AttendanceException["sessionId"];
	if (row.sessionId !== null) {
		const parsed = parseHumanResourcesAttendanceSessionId(row.sessionId);
		if (!parsed.ok) {
			return parsed;
		}
		sessionId = parsed.data;
	}
	let eventId = null as AttendanceException["eventId"];
	if (row.eventId !== null) {
		const parsed = parseHumanResourcesAttendanceEventId(row.eventId);
		if (!parsed.ok) {
			return parsed;
		}
		eventId = parsed.data;
	}
	let shiftAssignmentId = null as AttendanceException["shiftAssignmentId"];
	if (row.shiftAssignmentId !== null) {
		const parsed = parseHumanResourcesShiftAssignmentId(row.shiftAssignmentId);
		if (!parsed.ok) {
			return parsed;
		}
		shiftAssignmentId = parsed.data;
	}
	if (
		row.severity !== "info" &&
		row.severity !== "warning" &&
		row.severity !== "critical"
	) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	if (
		row.reviewStatus !== "open" &&
		row.reviewStatus !== "in_review" &&
		row.reviewStatus !== "excused" &&
		row.reviewStatus !== "rejected" &&
		row.reviewStatus !== "resolved"
	) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
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
	if (!id.ok) {
		return id;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	let employmentId = null as Timesheet["employmentId"];
	if (row.employmentId !== null) {
		const parsed = parseHumanResourcesEmploymentId(row.employmentId);
		if (!parsed.ok) {
			return parsed;
		}
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
		return errorResult.fail("INTERNAL_ERROR");
	}
	let approvalPolicyId = null as Timesheet["approvalPolicyId"];
	if (row.approvalPolicyId !== null) {
		const parsed = parseHumanResourcesTimePolicyId(row.approvalPolicyId);
		if (!parsed.ok) {
			return parsed;
		}
		approvalPolicyId = parsed.data;
	}
	const requiredApprovalSteps = parseTimeApprovalSteps(
		row.requiredApprovalSteps,
	);
	if (!requiredApprovalSteps.ok) {
		return requiredApprovalSteps;
	}
	return errorResult.ok({
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
		submissionReference: row.submissionReference,
		approvalPolicyId,
		requiredApprovalSteps: requiredApprovalSteps.data,
		completedApprovalSteps: row.completedApprovalSteps,
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

function mapTimesheetApprovalDecision(
	row: typeof hrTimesheetApprovalDecision.$inferSelect,
): Result<TimesheetApprovalDecision> {
	const id = parseHumanResourcesTimesheetApprovalDecisionId(row.id);
	if (!id.ok) {
		return id;
	}
	const timesheetId = parseHumanResourcesTimesheetId(row.timesheetId);
	if (!timesheetId.ok) {
		return timesheetId;
	}
	let policyId = null as TimesheetApprovalDecision["policyId"];
	if (row.policyId !== null) {
		const parsed = parseHumanResourcesTimePolicyId(row.policyId);
		if (!parsed.ok) {
			return parsed;
		}
		policyId = parsed.data;
	}
	const authorityAssignmentId =
		parseHumanResourcesTimeApprovalAuthorityAssignmentId(
			row.authorityAssignmentId,
		);
	if (!authorityAssignmentId.ok) {
		return authorityAssignmentId;
	}
	if (
		row.authority !== "line_manager" &&
		row.authority !== "department" &&
		row.authority !== "hr" &&
		row.authority !== "payroll"
	) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		timesheetId: timesheetId.data,
		submissionReference: row.submissionReference,
		policyId,
		authorityAssignmentId: authorityAssignmentId.data,
		stepIndex: row.stepIndex,
		authority: row.authority,
		actorUserId: row.actorUserId,
		comment: row.comment,
		versionApproved: row.versionApproved,
		correlationId: row.correlationId,
		decidedAt: row.decidedAt,
		createdAt: row.createdAt,
	});
}

function mapEntry(
	row: typeof hrTimesheetEntry.$inferSelect,
): Result<TimesheetEntry> {
	const id = parseHumanResourcesTimesheetEntryId(row.id);
	if (!id.ok) {
		return id;
	}
	const timesheetId = parseHumanResourcesTimesheetId(row.timesheetId);
	if (!timesheetId.ok) {
		return timesheetId;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	return errorResult.ok({
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
		costCenterId: row.costCenterId,
		projectId: row.projectId,
		locationId: row.locationId,
		departmentId: row.departmentId,
		approvalReference: row.approvalReference,
		evidenceReference: row.evidenceReference,
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
	if (!id.ok) {
		return id;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	let employmentId = null as OvertimeRequest["employmentId"];
	if (row.employmentId !== null) {
		const parsed = parseHumanResourcesEmploymentId(row.employmentId);
		if (!parsed.ok) {
			return parsed;
		}
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
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
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

function pageOffset(
	page?: number,
	pageSize?: number,
): { limit: number; offset: number } {
	const size = pageSize ?? 50;
	const current = page ?? 1;
	return { limit: size, offset: (current - 1) * size };
}

function resolveShiftUpdate(
	shift: Shift,
	input: Parameters<HumanResourcesTimeStore["updateShift"]>[0],
) {
	return {
		name: input.name ?? shift.name,
		shiftKind: input.shiftKind ?? shift.shiftKind,
		startLocal: input.startLocal ?? shift.startLocal,
		endLocal: input.endLocal ?? shift.endLocal,
		isOvernight: input.isOvernight ?? shift.isOvernight,
		expectedMinutes: input.expectedMinutes ?? shift.expectedMinutes,
		graceEarlyMinutes: input.graceEarlyMinutes ?? shift.graceEarlyMinutes,
		graceLateMinutes: input.graceLateMinutes ?? shift.graceLateMinutes,
		minDurationMinutes:
			input.minDurationMinutes === undefined
				? shift.minDurationMinutes
				: input.minDurationMinutes,
		maxDurationMinutes:
			input.maxDurationMinutes === undefined
				? shift.maxDurationMinutes
				: input.maxDurationMinutes,
		earliestClockInLocal:
			input.earliestClockInLocal === undefined
				? shift.earliestClockInLocal
				: input.earliestClockInLocal,
		latestClockOutLocal:
			input.latestClockOutLocal === undefined
				? shift.latestClockOutLocal
				: input.latestClockOutLocal,
		overtimeEligible: input.overtimeEligible ?? shift.overtimeEligible,
		timezone: input.timezone === undefined ? shift.timezone : input.timezone,
		locationKey:
			input.locationKey === undefined ? shift.locationKey : input.locationKey,
		effectiveTo:
			input.effectiveTo === undefined ? shift.effectiveTo : input.effectiveTo,
	};
}

export const drizzleTimeMethods: HumanResourcesTimeStore = {
	async findWorkCalendarByIdempotencyKey(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrWorkCalendar)
				.where(
					and(
						eq(hrWorkCalendar.organizationId, input.organizationId),
						eq(hrWorkCalendar.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			if (rows.length === 0) {
				return errorResult.ok(null);
			}
			const sourceRow = requirePersistenceRow(rows[0]);
			const mapped = mapCalendar(sourceRow);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok({
				calendar: mapped.data,
				createRequestFingerprint: sourceRow.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find work calendar");
		}
	},

	async createWorkCalendar(input, _ports) {
		try {
			const id = randomUUID();
			const workWeekJson = JSON.stringify([...input.workWeek]);
			const [rows] = await runTimeTransaction((sqlTag) => [
				sqlTag`
					INSERT INTO hr_work_calendar (
						id, organization_id, code, name, timezone, calendar_version,
						work_week_json, standard_hours_per_day, status, effective_from,
						effective_to, version, create_idempotency_key,
						create_request_fingerprint, created_by, updated_by
					) VALUES (
						${id}, ${input.organizationId}, ${input.code}, ${input.name},
						${input.timezone}, ${input.calendarVersion}, ${workWeekJson}::jsonb,
						${input.standardHoursPerDay}, 'active', ${input.effectiveFrom},
						${input.effectiveTo}, 1, ${input.idempotencyKey},
						${input.createRequestFingerprint}, ${input.createdBy}, ${input.createdBy}
					)
					RETURNING *
				`,
				buildTimeAuditInsert(sqlTag, {
					organizationId: input.organizationId,
					actorUserId: input.createdBy,
					correlationId: input.correlationId,
					entity: "hr_work_calendar",
					entityId: id,
					action: "CREATE",
					reasonCode: "WORK_CALENDAR_CREATE",
				}),
			]);
			const mapped = mapCalendar(
				workCalendarFromSql(
					requirePersistenceRow(rows[0]) as WorkCalendarSqlRow,
				),
			);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findWorkCalendarByIdempotencyKey({
					organizationId: input.organizationId,
					idempotencyKey: input.idempotencyKey,
				});
				if (!replay.ok) {
					return replay;
				}
				if (
					replay.data !== null &&
					replay.data.createRequestFingerprint ===
						input.createRequestFingerprint
				) {
					return errorResult.ok(replay.data.calendar);
				}
				return conflict("Idempotency key already used with different data");
			}
			return mapPersistenceFailure(error, "Failed to create work calendar");
		}
	},

	async supersedeWorkCalendar(
		input: WorkCalendarCreateRecord & {
			calendarId: WorkCalendar["id"];
			expectedVersion: number;
			predecessorEffectiveTo: string;
		},
		_ports,
	) {
		try {
			const predecessor = await this.getWorkCalendar({
				organizationId: input.organizationId,
				calendarId: input.calendarId,
			});
			if (!predecessor.ok) {
				return predecessor;
			}
			if (predecessor.data === null) {
				return notFound("Work calendar not found");
			}
			const predecessorCalendar = predecessor.data;
			const versionCheck = assertExpectedVersion(
				predecessorCalendar.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (predecessorCalendar.status !== "active") {
				return invalidState("Only active work calendars can be superseded");
			}
			const now = new Date();
			const successorId = randomUUID();
			const workWeekJson = JSON.stringify([...input.workWeek]);
			const [supersedeRows] = await runTimeTransaction((sqlTag) => [
				sqlTag`
					WITH locked AS (
						SELECT pg_advisory_xact_lock(
							hashtext(${input.organizationId}),
							hashtext(${input.code})
						)
					),
					superseded AS (
						UPDATE hr_work_calendar
						SET status = 'superseded',
							effective_to = ${input.predecessorEffectiveTo},
							version = ${predecessorCalendar.version + 1},
							updated_by = ${input.createdBy},
							updated_at = ${now}
						FROM locked
						WHERE organization_id = ${input.organizationId}
							AND id = ${input.calendarId}
							AND status = 'active'
							AND version = ${input.expectedVersion}
						RETURNING *
					),
					successor AS (
						INSERT INTO hr_work_calendar (
							id, organization_id, code, name, timezone, calendar_version,
							work_week_json, standard_hours_per_day, status, effective_from,
							effective_to, supersedes_calendar_id, version,
							create_idempotency_key, create_request_fingerprint,
							created_by, updated_by, created_at, updated_at
						)
						SELECT
							${successorId}, ${input.organizationId}, ${input.code}, ${input.name},
							${input.timezone}, ${input.calendarVersion}, ${workWeekJson}::jsonb,
							${input.standardHoursPerDay}, 'active', ${input.effectiveFrom},
							${input.effectiveTo}, ${input.calendarId}, 1,
							${input.idempotencyKey}, ${input.createRequestFingerprint},
							${input.createdBy}, ${input.createdBy}, ${now}, ${now}
						WHERE EXISTS (SELECT 1 FROM superseded)
						RETURNING *
					),
					copied_holidays AS (
						INSERT INTO hr_work_calendar_holiday (
							id, organization_id, calendar_id, holiday_date, label, location_code,
							jurisdiction, override_kind, is_working_day, expected_minutes,
							created_by, updated_by, created_at, updated_at
						)
						SELECT
							gen_random_uuid(),
							h.organization_id,
							s.id,
							h.holiday_date,
							h.label,
							h.location_code,
							h.jurisdiction,
							h.override_kind,
							h.is_working_day,
							h.expected_minutes,
							${input.createdBy},
							${input.createdBy},
							${now},
							${now}
						FROM hr_work_calendar_holiday h
						CROSS JOIN successor s
						WHERE h.organization_id = ${input.organizationId}
							AND h.calendar_id = ${input.calendarId}
							AND h.holiday_date >= ${input.effectiveFrom}
						RETURNING id
					)
					SELECT 'superseded'::text AS row_kind, superseded.*
					FROM superseded
					UNION ALL
					SELECT 'successor'::text AS row_kind, successor.*
					FROM successor
				`,
				sqlTag`
					SELECT 1 / COUNT(*) AS mutation_guard
					FROM hr_work_calendar
					WHERE organization_id = ${input.organizationId}
						AND id = ${successorId} AND supersedes_calendar_id = ${input.calendarId}
				`,
				buildTimeAuditInsert(sqlTag, {
					organizationId: input.organizationId,
					actorUserId: input.createdBy,
					correlationId: input.correlationId,
					entity: "hr_work_calendar",
					entityId: successorId,
					action: "CREATE",
					reasonCode: "WORK_CALENDAR_SUPERSEDE",
				}),
			]);
			const supersededSql = supersedeRows.find(
				(row: WorkCalendarSqlRow & { row_kind: string }) =>
					row.row_kind === "superseded",
			);
			const successorSql = supersedeRows.find(
				(row: WorkCalendarSqlRow & { row_kind: string }) =>
					row.row_kind === "successor",
			);
			if (supersededSql === undefined || successorSql === undefined) {
				throw new Error("Concurrent work calendar supersession");
			}
			const rows = {
				supersededRow: workCalendarFromSql(supersededSql),
				successorRow: workCalendarFromSql(successorSql),
			};
			const superseded = mapCalendar(rows.supersededRow);
			if (!superseded.ok) {
				return superseded;
			}
			const successor = mapCalendar(rows.successorRow);
			if (!successor.ok) {
				return successor;
			}
			return errorResult.ok({
				superseded: superseded.data,
				successor: successor.data,
			});
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				return conflict(
					"Work calendar version or idempotency key already exists",
				);
			}
			return mapPersistenceFailure(error, "Failed to supersede work calendar");
		}
	},

	async updateWorkCalendar(input, _ports) {
		try {
			const existing = await this.getWorkCalendar({
				organizationId: input.organizationId,
				calendarId: input.calendarId,
			});
			if (!existing.ok) {
				return existing;
			}
			const calendar = existing.data;
			if (calendar === null) {
				return notFound("Work calendar not found");
			}
			if (
				input.timezone !== undefined ||
				input.calendarVersion !== undefined ||
				input.workWeek !== undefined ||
				input.standardHoursPerDay !== undefined ||
				input.effectiveTo !== undefined
			) {
				return invalidState(
					"Effective-dated work calendar rules must be changed by supersession",
				);
			}
			const versionCheck = assertExpectedVersion(
				calendar.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const updatedAt = new Date();
			const [rows] = await runTimeTransaction((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						UPDATE hr_work_calendar SET
							name = ${input.name ?? calendar.name},
							version = ${calendar.version + 1},
							updated_by = ${input.actorUserId}, updated_at = ${updatedAt}
						WHERE organization_id = ${input.organizationId}
							AND id = ${input.calendarId} AND version = ${input.expectedVersion}
						RETURNING *
					)
					SELECT * FROM mutated
				`,
				sqlTag`
					SELECT 1 / COUNT(*) AS mutation_guard
					FROM hr_work_calendar
					WHERE organization_id = ${input.organizationId} AND id = ${input.calendarId}
						AND version = ${calendar.version + 1} AND updated_at = ${updatedAt}
				`,
				buildTimeAuditInsert(sqlTag, {
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId: input.correlationId,
					entity: "hr_work_calendar",
					entityId: input.calendarId,
					action: "UPDATE",
					reasonCode: "WORK_CALENDAR_UPDATE",
				}),
			]);
			const row = rows[0] as WorkCalendarSqlRow | undefined;
			if (!row) {
				return notFound("Work calendar not found");
			}
			const mapped = mapCalendar(workCalendarFromSql(row));
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update work calendar");
		}
	},

	async archiveWorkCalendar(input, _ports) {
		try {
			const existing = await this.getWorkCalendar({
				organizationId: input.organizationId,
				calendarId: input.calendarId,
			});
			if (!existing.ok) {
				return existing;
			}
			const calendar = existing.data;
			if (calendar === null) {
				return notFound("Work calendar not found");
			}
			const versionCheck = assertExpectedVersion(
				calendar.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (calendar.status === "archived") {
				return invalidState("Work calendar is already archived");
			}
			const updatedAt = new Date();
			const [rows] = await runTimeTransaction((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						UPDATE hr_work_calendar SET status = 'archived',
							version = ${calendar.version + 1},
							updated_by = ${input.actorUserId}, updated_at = ${updatedAt}
						WHERE organization_id = ${input.organizationId}
							AND id = ${input.calendarId} AND version = ${input.expectedVersion}
						RETURNING *
					)
					SELECT * FROM mutated
				`,
				sqlTag`
					SELECT 1 / COUNT(*) AS mutation_guard
					FROM hr_work_calendar
					WHERE organization_id = ${input.organizationId} AND id = ${input.calendarId}
						AND version = ${calendar.version + 1} AND updated_at = ${updatedAt}
				`,
				buildTimeAuditInsert(sqlTag, {
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId: input.correlationId,
					entity: "hr_work_calendar",
					entityId: input.calendarId,
					action: "UPDATE",
					reasonCode: "WORK_CALENDAR_ARCHIVE",
				}),
			]);
			const row = rows[0] as WorkCalendarSqlRow | undefined;
			if (!row) {
				return notFound("Work calendar not found");
			}
			const mapped = mapCalendar(workCalendarFromSql(row));
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to archive work calendar");
		}
	},

	async getWorkCalendar(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrWorkCalendar)
				.where(
					and(
						eq(hrWorkCalendar.organizationId, input.organizationId),
						eq(hrWorkCalendar.id, input.calendarId),
					),
				)
				.limit(1);
			if (rows.length === 0) {
				return errorResult.ok(null);
			}
			return mapCalendar(requirePersistenceRow(rows[0]));
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
			const rows = await afendaDatabase.client
				.select()
				.from(hrWorkCalendar)
				.where(and(...conditions))
				.limit(limit)
				.offset(offset);
			const mapped: WorkCalendar[] = [];
			for (const row of rows) {
				const item = mapCalendar(row);
				if (!item.ok) {
					return item;
				}
				mapped.push(item.data);
			}
			return errorResult.ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list work calendars");
		}
	},

	async addWorkCalendarHoliday(input, _ports) {
		try {
			const calendar = await this.getWorkCalendar({
				organizationId: input.organizationId,
				calendarId: input.calendarId,
			});
			if (!calendar.ok) {
				return calendar;
			}
			if (calendar.data === null) {
				return notFound("Work calendar not found");
			}
			const id = randomUUID();
			const [rows] = await runTimeTransaction((sqlTag) => [
				sqlTag`
					INSERT INTO hr_work_calendar_holiday (
						id, organization_id, calendar_id, holiday_date, label,
						location_code, jurisdiction, override_kind, is_working_day,
						expected_minutes, created_by, updated_by
					) VALUES (
						${id}, ${input.organizationId}, ${input.calendarId}, ${input.holidayDate},
						${input.label}, ${input.locationCode}, ${input.jurisdiction},
						${input.overrideKind}, ${input.isWorkingDay}, ${input.expectedMinutes},
						${input.createdBy}, ${input.createdBy}
					)
					RETURNING *
				`,
				buildTimeAuditInsert(sqlTag, {
					organizationId: input.organizationId,
					actorUserId: input.createdBy,
					correlationId: input.correlationId,
					entity: "hr_work_calendar_holiday",
					entityId: id,
					action: "CREATE",
					reasonCode: "WORK_CALENDAR_HOLIDAY_ADD",
				}),
			]);
			const mapped = mapHoliday(
				workCalendarHolidayFromSql(
					requirePersistenceRow(rows[0]) as WorkCalendarHolidaySqlRow,
				),
			);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to add work calendar holiday",
			);
		}
	},

	async removeWorkCalendarHoliday(input, _ports) {
		try {
			const existing = await afendaDatabase.client
				.select({ id: hrWorkCalendarHoliday.id })
				.from(hrWorkCalendarHoliday)
				.where(
					and(
						eq(hrWorkCalendarHoliday.organizationId, input.organizationId),
						eq(hrWorkCalendarHoliday.id, input.holidayId),
					),
				)
				.limit(1);
			if (existing.length === 0) {
				return notFound("Work calendar holiday not found");
			}
			await runTimeTransaction((sqlTag) => [
				sqlTag`
					WITH deleted AS (
						DELETE FROM hr_work_calendar_holiday
						WHERE organization_id = ${input.organizationId} AND id = ${input.holidayId}
						RETURNING id
					)
					SELECT 1 / COUNT(*) AS mutation_guard FROM deleted
				`,
				buildTimeAuditInsert(sqlTag, {
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId: input.correlationId,
					entity: "hr_work_calendar_holiday",
					entityId: input.holidayId,
					action: "DELETE",
					reasonCode: "WORK_CALENDAR_HOLIDAY_REMOVE",
				}),
			]);
			return errorResult.ok(undefined);
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
			const rows = await afendaDatabase.client
				.select()
				.from(hrWorkCalendarHoliday)
				.where(and(...conditions));
			const mapped: WorkCalendarHolidayRecord[] = [];
			for (const row of rows) {
				const item = mapHoliday(row);
				if (!item.ok) {
					return item;
				}
				mapped.push(item.data);
			}
			return errorResult.ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list work calendar holidays",
			);
		}
	},

	async assignEmploymentCalendar(input, _ports) {
		try {
			const calendar = await this.getWorkCalendar({
				organizationId: input.organizationId,
				calendarId: input.calendarId,
			});
			if (!calendar.ok) {
				return calendar;
			}
			if (calendar.data === null) {
				return notFound("Work calendar not found");
			}
			const id = randomUUID();
			const [rows] = await runTimeTransaction((sqlTag) => [
				sqlTag`
					INSERT INTO hr_employment_calendar_assignment (
						id, organization_id, employee_id, employment_id, calendar_id,
						effective_from, effective_to, location_code, jurisdiction,
						version, created_by, updated_by
					) VALUES (
						${id}, ${input.organizationId}, ${input.employeeId}, ${input.employmentId},
						${input.calendarId}, ${input.effectiveFrom}, ${input.effectiveTo},
						${input.locationCode}, ${input.jurisdiction}, 1,
						${input.createdBy}, ${input.createdBy}
					)
					RETURNING *
				`,
				buildTimeAuditInsert(sqlTag, {
					organizationId: input.organizationId,
					actorUserId: input.createdBy,
					correlationId: input.correlationId,
					entity: "hr_employment_calendar_assignment",
					entityId: id,
					action: "CREATE",
					reasonCode: "EMPLOYMENT_CALENDAR_ASSIGN",
				}),
			]);
			const mapped = mapEmploymentCalendar(
				employmentCalendarAssignmentFromSql(
					requirePersistenceRow(rows[0]) as EmploymentCalendarAssignmentSqlRow,
				),
			);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to assign employment calendar",
			);
		}
	},

	async endEmploymentCalendarAssignment(input, _ports) {
		try {
			const rows = await afendaDatabase.client
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
			const existing = mapEmploymentCalendar(requirePersistenceRow(rows[0]));
			if (!existing.ok) {
				return existing;
			}
			const versionCheck = assertExpectedVersion(
				existing.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (existing.data.effectiveTo !== null) {
				return invalidState("Employment calendar assignment is already ended");
			}
			if (input.effectiveTo < existing.data.effectiveFrom) {
				return invalidState("effectiveTo must be on or after effectiveFrom");
			}
			const updatedAt = new Date();
			const [transactionRows] = await runTimeTransaction((sqlTag) => [
				sqlTag`
					UPDATE hr_employment_calendar_assignment
					SET effective_to = ${input.effectiveTo}, version = ${existing.data.version + 1},
						updated_by = ${input.actorUserId}, updated_at = ${updatedAt}
					WHERE organization_id = ${input.organizationId} AND id = ${input.assignmentId}
						AND version = ${input.expectedVersion}
					RETURNING *
				`,
				sqlTag`
					SELECT 1 / COUNT(*) AS mutation_guard
					FROM hr_employment_calendar_assignment
					WHERE organization_id = ${input.organizationId} AND id = ${input.assignmentId}
						AND version = ${existing.data.version + 1} AND updated_at = ${updatedAt}
				`,
				buildTimeAuditInsert(sqlTag, {
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId: input.correlationId,
					entity: "hr_employment_calendar_assignment",
					entityId: input.assignmentId,
					action: "UPDATE",
					reasonCode: "EMPLOYMENT_CALENDAR_ASSIGNMENT_END",
				}),
			]);
			const row = transactionRows[0] as
				| EmploymentCalendarAssignmentSqlRow
				| undefined;
			if (!row) {
				return notFound("Employment calendar assignment not found");
			}
			const mapped = mapEmploymentCalendar(
				employmentCalendarAssignmentFromSql(row),
			);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to end employment calendar assignment",
			);
		}
	},

	async listWorkCalendarScopeAssignments(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrWorkCalendarScopeAssignment)
				.where(
					and(
						eq(
							hrWorkCalendarScopeAssignment.organizationId,
							input.organizationId,
						),
						lte(hrWorkCalendarScopeAssignment.effectiveFrom, input.asOf),
						or(
							isNull(hrWorkCalendarScopeAssignment.effectiveTo),
							gte(hrWorkCalendarScopeAssignment.effectiveTo, input.asOf),
						),
					),
				);
			const mapped: WorkCalendarScopeAssignment[] = [];
			for (const row of rows) {
				const item = mapWorkCalendarScopeAssignment(row);
				if (!item.ok) {
					return item;
				}
				mapped.push(item.data);
			}
			return errorResult.ok(mapped);
		} catch (error) {
			if (
				isPostgresUndefinedTable(error, "hr_work_calendar_scope_assignment")
			) {
				return errorResult.ok([]);
			}
			return mapPersistenceFailure(
				error,
				"Failed to list work calendar scope assignments",
			);
		}
	},

	async assignWorkCalendarScope(input, _ports) {
		try {
			const calendar = await this.getWorkCalendar({
				organizationId: input.organizationId,
				calendarId: input.calendarId,
			});
			if (!calendar.ok) {
				return calendar;
			}
			if (calendar.data === null) {
				return notFound("Work calendar not found");
			}

			const overlapRows = await afendaDatabase.client
				.select({ id: hrWorkCalendarScopeAssignment.id })
				.from(hrWorkCalendarScopeAssignment)
				.where(
					and(
						eq(
							hrWorkCalendarScopeAssignment.organizationId,
							input.organizationId,
						),
						eq(hrWorkCalendarScopeAssignment.scopeType, input.scopeType),
						eq(hrWorkCalendarScopeAssignment.scopeKey, input.scopeKey),
						lte(
							hrWorkCalendarScopeAssignment.effectiveFrom,
							input.effectiveTo ?? "9999-12-31",
						),
						or(
							isNull(hrWorkCalendarScopeAssignment.effectiveTo),
							gte(
								hrWorkCalendarScopeAssignment.effectiveTo,
								input.effectiveFrom,
							),
						),
					),
				)
				.limit(1);
			if (overlapRows.length > 0) {
				return conflict("Work calendar scope assignment overlaps");
			}

			const id = randomUUID();
			const [rows] = await runTimeTransaction((sqlTag) => [
				sqlTag`
					INSERT INTO hr_work_calendar_scope_assignment (
						id, organization_id, scope_type, scope_key, calendar_id,
						effective_from, effective_to, version, created_by, updated_by
					) VALUES (
						${id}, ${input.organizationId}, ${input.scopeType}, ${input.scopeKey},
						${input.calendarId}, ${input.effectiveFrom}, ${input.effectiveTo}, 1,
						${input.createdBy}, ${input.createdBy}
					)
					RETURNING *
				`,
				buildTimeAuditInsert(sqlTag, {
					organizationId: input.organizationId,
					actorUserId: input.createdBy,
					correlationId: input.correlationId,
					entity: "hr_work_calendar_scope_assignment",
					entityId: id,
					action: "CREATE",
					reasonCode: "WORK_CALENDAR_SCOPE_ASSIGN",
				}),
			]);
			const mapped = mapWorkCalendarScopeAssignment(
				workCalendarScopeAssignmentFromSql(
					requirePersistenceRow(rows[0]) as WorkCalendarScopeAssignmentSqlRow,
				),
			);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to assign work calendar scope",
			);
		}
	},

	async endWorkCalendarScopeAssignment(input, _ports) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrWorkCalendarScopeAssignment)
				.where(
					and(
						eq(
							hrWorkCalendarScopeAssignment.organizationId,
							input.organizationId,
						),
						eq(hrWorkCalendarScopeAssignment.id, input.assignmentId),
					),
				)
				.limit(1);
			if (rows.length === 0) {
				return notFound("Work calendar scope assignment not found");
			}
			const existing = mapWorkCalendarScopeAssignment(
				requirePersistenceRow(rows[0]),
			);
			if (!existing.ok) {
				return existing;
			}
			const versionCheck = assertExpectedVersion(
				existing.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (existing.data.effectiveTo !== null) {
				return invalidState("Work calendar scope assignment is already ended");
			}
			if (input.effectiveTo < existing.data.effectiveFrom) {
				return invalidState("effectiveTo must be on or after effectiveFrom");
			}
			const updatedAt = new Date();
			const [transactionRows] = await runTimeTransaction((sqlTag) => [
				sqlTag`
					UPDATE hr_work_calendar_scope_assignment
					SET effective_to = ${input.effectiveTo}, version = ${existing.data.version + 1},
						updated_by = ${input.actorUserId}, updated_at = ${updatedAt}
					WHERE organization_id = ${input.organizationId} AND id = ${input.assignmentId}
						AND version = ${input.expectedVersion}
					RETURNING *
				`,
				sqlTag`
					SELECT 1 / COUNT(*) AS mutation_guard
					FROM hr_work_calendar_scope_assignment
					WHERE organization_id = ${input.organizationId} AND id = ${input.assignmentId}
						AND version = ${existing.data.version + 1} AND updated_at = ${updatedAt}
				`,
				buildTimeAuditInsert(sqlTag, {
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId: input.correlationId,
					entity: "hr_work_calendar_scope_assignment",
					entityId: input.assignmentId,
					action: "UPDATE",
					reasonCode: "WORK_CALENDAR_SCOPE_ASSIGNMENT_END",
				}),
			]);
			const row = transactionRows[0] as
				| WorkCalendarScopeAssignmentSqlRow
				| undefined;
			if (!row) {
				return notFound("Work calendar scope assignment not found");
			}
			const mapped = mapWorkCalendarScopeAssignment(
				workCalendarScopeAssignmentFromSql(row),
			);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to end work calendar scope assignment",
			);
		}
	},

	async resolveEmploymentCalendar(input) {
		try {
			const rows = await afendaDatabase.client
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
			const [match] = rows
				.filter(
					(row) => row.effectiveTo === null || row.effectiveTo >= input.asOf,
				)
				.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
			if (!match) {
				return errorResult.ok(null);
			}
			const assignedCalendarRows = await afendaDatabase.client
				.select()
				.from(hrWorkCalendar)
				.where(
					and(
						eq(hrWorkCalendar.organizationId, input.organizationId),
						eq(hrWorkCalendar.id, match.calendarId),
					),
				)
				.limit(1);
			if (assignedCalendarRows.length === 0) {
				return errorResult.ok(null);
			}
			const assignedCalendar = requirePersistenceRow(assignedCalendarRows[0]);
			const calendarFamily = await afendaDatabase.client
				.select()
				.from(hrWorkCalendar)
				.where(
					and(
						eq(hrWorkCalendar.organizationId, input.organizationId),
						eq(hrWorkCalendar.code, assignedCalendar.code),
					),
				);
			const effectiveCalendar = selectEffectiveLineageRecord({
				assignedId: assignedCalendar.id,
				records: calendarFamily,
				asOf: input.asOf,
				getPredecessorId: (calendar) => calendar.supersedesCalendarId,
				isEligible: (calendar) =>
					calendar.status === "active" || calendar.status === "superseded",
			});
			if (effectiveCalendar === null) {
				return errorResult.ok(null);
			}
			return mapEmploymentCalendar({
				...match,
				calendarId: effectiveCalendar.id,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to resolve employment calendar",
			);
		}
	},

	async findTimePolicyByIdempotencyKey(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrTimePolicy)
				.where(
					and(
						eq(hrTimePolicy.organizationId, input.organizationId),
						eq(hrTimePolicy.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			if (rows.length === 0) {
				return errorResult.ok(null);
			}
			const sourceRow = requirePersistenceRow(rows[0]);
			const policy = mapTimePolicy(sourceRow);
			if (!policy.ok) {
				return policy;
			}
			return errorResult.ok({
				policy: policy.data,
				createRequestFingerprint: sourceRow.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find time policy");
		}
	},

	async createTimePolicy(input: TimePolicyCreateRecord, _ports) {
		try {
			const id = randomUUID();
			const approvalStepsJson = JSON.stringify([...input.approvalSteps]);
			const [rows] = await runTimeTransaction((sqlTag) => [
				sqlTag`
					INSERT INTO hr_time_policy (
						id, organization_id, code, name, status, effective_from, effective_to,
						minimum_rest_minutes, automatic_break_after_minutes,
						automatic_break_minutes, approval_steps, supersedes_policy_id,
						version, create_idempotency_key, create_request_fingerprint,
						created_by, updated_by
					) VALUES (
						${id}, ${input.organizationId}, ${input.code}, ${input.name}, 'draft',
						${input.effectiveFrom}, ${input.effectiveTo}, ${input.minimumRestMinutes},
						${input.automaticBreakAfterMinutes}, ${input.automaticBreakMinutes},
						${approvalStepsJson}::jsonb, NULL, 1, ${input.idempotencyKey},
						${input.createRequestFingerprint}, ${input.createdBy}, ${input.createdBy}
					)
					RETURNING *
				`,
				buildTimeAuditInsert(sqlTag, {
					organizationId: input.organizationId,
					actorUserId: input.createdBy,
					correlationId: input.correlationId,
					entity: "hr_time_policy",
					entityId: id,
					action: "CREATE",
					reasonCode: "TIME_POLICY_CREATE",
				}),
			]);
			const mapped = mapTimePolicy(
				timePolicyFromSql(requirePersistenceRow(rows[0]) as TimePolicySqlRow),
			);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				return conflict("Time policy code or idempotency key already exists");
			}
			return mapPersistenceFailure(error, "Failed to create time policy");
		}
	},

	async supersedeTimePolicy(input, _ports) {
		try {
			const predecessor = await this.getTimePolicy({
				organizationId: input.organizationId,
				policyId: input.policyId,
			});
			if (!predecessor.ok) {
				return predecessor;
			}
			if (predecessor.data === null) {
				return notFound("Time policy not found");
			}
			const predecessorPolicy = predecessor.data;
			const versionCheck = assertExpectedVersion(
				predecessorPolicy.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (predecessorPolicy.status !== "active") {
				return invalidState("Only active time policies can be superseded");
			}
			const now = new Date();
			const successorId = randomUUID();
			const approvalStepsJson = JSON.stringify([...input.approvalSteps]);
			const [supersedeRows] = await runTimeTransaction((sqlTag) => [
				sqlTag`
					WITH superseded AS (
						UPDATE hr_time_policy
						SET status = 'superseded',
							effective_to = ${input.predecessorEffectiveTo},
							version = ${predecessorPolicy.version + 1},
							updated_by = ${input.createdBy},
							updated_at = ${now}
						WHERE organization_id = ${input.organizationId}
							AND id = ${input.policyId}
							AND version = ${input.expectedVersion}
						RETURNING *
					),
					successor AS (
						INSERT INTO hr_time_policy (
							id, organization_id, code, name, status, effective_from,
							effective_to, minimum_rest_minutes, automatic_break_after_minutes,
							automatic_break_minutes, approval_steps, supersedes_policy_id,
							version, create_idempotency_key, create_request_fingerprint,
							created_by, updated_by, created_at, updated_at
						)
						SELECT
							${successorId}, ${input.organizationId}, ${input.code}, ${input.name},
							'active', ${input.effectiveFrom}, ${input.effectiveTo},
							${input.minimumRestMinutes}, ${input.automaticBreakAfterMinutes},
							${input.automaticBreakMinutes}, ${approvalStepsJson}::jsonb,
							${input.policyId}, 1, ${input.idempotencyKey},
							${input.createRequestFingerprint}, ${input.createdBy},
							${input.createdBy}, ${now}, ${now}
						WHERE EXISTS (SELECT 1 FROM superseded)
						RETURNING *
					)
					SELECT 'superseded'::text AS row_kind, superseded.*
					FROM superseded
					UNION ALL
					SELECT 'successor'::text AS row_kind, successor.*
					FROM successor
				`,
				sqlTag`
					SELECT 1 / COUNT(*) AS mutation_guard FROM hr_time_policy
					WHERE organization_id = ${input.organizationId} AND id = ${successorId}
						AND supersedes_policy_id = ${input.policyId}
				`,
				buildTimeAuditInsert(sqlTag, {
					organizationId: input.organizationId,
					actorUserId: input.createdBy,
					correlationId: input.correlationId,
					entity: "hr_time_policy",
					entityId: successorId,
					action: "CREATE",
					reasonCode: "TIME_POLICY_SUPERSEDE",
				}),
			]);
			const supersededSql = supersedeRows.find(
				(row: TimePolicySqlRow & { row_kind: string }) =>
					row.row_kind === "superseded",
			);
			const successorSql = supersedeRows.find(
				(row: TimePolicySqlRow & { row_kind: string }) =>
					row.row_kind === "successor",
			);
			if (supersededSql === undefined || successorSql === undefined) {
				throw new Error("Concurrent time policy supersession");
			}
			const rows = {
				supersededRow: timePolicyFromSql(supersededSql),
				successorRow: timePolicyFromSql(successorSql),
			};
			const superseded = mapTimePolicy(rows.supersededRow);
			if (!superseded.ok) {
				return superseded;
			}
			const successor = mapTimePolicy(rows.successorRow);
			if (!successor.ok) {
				return successor;
			}
			return errorResult.ok({
				superseded: superseded.data,
				successor: successor.data,
			});
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				return conflict(
					"Time policy version or idempotency key already exists",
				);
			}
			return mapPersistenceFailure(error, "Failed to supersede time policy");
		}
	},

	async activateTimePolicy(input, _ports) {
		try {
			const existing = await this.getTimePolicy({
				organizationId: input.organizationId,
				policyId: input.policyId,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data === null) {
				return notFound("Time policy not found");
			}
			const policy = existing.data;
			const versionCheck = assertExpectedVersion(
				policy.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (policy.status !== "draft") {
				return invalidState("Only draft time policies can be activated");
			}
			const updatedAt = new Date();
			const [rows] = await runTimeTransaction((sqlTag) => [
				sqlTag`
					UPDATE hr_time_policy SET status = 'active', version = ${policy.version + 1},
						updated_by = ${input.actorUserId}, updated_at = ${updatedAt}
					WHERE organization_id = ${input.organizationId} AND id = ${input.policyId}
						AND version = ${input.expectedVersion} AND status = 'draft'
					RETURNING *
				`,
				sqlTag`
					SELECT 1 / COUNT(*) AS mutation_guard FROM hr_time_policy
					WHERE organization_id = ${input.organizationId} AND id = ${input.policyId}
						AND version = ${policy.version + 1} AND updated_at = ${updatedAt}
				`,
				buildTimeAuditInsert(sqlTag, {
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId: input.correlationId,
					entity: "hr_time_policy",
					entityId: input.policyId,
					action: "UPDATE",
					reasonCode: "TIME_POLICY_ACTIVATE",
				}),
			]);
			const row = rows[0] as TimePolicySqlRow | undefined;
			if (!row) {
				return notFound("Time policy not found");
			}
			const mapped = mapTimePolicy(timePolicyFromSql(row));
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to activate time policy");
		}
	},

	async assignTimePolicy(input, _ports) {
		try {
			const policy = await this.getTimePolicy({
				organizationId: input.organizationId,
				policyId: input.policyId,
			});
			if (!policy.ok) {
				return policy;
			}
			if (policy.data === null || policy.data.status !== "active") {
				return invalidState("Active time policy not found");
			}
			const employmentRows = await afendaDatabase.client
				.select({ id: hrEmployment.id })
				.from(hrEmployment)
				.where(
					and(
						eq(hrEmployment.organizationId, input.organizationId),
						eq(hrEmployment.id, input.employmentId),
					),
				)
				.limit(1);
			if (employmentRows.length === 0) {
				return notFound("Employment not found");
			}
			const now = new Date();
			const assignmentId = randomUUID();
			const auditId = randomUUID();
			const preparedAudit = prepareTimeAudit({
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_time_policy_assignment",
				entityId: assignmentId,
				action: "CREATE",
				reasonCode: "TIME_POLICY_ASSIGN",
			});
			if (!preparedAudit.ok) {
				return preparedAudit;
			}
			const auditEntry = preparedAudit.data;
			const [[insertionRow]] = await runTimeTransaction((sqlTag) => [
				sqlTag`
					WITH locked AS (
						SELECT pg_advisory_xact_lock(
							hashtext(${input.organizationId}),
							hashtext(${input.employmentId})
						)
					),
					overlap AS (
						SELECT EXISTS (
							SELECT 1
							FROM hr_time_policy_assignment
							WHERE organization_id = ${input.organizationId}
								AND employment_id = ${input.employmentId}
								AND effective_from <= COALESCE(
									${input.effectiveTo}::date,
									DATE '9999-12-31'
								)
								AND COALESCE(effective_to, DATE '9999-12-31') >= ${input.effectiveFrom}::date
						) AS found
						FROM locked
					),
					inserted AS (
						INSERT INTO hr_time_policy_assignment (
							id, organization_id, policy_id, employment_id,
							effective_from, effective_to, version,
							created_by, updated_by, created_at, updated_at
						)
						SELECT
							${assignmentId}, ${input.organizationId}, ${input.policyId},
							${input.employmentId}, ${input.effectiveFrom}, ${input.effectiveTo},
							1, ${input.actorUserId}, ${input.actorUserId}, ${now}, ${now}
						WHERE NOT (SELECT found FROM overlap)
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT ${auditId}, ${auditEntry.organizationId}, ${auditEntry.actorUserId},
							${auditEntry.correlationId}, ${auditEntry.module}, ${auditEntry.entity},
							inserted.id, ${auditEntry.action}, ${auditEntry.changesJson}::jsonb,
							${auditEntry.oldValueJson}::jsonb, ${auditEntry.newValueJson}::jsonb,
							${auditEntry.metadataJson}::jsonb, ${auditEntry.ipAddress},
							${auditEntry.userAgent}
						FROM inserted RETURNING id
					)
					SELECT
						(SELECT found FROM overlap) AS overlap,
						(SELECT row_to_json(inserted.*) FROM inserted) AS row
				`,
			]);
			if (insertionRow.overlap) {
				return conflict("Time policy assignment overlaps an existing period");
			}
			if (insertionRow.row === null) {
				throw new Error("Time policy assignment insert returned no row");
			}
			const mapped = mapTimePolicyAssignment(
				timePolicyAssignmentFromSql(insertionRow.row),
			);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to assign time policy");
		}
	},

	async getTimePolicy(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrTimePolicy)
				.where(
					and(
						eq(hrTimePolicy.organizationId, input.organizationId),
						eq(hrTimePolicy.id, input.policyId),
					),
				)
				.limit(1);
			if (rows.length === 0) {
				return errorResult.ok(null);
			}
			return mapTimePolicy(requirePersistenceRow(rows[0]));
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to get time policy");
		}
	},

	async resolveTimePolicy(input) {
		try {
			const assignments = await afendaDatabase.client
				.select()
				.from(hrTimePolicyAssignment)
				.where(
					and(
						eq(hrTimePolicyAssignment.organizationId, input.organizationId),
						eq(hrTimePolicyAssignment.employmentId, input.employmentId),
						lte(hrTimePolicyAssignment.effectiveFrom, input.asOf),
					),
				);
			const [assignment] = assignments
				.filter(
					(candidate) =>
						candidate.effectiveTo === null ||
						candidate.effectiveTo >= input.asOf,
				)
				.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
			if (assignment === undefined) {
				return errorResult.ok(null);
			}
			const policyId = parseHumanResourcesTimePolicyId(assignment.policyId);
			if (!policyId.ok) {
				return policyId;
			}
			const assignedPolicy = await this.getTimePolicy({
				organizationId: input.organizationId,
				policyId: policyId.data,
			});
			if (!assignedPolicy.ok) {
				return assignedPolicy;
			}
			if (assignedPolicy.data === null) {
				return errorResult.ok(null);
			}
			const policies = await afendaDatabase.client
				.select()
				.from(hrTimePolicy)
				.where(
					and(
						eq(hrTimePolicy.organizationId, input.organizationId),
						eq(hrTimePolicy.code, assignedPolicy.data.code),
					),
				);
			const policy = selectEffectiveLineageRecord({
				assignedId: assignedPolicy.data.id,
				records: policies,
				asOf: input.asOf,
				getPredecessorId: (candidate) => candidate.supersedesPolicyId,
				isEligible: (candidate) =>
					candidate.status === "active" || candidate.status === "superseded",
			});
			return policy === null ? errorResult.ok(null) : mapTimePolicy(policy);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to resolve time policy");
		}
	},

	async assignTimeApprovalAuthority(input, _ports) {
		try {
			const now = new Date();
			const assignmentId = randomUUID();
			const auditId = randomUUID();
			const preparedAudit = prepareTimeAudit({
				organizationId: input.organizationId,
				actorUserId: input.createdBy,
				correlationId: input.correlationId,
				entity: "hr_time_approval_authority_assignment",
				entityId: assignmentId,
				action: "CREATE",
				reasonCode: "TIME_APPROVAL_AUTHORITY_ASSIGN",
			});
			if (!preparedAudit.ok) {
				return preparedAudit;
			}
			const auditEntry = preparedAudit.data;
			const lockKey = `${input.targetActorUserId}:${input.authority}`;
			const [[insertionRow]] = await runTimeTransaction((sqlTag) => [
				sqlTag`
					WITH locked AS (
						SELECT pg_advisory_xact_lock(
							hashtext(${input.organizationId}),
							hashtext(${lockKey})
						)
					),
					overlap AS (
						SELECT EXISTS (
							SELECT 1
							FROM hr_time_approval_authority_assignment
							WHERE organization_id = ${input.organizationId}
								AND actor_user_id = ${input.targetActorUserId}
								AND authority = ${input.authority}
								AND effective_from <= COALESCE(
									${input.effectiveTo}::date,
									DATE '9999-12-31'
								)
								AND COALESCE(effective_to, DATE '9999-12-31') >= ${input.effectiveFrom}::date
						) AS found
						FROM locked
					),
					inserted AS (
						INSERT INTO hr_time_approval_authority_assignment (
							id, organization_id, actor_user_id, authority,
							effective_from, effective_to, version,
							created_by, updated_by, created_at, updated_at
						)
						SELECT
							${assignmentId}, ${input.organizationId}, ${input.targetActorUserId},
							${input.authority}, ${input.effectiveFrom}, ${input.effectiveTo},
							1, ${input.createdBy}, ${input.createdBy}, ${now}, ${now}
						WHERE NOT (SELECT found FROM overlap)
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT ${auditId}, ${auditEntry.organizationId}, ${auditEntry.actorUserId},
							${auditEntry.correlationId}, ${auditEntry.module}, ${auditEntry.entity},
							inserted.id, ${auditEntry.action}, ${auditEntry.changesJson}::jsonb,
							${auditEntry.oldValueJson}::jsonb, ${auditEntry.newValueJson}::jsonb,
							${auditEntry.metadataJson}::jsonb, ${auditEntry.ipAddress},
							${auditEntry.userAgent}
						FROM inserted RETURNING id
					)
					SELECT
						(SELECT found FROM overlap) AS overlap,
						(SELECT row_to_json(inserted.*) FROM inserted) AS row
				`,
			]);
			if (insertionRow.overlap) {
				return conflict("Approval authority assignment overlaps");
			}
			if (insertionRow.row === null) {
				throw new Error("Approval authority assignment insert returned no row");
			}
			const mapped = mapTimeApprovalAuthorityAssignment(
				timeApprovalAuthorityAssignmentFromSql(insertionRow.row),
			);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to assign time approval authority",
			);
		}
	},

	async endTimeApprovalAuthorityAssignment(input, _ports) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrTimeApprovalAuthorityAssignment)
				.where(
					and(
						eq(
							hrTimeApprovalAuthorityAssignment.organizationId,
							input.organizationId,
						),
						eq(hrTimeApprovalAuthorityAssignment.id, input.assignmentId),
					),
				)
				.limit(1);
			if (rows.length === 0) {
				return notFound("Approval authority assignment not found");
			}
			const current = mapTimeApprovalAuthorityAssignment(
				requirePersistenceRow(rows[0]),
			);
			if (!current.ok) {
				return current;
			}
			const versionCheck = assertExpectedVersion(
				current.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (input.effectiveTo < current.data.effectiveFrom) {
				return invalidState("effectiveTo must be on or after effectiveFrom");
			}
			const currentAssignment = current.data;
			const updatedAt = new Date();
			const [transactionRows] = await runTimeTransaction((sqlTag) => [
				sqlTag`
					UPDATE hr_time_approval_authority_assignment
					SET effective_to = ${input.effectiveTo}, version = ${currentAssignment.version + 1},
						updated_by = ${input.actorUserId}, updated_at = ${updatedAt}
					WHERE organization_id = ${input.organizationId} AND id = ${input.assignmentId}
						AND version = ${input.expectedVersion}
					RETURNING *
				`,
				sqlTag`
					SELECT 1 / COUNT(*) AS mutation_guard
					FROM hr_time_approval_authority_assignment
					WHERE organization_id = ${input.organizationId} AND id = ${input.assignmentId}
						AND version = ${currentAssignment.version + 1} AND updated_at = ${updatedAt}
				`,
				buildTimeAuditInsert(sqlTag, {
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId: input.correlationId,
					entity: "hr_time_approval_authority_assignment",
					entityId: input.assignmentId,
					action: "UPDATE",
					reasonCode: "TIME_APPROVAL_AUTHORITY_ASSIGNMENT_END",
				}),
			]);
			const row = transactionRows[0] as
				| Parameters<typeof timeApprovalAuthorityAssignmentFromSql>[0]
				| undefined;
			if (row === undefined) {
				return conflict("Approval authority assignment changed concurrently");
			}
			const mapped = mapTimeApprovalAuthorityAssignment(
				timeApprovalAuthorityAssignmentFromSql(row),
			);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to end time approval authority assignment",
			);
		}
	},

	async resolveTimeApprovalAuthority(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrTimeApprovalAuthorityAssignment)
				.where(
					and(
						eq(
							hrTimeApprovalAuthorityAssignment.organizationId,
							input.organizationId,
						),
						eq(
							hrTimeApprovalAuthorityAssignment.actorUserId,
							input.actorUserId,
						),
						eq(hrTimeApprovalAuthorityAssignment.authority, input.authority),
						lte(hrTimeApprovalAuthorityAssignment.effectiveFrom, input.asOf),
						or(
							isNull(hrTimeApprovalAuthorityAssignment.effectiveTo),
							gte(hrTimeApprovalAuthorityAssignment.effectiveTo, input.asOf),
						),
					),
				)
				.orderBy(desc(hrTimeApprovalAuthorityAssignment.effectiveFrom))
				.limit(1);
			return rows.length === 0
				? errorResult.ok(null)
				: mapTimeApprovalAuthorityAssignment(requirePersistenceRow(rows[0]));
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to resolve time approval authority",
			);
		}
	},

	async findShiftByIdempotencyKey(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrShift)
				.where(
					and(
						eq(hrShift.organizationId, input.organizationId),
						eq(hrShift.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			if (rows.length === 0) {
				return errorResult.ok(null);
			}
			const sourceRow = requirePersistenceRow(rows[0]);
			const mapped = mapShift(sourceRow);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok({
				shift: mapped.data,
				createRequestFingerprint: sourceRow.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find shift");
		}
	},

	async createShift(input, _ports) {
		try {
			const id = randomUUID();
			const [rows] = await runTimeTransaction((sqlTag) => [
				sqlTag`
					INSERT INTO hr_shift (
						id, organization_id, code, name, shift_kind, start_local, end_local,
						is_overnight, expected_minutes, grace_early_minutes, grace_late_minutes,
						min_duration_minutes, max_duration_minutes, earliest_clock_in_local,
						latest_clock_out_local, overtime_eligible, timezone, location_key,
						status, effective_from, effective_to, version, create_idempotency_key,
						create_request_fingerprint, created_by, updated_by
					) VALUES (
						${id}, ${input.organizationId}, ${input.code}, ${input.name},
						${input.shiftKind}, ${input.startLocal}, ${input.endLocal},
						${input.isOvernight}, ${input.expectedMinutes}, ${input.graceEarlyMinutes},
						${input.graceLateMinutes}, ${input.minDurationMinutes},
						${input.maxDurationMinutes}, ${input.earliestClockInLocal},
						${input.latestClockOutLocal}, ${input.overtimeEligible}, ${input.timezone},
						${input.locationKey}, 'draft', ${input.effectiveFrom}, ${input.effectiveTo},
						1, ${input.idempotencyKey}, ${input.createRequestFingerprint},
						${input.createdBy}, ${input.createdBy}
					)
					RETURNING *
				`,
				buildTimeAuditInsert(sqlTag, {
					organizationId: input.organizationId,
					actorUserId: input.createdBy,
					correlationId: input.correlationId,
					entity: "hr_shift",
					entityId: id,
					action: "CREATE",
					reasonCode: "SHIFT_CREATE",
				}),
			]);
			const mapped = mapShift(
				shiftFromSql(requirePersistenceRow(rows[0]) as ShiftSqlRow),
			);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findShiftByIdempotencyKey({
					organizationId: input.organizationId,
					idempotencyKey: input.idempotencyKey,
				});
				if (!replay.ok) {
					return replay;
				}
				if (
					replay.data !== null &&
					replay.data.createRequestFingerprint ===
						input.createRequestFingerprint
				) {
					return errorResult.ok(replay.data.shift);
				}
				return conflict("Idempotency key already used with different data");
			}
			return mapPersistenceFailure(error, "Failed to create shift");
		}
	},

	async supersedeShift(
		input: ShiftCreateRecord & {
			shiftId: Shift["id"];
			expectedVersion: number;
			predecessorEffectiveTo: string;
		},
		_ports,
	) {
		try {
			const predecessor = await this.getShift({
				organizationId: input.organizationId,
				shiftId: input.shiftId,
			});
			if (!predecessor.ok) {
				return predecessor;
			}
			if (predecessor.data === null) {
				return notFound("Shift not found");
			}
			const predecessorShift = predecessor.data;
			const versionCheck = assertExpectedVersion(
				predecessorShift.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (predecessorShift.status !== "active") {
				return invalidState("Only active shifts can be superseded");
			}
			const now = new Date();
			const successorId = randomUUID();
			const [supersedeRows] = await runTimeTransaction((sqlTag) => [
				sqlTag`
					WITH locked AS (
						SELECT pg_advisory_xact_lock(
							hashtext(${input.organizationId}),
							hashtext(${input.code})
						)
					),
					superseded AS (
						UPDATE hr_shift
						SET status = 'superseded',
							effective_to = ${input.predecessorEffectiveTo},
							version = ${predecessorShift.version + 1},
							updated_by = ${input.createdBy},
							updated_at = ${now}
						FROM locked
						WHERE organization_id = ${input.organizationId}
							AND id = ${input.shiftId}
							AND status = 'active'
							AND version = ${input.expectedVersion}
						RETURNING *
					),
					successor AS (
						INSERT INTO hr_shift (
							id, organization_id, code, name, shift_kind, start_local, end_local,
							is_overnight, expected_minutes, grace_early_minutes, grace_late_minutes,
							min_duration_minutes, max_duration_minutes, earliest_clock_in_local,
							latest_clock_out_local, overtime_eligible, timezone, location_key,
							status, effective_from, effective_to, supersedes_shift_id, version,
							create_idempotency_key, create_request_fingerprint,
							created_by, updated_by, created_at, updated_at
						)
						SELECT
							${successorId}, ${input.organizationId}, ${input.code}, ${input.name},
							${input.shiftKind}, ${input.startLocal}, ${input.endLocal},
							${input.isOvernight}, ${input.expectedMinutes}, ${input.graceEarlyMinutes},
							${input.graceLateMinutes}, ${input.minDurationMinutes},
							${input.maxDurationMinutes}, ${input.earliestClockInLocal},
							${input.latestClockOutLocal}, ${input.overtimeEligible},
							${input.timezone}, ${input.locationKey}, 'active',
							${input.effectiveFrom}, ${input.effectiveTo}, ${input.shiftId}, 1,
							${input.idempotencyKey}, ${input.createRequestFingerprint},
							${input.createdBy}, ${input.createdBy}, ${now}, ${now}
						WHERE EXISTS (SELECT 1 FROM superseded)
						RETURNING *
					),
					copied_breaks AS (
						INSERT INTO hr_shift_break (
							id, organization_id, shift_id, break_order,
							start_offset_minutes, duration_minutes, is_paid, label,
							created_at, updated_at
						)
						SELECT
							gen_random_uuid(),
							b.organization_id,
							s.id,
							b.break_order,
							b.start_offset_minutes,
							b.duration_minutes,
							b.is_paid,
							b.label,
							${now},
							${now}
						FROM hr_shift_break b
						CROSS JOIN successor s
						WHERE b.organization_id = ${input.organizationId}
							AND b.shift_id = ${input.shiftId}
						RETURNING id
					)
					SELECT 'superseded'::text AS row_kind, superseded.*
					FROM superseded
					UNION ALL
					SELECT 'successor'::text AS row_kind, successor.*
					FROM successor
				`,
				sqlTag`
					SELECT 1 / COUNT(*) AS mutation_guard FROM hr_shift
					WHERE organization_id = ${input.organizationId} AND id = ${successorId}
						AND supersedes_shift_id = ${input.shiftId}
				`,
				buildTimeAuditInsert(sqlTag, {
					organizationId: input.organizationId,
					actorUserId: input.createdBy,
					correlationId: input.correlationId,
					entity: "hr_shift",
					entityId: successorId,
					action: "CREATE",
					reasonCode: "SHIFT_SUPERSEDE",
				}),
			]);
			const supersededSql = supersedeRows.find(
				(row: ShiftSqlRow & { row_kind: string }) =>
					row.row_kind === "superseded",
			);
			const successorSql = supersedeRows.find(
				(row: ShiftSqlRow & { row_kind: string }) =>
					row.row_kind === "successor",
			);
			if (supersededSql === undefined || successorSql === undefined) {
				throw new Error("Concurrent shift supersession");
			}
			const rows = {
				supersededRow: shiftFromSql(supersededSql),
				successorRow: shiftFromSql(successorSql),
			};
			const superseded = mapShift(rows.supersededRow);
			if (!superseded.ok) {
				return superseded;
			}
			const successor = mapShift(rows.successorRow);
			if (!successor.ok) {
				return successor;
			}
			return errorResult.ok({
				superseded: superseded.data,
				successor: successor.data,
			});
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				return conflict("Shift version or idempotency key already exists");
			}
			return mapPersistenceFailure(error, "Failed to supersede shift");
		}
	},

	async updateShift(input, _ports) {
		try {
			const existing = await this.getShift({
				organizationId: input.organizationId,
				shiftId: input.shiftId,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data === null) {
				return notFound("Shift not found");
			}
			const shift = existing.data;
			if (shift.status !== "draft") {
				return invalidState("Only draft shifts can be updated");
			}
			const versionCheck = assertExpectedVersion(
				shift.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const nextShift = resolveShiftUpdate(shift, input);
			const updatedAt = new Date();
			const [rows] = await runTimeTransaction((sqlTag) => [
				sqlTag`
					UPDATE hr_shift SET
						name = ${nextShift.name}, shift_kind = ${nextShift.shiftKind},
						start_local = ${nextShift.startLocal}, end_local = ${nextShift.endLocal},
						is_overnight = ${nextShift.isOvernight},
						expected_minutes = ${nextShift.expectedMinutes},
						grace_early_minutes = ${nextShift.graceEarlyMinutes},
						grace_late_minutes = ${nextShift.graceLateMinutes},
						min_duration_minutes = ${nextShift.minDurationMinutes},
						max_duration_minutes = ${nextShift.maxDurationMinutes},
						earliest_clock_in_local = ${nextShift.earliestClockInLocal},
						latest_clock_out_local = ${nextShift.latestClockOutLocal},
						overtime_eligible = ${nextShift.overtimeEligible},
						timezone = ${nextShift.timezone}, location_key = ${nextShift.locationKey},
						effective_to = ${nextShift.effectiveTo},
						version = ${shift.version + 1}, updated_by = ${input.actorUserId},
						updated_at = ${updatedAt}
					WHERE organization_id = ${input.organizationId} AND id = ${input.shiftId}
						AND version = ${input.expectedVersion} AND status = 'draft'
					RETURNING *
				`,
				sqlTag`
					SELECT 1 / COUNT(*) AS mutation_guard FROM hr_shift
					WHERE organization_id = ${input.organizationId} AND id = ${input.shiftId}
						AND version = ${shift.version + 1} AND updated_at = ${updatedAt}
				`,
				buildTimeAuditInsert(sqlTag, {
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId: input.correlationId,
					entity: "hr_shift",
					entityId: input.shiftId,
					action: "UPDATE",
					reasonCode: "SHIFT_UPDATE",
				}),
			]);
			const row = rows[0] as ShiftSqlRow | undefined;
			if (!row) {
				return notFound("Shift not found");
			}
			const mapped = mapShift(shiftFromSql(row));
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update shift");
		}
	},

	async activateShift(input, ports) {
		return await transitionShiftStatus(this, ports, input, "active");
	},
	async deactivateShift(input, ports) {
		return await transitionShiftStatus(this, ports, input, "inactive");
	},

	async getShift(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrShift)
				.where(
					and(
						eq(hrShift.organizationId, input.organizationId),
						eq(hrShift.id, input.shiftId),
					),
				)
				.limit(1);
			if (rows.length === 0) {
				return errorResult.ok(null);
			}
			return mapShift(requirePersistenceRow(rows[0]));
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
			const rows = await afendaDatabase.client
				.select()
				.from(hrShift)
				.where(and(...conditions))
				.limit(limit)
				.offset(offset);
			const mapped: Shift[] = [];
			for (const row of rows) {
				const item = mapShift(row);
				if (!item.ok) {
					return item;
				}
				mapped.push(item.data);
			}
			return errorResult.ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list shifts");
		}
	},

	async addShiftBreak(input, _ports) {
		try {
			const shift = await this.getShift({
				organizationId: input.organizationId,
				shiftId: input.shiftId,
			});
			if (!shift.ok) {
				return shift;
			}
			if (shift.data === null) {
				return notFound("Shift not found");
			}
			const existingShift = shift.data;
			const id = randomUUID();
			const [rows] = await runTimeTransaction((sqlTag) => [
				sqlTag`
					INSERT INTO hr_shift_break (
						id, organization_id, shift_id, break_order, start_offset_minutes,
						duration_minutes, is_paid, label
					) VALUES (
						${id}, ${input.organizationId}, ${input.shiftId}, ${input.breakOrder},
						${input.startOffsetMinutes}, ${input.durationMinutes}, ${input.isPaid},
						${input.label}
					)
					RETURNING *
				`,
				buildTimeAuditInsert(sqlTag, {
					organizationId: input.organizationId,
					actorUserId: existingShift.updatedBy,
					correlationId: input.correlationId,
					entity: "hr_shift_break",
					entityId: id,
					action: "CREATE",
					reasonCode: "SHIFT_BREAK_ADD",
				}),
			]);
			const mapped = mapShiftBreak(
				shiftBreakFromSql(requirePersistenceRow(rows[0]) as ShiftBreakSqlRow),
			);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to add shift break");
		}
	},

	async removeShiftBreak(input, _ports) {
		try {
			const existing = await afendaDatabase.client
				.select({ id: hrShiftBreak.id })
				.from(hrShiftBreak)
				.where(
					and(
						eq(hrShiftBreak.organizationId, input.organizationId),
						eq(hrShiftBreak.id, input.breakId),
					),
				)
				.limit(1);
			if (existing.length === 0) {
				return notFound("Shift break not found");
			}
			await runTimeTransaction((sqlTag) => [
				sqlTag`
					WITH deleted AS (
						DELETE FROM hr_shift_break
						WHERE organization_id = ${input.organizationId} AND id = ${input.breakId}
						RETURNING id
					)
					SELECT 1 / COUNT(*) AS mutation_guard FROM deleted
				`,
				buildTimeAuditInsert(sqlTag, {
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId: input.correlationId,
					entity: "hr_shift_break",
					entityId: input.breakId,
					action: "DELETE",
					reasonCode: "SHIFT_BREAK_REMOVE",
				}),
			]);
			return errorResult.ok(undefined);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to remove shift break");
		}
	},

	async listShiftBreaks(input) {
		try {
			const rows = await afendaDatabase.client
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
				if (!item.ok) {
					return item;
				}
				mapped.push(item.data);
			}
			return errorResult.ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list shift breaks");
		}
	},

	async findShiftAssignmentByIdempotencyKey(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrShiftAssignment)
				.where(
					and(
						eq(hrShiftAssignment.organizationId, input.organizationId),
						eq(hrShiftAssignment.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			if (rows.length === 0) {
				return errorResult.ok(null);
			}
			const sourceRow = requirePersistenceRow(rows[0]);
			const mapped = mapAssignment(sourceRow);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok({
				assignment: mapped.data,
				createRequestFingerprint: sourceRow.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find shift assignment");
		}
	},

	async assignShift(input, _ports) {
		try {
			const shift = await this.getShift({
				organizationId: input.organizationId,
				shiftId: input.shiftId,
			});
			if (!shift.ok) {
				return shift;
			}
			if (shift.data === null) {
				return notFound("Shift not found");
			}
			if (shift.data.status !== "active") {
				return invalidState("Shift must be active to assign");
			}
			const overlaps = await this.findOverlappingShiftAssignments({
				organizationId: input.organizationId,
				employeeId: input.employeeId,
				startsAt: input.startsAt,
				endsAt: input.endsAt,
			});
			if (!overlaps.ok) {
				return overlaps;
			}
			if (overlaps.data.length > 0) {
				return conflict("Shift assignment overlaps an existing assignment");
			}
			const id = randomUUID();
			const now = new Date();
			const auditId = randomUUID();
			const preparedAudit = prepareTimeAudit({
				organizationId: input.organizationId,
				actorUserId: input.createdBy,
				correlationId: input.correlationId,
				entity: "hr_shift_assignment",
				entityId: id,
				action: "CREATE",
				reasonCode: "SHIFT_ASSIGN",
			});
			if (!preparedAudit.ok) {
				return preparedAudit;
			}
			const auditEntry = preparedAudit.data;
			const segmentOrders = input.segments.map(
				(segment) => segment.segmentOrder,
			);
			const segmentStarts = input.segments.map((segment) => segment.startsAt);
			const segmentEnds = input.segments.map((segment) => segment.endsAt);
			const [[assignmentResult]] = await runTimeTransaction((sqlTag) => [
				sqlTag`
						WITH locked AS (
							SELECT pg_advisory_xact_lock(
								hashtext(${input.organizationId}), hashtext(${input.employeeId})
							)
						),
						overlap AS (
							SELECT EXISTS (
								SELECT 1 FROM hr_shift_assignment
								WHERE organization_id = ${input.organizationId}
									AND employee_id = ${input.employeeId}
									AND starts_at < ${input.endsAt} AND ends_at > ${input.startsAt}
									AND publication_status NOT IN ('cancelled', 'completed')
							) AS found FROM locked
						),
						created AS (
							INSERT INTO hr_shift_assignment (
								id, organization_id, employee_id, employment_id, shift_id,
								scheduled_date, starts_at, ends_at, location_key, timezone,
								publication_status, assignment_source, version,
								create_idempotency_key, create_request_fingerprint,
								created_by, updated_by, created_at, updated_at
							)
							SELECT
								${id}, ${input.organizationId}, ${input.employeeId},
								${input.employmentId}, ${input.shiftId}, ${input.scheduledDate},
								${input.startsAt}, ${input.endsAt}, ${input.locationKey},
								${input.timezone}, 'planned', ${input.assignmentSource}, 1,
								${input.idempotencyKey}, ${input.createRequestFingerprint},
								${input.createdBy}, ${input.createdBy}, ${now}, ${now}
							WHERE NOT (SELECT found FROM overlap)
							RETURNING *
						),
						segments AS (
							INSERT INTO hr_shift_assignment_segment (
								id, organization_id, assignment_id, segment_order,
								starts_at, ends_at, created_at, updated_at
							)
							SELECT
								gen_random_uuid(),
								${input.organizationId},
								created.id,
								seg.segment_order,
								seg.starts_at,
								seg.ends_at,
								${now},
								${now}
							FROM created
							CROSS JOIN unnest(
								${segmentOrders}::int4[],
								${segmentStarts}::timestamptz[],
								${segmentEnds}::timestamptz[]
							) AS seg(segment_order, starts_at, ends_at)
							RETURNING id
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT ${auditId}, ${auditEntry.organizationId}, ${auditEntry.actorUserId},
								${auditEntry.correlationId}, ${auditEntry.module}, ${auditEntry.entity},
								created.id, ${auditEntry.action}, ${auditEntry.changesJson}::jsonb,
								${auditEntry.oldValueJson}::jsonb, ${auditEntry.newValueJson}::jsonb,
								${auditEntry.metadataJson}::jsonb, ${auditEntry.ipAddress},
								${auditEntry.userAgent}
							FROM created RETURNING id
						)
						SELECT (SELECT found FROM overlap) AS overlap,
							(SELECT row_to_json(created.*) FROM created) AS row
					`,
			]);
			if (assignmentResult.overlap) {
				return conflict("Shift assignment overlaps an existing assignment");
			}
			if (assignmentResult.row === null) {
				throw new Error("Shift assignment insert returned no row");
			}
			const mapped = mapAssignment(
				shiftAssignmentFromSql(assignmentResult.row),
			);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findShiftAssignmentByIdempotencyKey({
					organizationId: input.organizationId,
					idempotencyKey: input.idempotencyKey,
				});
				if (!replay.ok) {
					return replay;
				}
				if (
					replay.data !== null &&
					replay.data.createRequestFingerprint ===
						input.createRequestFingerprint
				) {
					return errorResult.ok(replay.data.assignment);
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
		if (!before.ok) {
			return before;
		}
		const previous = before.data;

		const published = await transitionAssignment(
			this,
			ports,
			input,
			"published",
		);
		if (!published.ok) {
			return published;
		}

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
		const [session] = sessions.data;
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
		return await transitionAssignment(this, ports, input, "cancelled");
	},
	async completeShiftAssignment(input, ports) {
		return await transitionAssignment(this, ports, input, "completed");
	},

	async changeShiftAssignment(input, _ports) {
		try {
			const existing = await this.getShiftAssignment({
				organizationId: input.organizationId,
				assignmentId: input.assignmentId,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data === null) {
				return notFound("Shift assignment not found");
			}
			const assignment = existing.data;
			const versionCheck = assertExpectedVersion(
				assignment.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const attendance = await afendaDatabase.client
				.select({ id: hrAttendanceEvent.id })
				.from(hrAttendanceEvent)
				.where(
					and(
						eq(hrAttendanceEvent.organizationId, input.organizationId),
						isNull(hrAttendanceEvent.voidedAt),
						or(
							eq(hrAttendanceEvent.shiftAssignmentId, assignment.id),
							and(
								eq(hrAttendanceEvent.employeeId, assignment.employeeId),
								eq(hrAttendanceEvent.localWorkDate, assignment.scheduledDate),
							),
						),
					),
				)
				.limit(1);
			if (attendance.length > 0) {
				return conflict(
					"Shift assignment cannot be changed after attendance is recorded",
				);
			}
			const transition = assertAssignmentStatusTransition(
				assignment.publicationStatus,
				"changed",
			);
			if (!transition.ok) {
				return transition;
			}
			const startsAt = input.startsAt ?? assignment.startsAt;
			const endsAt = input.endsAt ?? assignment.endsAt;
			const overlaps = await this.findOverlappingShiftAssignments({
				organizationId: input.organizationId,
				employeeId: assignment.employeeId,
				startsAt,
				endsAt,
				excludeAssignmentId: assignment.id,
			});
			if (!overlaps.ok) {
				return overlaps;
			}
			if (overlaps.data.length > 0) {
				return conflict("Shift assignment overlaps an existing assignment");
			}
			const updatedAt = new Date();
			const [rows] = await runTimeTransaction((sqlTag) => [
				sqlTag`
					UPDATE hr_shift_assignment SET
						shift_id = ${input.shiftId ?? assignment.shiftId},
						scheduled_date = ${input.scheduledDate ?? assignment.scheduledDate},
						starts_at = ${startsAt}, ends_at = ${endsAt},
						location_key = ${input.locationKey === undefined ? assignment.locationKey : input.locationKey},
						timezone = ${input.timezone ?? assignment.timezone}, publication_status = 'changed',
						version = ${assignment.version + 1}, updated_by = ${input.actorUserId},
						updated_at = ${updatedAt}
					WHERE organization_id = ${input.organizationId} AND id = ${input.assignmentId}
						AND version = ${input.expectedVersion}
					RETURNING *
				`,
				sqlTag`
					SELECT 1 / COUNT(*) AS mutation_guard FROM hr_shift_assignment
					WHERE organization_id = ${input.organizationId} AND id = ${input.assignmentId}
						AND version = ${assignment.version + 1} AND updated_at = ${updatedAt}
				`,
				buildTimeAuditInsert(sqlTag, {
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId: input.correlationId,
					entity: "hr_shift_assignment",
					entityId: input.assignmentId,
					action: "UPDATE",
					reasonCode: "SHIFT_ASSIGNMENT_CHANGE",
				}),
			]);
			const row = rows[0] as
				| Parameters<typeof shiftAssignmentFromSql>[0]
				| undefined;
			if (!row) {
				return notFound("Shift assignment not found");
			}
			const mapped = mapAssignment(shiftAssignmentFromSql(row));
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to change shift assignment");
		}
	},

	async getShiftAssignment(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrShiftAssignment)
				.where(
					and(
						eq(hrShiftAssignment.organizationId, input.organizationId),
						eq(hrShiftAssignment.id, input.assignmentId),
					),
				)
				.limit(1);
			if (rows.length === 0) {
				return errorResult.ok(null);
			}
			return mapAssignment(requirePersistenceRow(rows[0]));
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
			const rows = await afendaDatabase.client
				.select()
				.from(hrShiftAssignment)
				.where(and(...conditions))
				.limit(limit)
				.offset(offset);
			const mapped: ShiftAssignment[] = [];
			for (const row of rows) {
				const item = mapAssignment(row);
				if (!item.ok) {
					return item;
				}
				mapped.push(item.data);
			}
			return errorResult.ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list shift assignments");
		}
	},

	async listShiftAssignmentSegments(input) {
		try {
			const assignment = await this.getShiftAssignment(input);
			if (!assignment.ok) {
				return assignment;
			}
			if (assignment.data === null) {
				return errorResult.ok([]);
			}
			const rows = await afendaDatabase.client
				.select()
				.from(hrShiftAssignmentSegment)
				.where(
					and(
						eq(hrShiftAssignmentSegment.organizationId, input.organizationId),
						eq(hrShiftAssignmentSegment.assignmentId, input.assignmentId),
					),
				)
				.orderBy(hrShiftAssignmentSegment.segmentOrder);
			const segments: ShiftAssignmentSegment[] = [];
			for (const row of rows) {
				const mapped = mapAssignmentSegment(row);
				if (!mapped.ok) {
					return mapped;
				}
				segments.push(mapped.data);
			}
			return errorResult.ok(segments);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list shift assignment segments",
			);
		}
	},

	async getScheduledShiftForEmployeeDate(input) {
		try {
			const rows = await afendaDatabase.client
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
				if (!item.ok) {
					return item;
				}
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
			return errorResult.ok(mapped[0] ?? null);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to get scheduled shift for employee date",
			);
		}
	},

	async listLocationSchedule(input) {
		return await this.listShiftAssignments({
			organizationId: input.organizationId,
			locationKey: input.locationKey,
			...(input.fromDate === undefined ? {} : { fromDate: input.fromDate }),
			...(input.toDate === undefined ? {} : { toDate: input.toDate }),
			...(input.publicationStatus === undefined
				? {}
				: { publicationStatus: input.publicationStatus }),
			...(input.page === undefined ? {} : { page: input.page }),
			...(input.pageSize === undefined ? {} : { pageSize: input.pageSize }),
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
			const rows = await afendaDatabase.client
				.select()
				.from(hrShiftAssignment)
				.where(and(...conditions));
			const mapped: ShiftAssignment[] = [];
			for (const row of rows) {
				const item = mapAssignment(row);
				if (!item.ok) {
					return item;
				}
				mapped.push(item.data);
			}
			return errorResult.ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find overlapping assignments",
			);
		}
	},

	async findAttendanceEventByIdempotencyKey(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrAttendanceEvent)
				.where(
					and(
						eq(hrAttendanceEvent.organizationId, input.organizationId),
						eq(hrAttendanceEvent.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			if (rows.length === 0) {
				return errorResult.ok(null);
			}
			const sourceRow = requirePersistenceRow(rows[0]);
			const mapped = mapEvent(sourceRow);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok({
				event: mapped.data,
				createRequestFingerprint: sourceRow.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find attendance event");
		}
	},

	async findAttendanceEventBySourceReference(input) {
		try {
			const rows = await afendaDatabase.client
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
			if (rows.length === 0) {
				return errorResult.ok(null);
			}
			const sourceRow = requirePersistenceRow(rows[0]);
			const mapped = mapEvent(sourceRow);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok({
				event: mapped.data,
				createRequestFingerprint: sourceRow.createRequestFingerprint,
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
			const rows = await afendaDatabase.client
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
			if (rows.length === 0) {
				return errorResult.ok(null);
			}
			const sourceRow = requirePersistenceRow(rows[0]);
			const snapshot = sourceRow.resultSnapshot;
			if (
				snapshot === null ||
				typeof snapshot !== "object" ||
				Array.isArray(snapshot)
			) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return errorResult.ok({
				result: snapshot as AttendanceImportResult,
				createRequestFingerprint: sourceRow.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find attendance import batch",
			);
		}
	},

	async importAttendanceEvents(input, ports) {
		try {
			const existingBatch =
				await this.findAttendanceImportBatchByIdempotencyKey({
					organizationId: input.organizationId,
					idempotencyKey: input.idempotencyKey,
				});
			if (!existingBatch.ok) {
				return existingBatch;
			}
			if (existingBatch.data !== null) {
				if (
					existingBatch.data.createRequestFingerprint !==
					input.createRequestFingerprint
				) {
					return conflict("Idempotency key already used with different data");
				}
				return errorResult.ok(existingBatch.data.result);
			}

			const importBatchId = randomUUID();
			const accepted: AttendanceImportAcceptedRow[] = [];
			const skipped: AttendanceImportSkippedRow[] = [];
			const rejected: AttendanceImportRejectedRow[] = [
				...(input.sourceRejectedRows ?? []),
			];
			const now = new Date();
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
			}> = (input.sourceRejectedRows ?? []).map((rejection) => ({
				id: randomUUID(),
				organizationId: input.organizationId,
				importBatchId,
				rowIndex: rejection.rowIndex,
				sourceReference: rejection.sourceReference,
				errorCode: rejection.errorCode,
				errorMessage: rejection.errorMessage,
				payloadChecksum: null,
				createdAt: now,
			}));

			const importOutcome = await runSequential(
				input.events.map((_, rowIndex) => rowIndex),
				// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
				async (rowIndex) => {
					const row = requirePersistenceRow(input.events[rowIndex]);
					const outcomeRowIndex =
						input.sourceRowIndexes?.[rowIndex] ?? rowIndex;
					if (!isValidIanaTimeZone(row.sourceTimezone)) {
						const rejection: AttendanceImportRejectedRow = {
							rowIndex: outcomeRowIndex,
							sourceReference: row.sourceReference,
							errorCode: "INVALID_TIMEZONE",
							errorMessage: "Invalid IANA timezone",
						};
						rejected.push(rejection);
						errorRows.push({
							id: randomUUID(),
							organizationId: input.organizationId,
							importBatchId,
							rowIndex: outcomeRowIndex,
							sourceReference: row.sourceReference,
							errorCode: rejection.errorCode,
							errorMessage: rejection.errorMessage,
							payloadChecksum: row.payloadChecksum ?? null,
							createdAt: now,
						});
						return sequentialContinue();
					}

					const employeeRows = await afendaDatabase.client
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
							rowIndex: outcomeRowIndex,
							sourceReference: row.sourceReference,
							errorCode: "UNKNOWN_EMPLOYEE",
							errorMessage: "Employee not found in organization",
						};
						rejected.push(rejection);
						errorRows.push({
							id: randomUUID(),
							organizationId: input.organizationId,
							importBatchId,
							rowIndex: outcomeRowIndex,
							sourceReference: row.sourceReference,
							errorCode: rejection.errorCode,
							errorMessage: rejection.errorMessage,
							payloadChecksum: row.payloadChecksum ?? null,
							createdAt: now,
						});
						return sequentialContinue();
					}

					const employmentConditions = [
						eq(hrEmployment.organizationId, input.organizationId),
						eq(hrEmployment.employeeId, row.employeeId),
						inArray(hrEmployment.status, ["active", "notice"]),
						lte(hrEmployment.startsOn, row.localWorkDate),
						or(
							isNull(hrEmployment.endsOn),
							gte(hrEmployment.endsOn, row.localWorkDate),
						),
					];
					if (row.employmentId !== null && row.employmentId !== undefined) {
						employmentConditions.push(eq(hrEmployment.id, row.employmentId));
					}
					const employmentRows = await afendaDatabase.client
						.select({ id: hrEmployment.id })
						.from(hrEmployment)
						.where(and(...employmentConditions))
						.limit(1);
					const [employmentRow] = employmentRows;
					if (employmentRow === undefined) {
						const rejection: AttendanceImportRejectedRow = {
							rowIndex: outcomeRowIndex,
							sourceReference: row.sourceReference,
							errorCode: "INVALID_EMPLOYMENT",
							errorMessage: "Active employment not found for attendance event",
						};
						rejected.push(rejection);
						errorRows.push({
							id: randomUUID(),
							organizationId: input.organizationId,
							importBatchId,
							rowIndex: outcomeRowIndex,
							sourceReference: row.sourceReference,
							errorCode: rejection.errorCode,
							errorMessage: rejection.errorMessage,
							payloadChecksum: row.payloadChecksum ?? null,
							createdAt: now,
						});
						return sequentialContinue();
					}
					const employmentId = parseHumanResourcesEmploymentId(
						employmentRow.id,
					);
					if (!employmentId.ok) {
						return sequentialReturn(employmentId);
					}

					const fingerprint = buildImportEventFingerprint({
						employeeId: row.employeeId,
						employmentId: employmentId.data,
						shiftAssignmentId: row.shiftAssignmentId ?? null,
						eventType: row.eventType,
						occurredAtIso: row.occurredAt.toISOString(),
						sourceTimezone: row.sourceTimezone,
						localWorkDate: row.localWorkDate,
						sourceKey: input.sourceKey,
						sourceReference: row.sourceReference,
						payloadChecksum: row.payloadChecksum ?? null,
					});

					const existingByRef = await this.findAttendanceEventBySourceReference(
						{
							organizationId: input.organizationId,
							source: "import",
							sourceReference: row.sourceReference,
						},
					);
					if (!existingByRef.ok) {
						rejected.push({
							rowIndex: outcomeRowIndex,
							sourceReference: row.sourceReference,
							errorCode: "STORE_ERROR",
							errorMessage: ATTENDANCE_IMPORT_LOOKUP_FAILED_MESSAGE,
						});
						return sequentialContinue();
					}
					if (existingByRef.data !== null) {
						if (existingByRef.data.createRequestFingerprint === fingerprint) {
							skipped.push({
								rowIndex: outcomeRowIndex,
								sourceReference: row.sourceReference,
								eventId: existingByRef.data.event.id,
								reason: "already_imported",
							});
						} else {
							const rejection: AttendanceImportRejectedRow = {
								rowIndex: outcomeRowIndex,
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
								rowIndex: outcomeRowIndex,
								sourceReference: row.sourceReference,
								errorCode: rejection.errorCode,
								errorMessage: rejection.errorMessage,
								payloadChecksum: row.payloadChecksum ?? null,
								createdAt: now,
							});
						}
						return sequentialContinue();
					}

					const recorded = await this.recordAttendanceEvent(
						{
							organizationId: input.organizationId,
							employeeId: row.employeeId,
							employmentId: employmentId.data,
							shiftAssignmentId: row.shiftAssignmentId ?? null,
							eventType: row.eventType,
							occurredAt: row.occurredAt,
							sourceSequence: resolveImportRowSourceSequence(row, rowIndex),
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
							rowIndex: outcomeRowIndex,
							sourceReference: row.sourceReference,
							errorCode: recorded.code,
							errorMessage: ATTENDANCE_IMPORT_RECORD_FAILED_MESSAGE,
						};
						rejected.push(rejection);
						errorRows.push({
							id: randomUUID(),
							organizationId: input.organizationId,
							importBatchId,
							rowIndex: outcomeRowIndex,
							sourceReference: row.sourceReference,
							errorCode: rejection.errorCode,
							errorMessage: rejection.errorMessage,
							payloadChecksum: row.payloadChecksum ?? null,
							createdAt: now,
						});
						return sequentialContinue();
					}
					accepted.push({
						rowIndex: outcomeRowIndex,
						sourceReference: row.sourceReference,
						eventId: recorded.data.id,
					});
				},
			);
			if (importOutcome.kind === "return") {
				return importOutcome.value;
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
				...(input.nextCursor === undefined
					? {}
					: { nextCursor: input.nextCursor }),
			};

			try {
				const resultJson = JSON.stringify(result);
				await runTimeTransaction((sqlTag) => {
					const queries = [
						sqlTag`
							INSERT INTO hr_attendance_import_batch (
								id, organization_id, batch_id, source_key, status,
								accepted_count, skipped_count, rejected_count,
								create_idempotency_key, create_request_fingerprint,
								result_snapshot, created_by, created_at, completed_at
							) VALUES (
								${importBatchId}, ${input.organizationId}, ${input.batchId},
								${input.sourceKey}, ${status}, ${accepted.length}, ${skipped.length},
								${rejected.length}, ${input.idempotencyKey},
								${input.createRequestFingerprint}, ${resultJson}::jsonb,
								${input.createdBy}, ${now}, ${now}
							)
							RETURNING id
						`,
					];
					if (errorRows.length > 0) {
						queries.push(sqlTag`
							INSERT INTO hr_attendance_import_error (
								id, organization_id, import_batch_id, row_index, source_reference,
								error_code, error_message, payload_checksum, created_at
							)
							SELECT error_row.id, ${input.organizationId}, ${importBatchId},
								error_row.row_index, error_row.source_reference, error_row.error_code,
								error_row.error_message, error_row.payload_checksum, ${now}
							FROM unnest(
								${errorRows.map((row) => row.id)}::uuid[],
								${errorRows.map((row) => row.rowIndex)}::int4[],
								${errorRows.map((row) => row.sourceReference)}::text[],
								${errorRows.map((row) => row.errorCode)}::text[],
								${errorRows.map((row) => row.errorMessage)}::text[],
								${errorRows.map((row) => row.payloadChecksum)}::text[]
							) AS error_row(
								id, row_index, source_reference, error_code, error_message,
								payload_checksum
							)
							RETURNING id
						`);
					}
					queries.push(
						buildTimeAuditInsert(sqlTag, {
							organizationId: input.organizationId,
							actorUserId: input.createdBy,
							correlationId: input.correlationId,
							entity: "hr_attendance_import_batch",
							entityId: importBatchId,
							action: "CREATE",
							reasonCode: "ATTENDANCE_IMPORT_BATCH_CREATE",
						}),
					);
					return queries;
				});
			} catch (error) {
				if (isCreateIdempotencyUniqueViolation(error)) {
					const replay = await this.findAttendanceImportBatchByIdempotencyKey({
						organizationId: input.organizationId,
						idempotencyKey: input.idempotencyKey,
					});
					if (!replay.ok) {
						return replay;
					}
					if (
						replay.data !== null &&
						replay.data.createRequestFingerprint ===
							input.createRequestFingerprint
					) {
						return errorResult.ok(replay.data.result);
					}
					return conflict("Idempotency key already used with different data");
				}
				return mapPersistenceFailure(error, "Failed to persist import batch");
			}
			return errorResult.ok(result);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to import attendance events");
		}
	},

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async recordAttendanceEvent(input, _ports) {
		try {
			const maxRows = await afendaDatabase.client
				.select({
					maxSequence: sql<number>`COALESCE(MAX(${hrAttendanceEvent.sourceSequence}), -1)`,
				})
				.from(hrAttendanceEvent)
				.where(
					and(
						eq(hrAttendanceEvent.organizationId, input.organizationId),
						eq(hrAttendanceEvent.employeeId, input.employeeId),
						eq(hrAttendanceEvent.localWorkDate, input.localWorkDate),
					),
				);
			const sourceSequence = resolveAttendanceEventSourceSequence({
				existingEvents: maxRows.map((rowValue) => ({
					sourceSequence: rowValue.maxSequence,
				})),
				...(input.sourceSequence === undefined
					? {}
					: { explicit: input.sourceSequence }),
			});
			const id = randomUUID();
			const correlationId =
				input.correlationId ?? `hr-time-hr_attendance_event-${id}`;
			const deviceMetadataJson =
				input.deviceMetadata === undefined || input.deviceMetadata === null
					? null
					: JSON.stringify(input.deviceMetadata);
			const [rows] = await runTimeTransaction((sqlTag) => [
				sqlTag`
					INSERT INTO hr_attendance_event (
						id, organization_id, employee_id, employment_id, shift_assignment_id,
						event_type, captured_occurred_at, occurred_at, source_sequence,
						source_timezone, local_work_date, source, source_reference,
						device_metadata, location_key, captured_notes, notes, payload_checksum,
						voided_at, void_reason, version, create_idempotency_key,
						create_request_fingerprint, created_by, updated_by
					) VALUES (
						${id}, ${input.organizationId}, ${input.employeeId}, ${input.employmentId ?? null},
						${input.shiftAssignmentId ?? null}, ${input.eventType}, ${input.occurredAt},
						${input.occurredAt}, ${sourceSequence}, ${input.sourceTimezone},
						${input.localWorkDate}, ${input.source}, ${input.sourceReference ?? null},
						${deviceMetadataJson}::jsonb, ${input.locationKey ?? null}, ${input.notes ?? null},
						${input.notes ?? null}, ${input.payloadChecksum ?? null}, NULL, NULL, 1,
						${input.idempotencyKey}, ${input.createRequestFingerprint},
						${input.createdBy}, ${input.createdBy}
					)
					RETURNING *
				`,
				buildTimeAuditInsert(sqlTag, {
					organizationId: input.organizationId,
					actorUserId: input.createdBy,
					correlationId,
					entity: "hr_attendance_event",
					entityId: id,
					action: "CREATE",
					reasonCode: "ATTENDANCE_EVENT_RECORD",
				}),
				buildTimeOutboxInsert(sqlTag, {
					eventId: randomUUID(),
					organizationId: input.organizationId,
					actorUserId: input.createdBy,
					correlationId,
					eventType: HUMAN_RESOURCES_TIME_ATTENDANCE_RECORDED_EVENT,
					entityType: "hr_attendance_event",
					entityId: id,
				}),
			]);
			const mapped = mapEvent(
				attendanceEventFromSql(
					requirePersistenceRow(rows[0]) as Parameters<
						typeof attendanceEventFromSql
					>[0],
				),
			);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findAttendanceEventByIdempotencyKey({
					organizationId: input.organizationId,
					idempotencyKey: input.idempotencyKey,
				});
				if (!replay.ok) {
					return replay;
				}
				if (
					replay.data !== null &&
					replay.data.createRequestFingerprint ===
						input.createRequestFingerprint
				) {
					return errorResult.ok(replay.data.event);
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
				if (!replay.ok) {
					return replay;
				}
				if (
					replay.data !== null &&
					replay.data.createRequestFingerprint ===
						input.createRequestFingerprint
				) {
					return errorResult.ok(replay.data.event);
				}
				return conflict("Source reference already used with different data");
			}
			if (isPostgresForeignKeyViolation(error)) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
			}
			return mapPersistenceFailure(error, "Failed to record attendance event");
		}
	},

	async correctAttendanceEvent(input, _ports) {
		const predecessor =
			attendanceCorrectionTails.get(input.eventId) ?? Promise.resolve();
		let release: () => void = () => undefined;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const tail = predecessor.then(() => gate);
		attendanceCorrectionTails.set(input.eventId, tail);
		await predecessor;
		try {
			const existing = await this.getAttendanceEvent({
				organizationId: input.organizationId,
				eventId: input.eventId,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data === null) {
				return notFound("Attendance event not found");
			}
			const current = existing.data;
			if (current.voidedAt !== null) {
				return invalidState("Cannot correct a voided attendance event");
			}
			const versionCheck = assertExpectedVersion(
				current.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const adjustmentId = randomUUID();
			const now = new Date();
			const nextNotes = input.notes === undefined ? current.notes : input.notes;
			const correlationId =
				input.correlationId ?? `hr-time-hr_attendance_event-${current.id}`;
			const [correctionRows] = await runTimeTransaction((sqlTag) => [
				sqlTag`
					WITH corrected AS (
						UPDATE hr_attendance_event
						SET occurred_at = ${input.occurredAt},
							notes = ${nextNotes},
							version = ${current.version + 1},
							updated_by = ${input.actorUserId},
							updated_at = ${now}
						WHERE organization_id = ${input.organizationId}
							AND id = ${input.eventId}
							AND version = ${input.expectedVersion}
						RETURNING *
					),
					adjustment AS (
						INSERT INTO hr_attendance_adjustment (
							id, organization_id, event_id, sequence,
							event_version_before, event_version_after,
							previous_occurred_at, new_occurred_at,
							previous_notes, new_notes, adjustment_reason,
							evidence_reference, actor_user_id, correlation_id, created_at
						)
						SELECT
							${adjustmentId}, ${input.organizationId}, ${input.eventId},
							${current.version}, ${current.version}, ${current.version + 1},
							${current.occurredAt}, ${input.occurredAt},
							${current.notes}, ${nextNotes}, ${input.adjustmentReason},
							${input.evidenceReference ?? null}, ${input.actorUserId},
							${input.correlationId}, ${now}
						FROM corrected
						RETURNING id
					)
					SELECT corrected.*, adjustment.id AS adjustment_id
					FROM corrected, adjustment
				`,
				sqlTag`
					SELECT 1 / COUNT(*) AS mutation_guard FROM hr_attendance_event
					WHERE organization_id = ${input.organizationId} AND id = ${input.eventId}
						AND version = ${current.version + 1} AND updated_at = ${now}
				`,
				buildTimeAuditInsert(sqlTag, {
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId,
					entity: "hr_attendance_event",
					entityId: current.id,
					action: "UPDATE",
					reasonCode: "ATTENDANCE_EVENT_CORRECT",
				}),
				buildTimeOutboxInsert(sqlTag, {
					eventId: randomUUID(),
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId,
					eventType: HUMAN_RESOURCES_TIME_ATTENDANCE_CORRECTED_EVENT,
					entityType: "hr_attendance_event",
					entityId: current.id,
				}),
			]);
			const [correctionRow] = correctionRows;
			if (correctionRow === undefined) {
				throw new Error("Concurrent attendance correction");
			}
			const mapped = mapEvent(attendanceEventFromSql(correctionRow));
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to correct attendance event");
		} finally {
			release();
			if (attendanceCorrectionTails.get(input.eventId) === tail) {
				attendanceCorrectionTails.delete(input.eventId);
			}
		}
	},

	async voidAttendanceEvent(input, _ports) {
		try {
			const existing = await this.getAttendanceEvent({
				organizationId: input.organizationId,
				eventId: input.eventId,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data === null) {
				return notFound("Attendance event not found");
			}
			const attendanceEvent = existing.data;
			const versionCheck = assertExpectedVersion(
				attendanceEvent.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (attendanceEvent.voidedAt !== null) {
				return invalidState("Attendance event is already voided");
			}
			const now = new Date();
			const [rows] = await runTimeTransaction((sqlTag) => [
				sqlTag`
					UPDATE hr_attendance_event
					SET voided_at = ${now}, void_reason = ${input.voidReason},
						version = ${attendanceEvent.version + 1}, updated_by = ${input.actorUserId},
						updated_at = ${now}
					WHERE organization_id = ${input.organizationId} AND id = ${input.eventId}
						AND version = ${input.expectedVersion} AND voided_at IS NULL
					RETURNING *
				`,
				sqlTag`
					SELECT 1 / COUNT(*) AS mutation_guard FROM hr_attendance_event
					WHERE organization_id = ${input.organizationId} AND id = ${input.eventId}
						AND version = ${attendanceEvent.version + 1} AND updated_at = ${now}
				`,
				buildTimeAuditInsert(sqlTag, {
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId: input.correlationId,
					entity: "hr_attendance_event",
					entityId: input.eventId,
					action: "UPDATE",
					reasonCode: "ATTENDANCE_EVENT_VOID",
				}),
			]);
			const row = rows[0] as
				| Parameters<typeof attendanceEventFromSql>[0]
				| undefined;
			if (!row) {
				return notFound("Attendance event not found");
			}
			const mapped = mapEvent(attendanceEventFromSql(row));
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to void attendance event");
		}
	},

	async getAttendanceEvent(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrAttendanceEvent)
				.where(
					and(
						eq(hrAttendanceEvent.organizationId, input.organizationId),
						eq(hrAttendanceEvent.id, input.eventId),
					),
				)
				.limit(1);
			if (rows.length === 0) {
				return errorResult.ok(null);
			}
			return mapEvent(requirePersistenceRow(rows[0]));
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to get attendance event");
		}
	},

	async listAttendanceAdjustments(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrAttendanceAdjustment)
				.where(
					and(
						eq(hrAttendanceAdjustment.organizationId, input.organizationId),
						eq(hrAttendanceAdjustment.eventId, input.eventId),
					),
				)
				.orderBy(
					asc(hrAttendanceAdjustment.sequence),
					asc(hrAttendanceAdjustment.createdAt),
					asc(hrAttendanceAdjustment.id),
				);
			const adjustments: AttendanceAdjustment[] = [];
			for (const row of rows) {
				const mapped = mapAttendanceAdjustment(row);
				if (!mapped.ok) {
					return mapped;
				}
				adjustments.push(mapped.data);
			}
			return errorResult.ok(adjustments);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list attendance adjustments",
			);
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
			const rows = await afendaDatabase.client
				.select()
				.from(hrAttendanceEvent)
				.where(and(...conditions))
				.orderBy(
					asc(hrAttendanceEvent.localWorkDate),
					asc(hrAttendanceEvent.occurredAt),
					asc(hrAttendanceEvent.sourceSequence),
					asc(hrAttendanceEvent.id),
				)
				.limit(limit)
				.offset(offset);
			const mapped: AttendanceEvent[] = [];
			for (const row of rows) {
				const item = mapEvent(row);
				if (!item.ok) {
					return item;
				}
				mapped.push(item.data);
			}
			return errorResult.ok(sortAttendanceEventsForSession(mapped));
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list attendance events");
		}
	},

	async findAttendanceSessionByIdempotencyKey(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrAttendanceSession)
				.where(
					and(
						eq(hrAttendanceSession.organizationId, input.organizationId),
						eq(hrAttendanceSession.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			if (rows.length === 0) {
				return errorResult.ok(null);
			}
			const sourceRow = requirePersistenceRow(rows[0]);
			const mapped = mapSession(sourceRow);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok({
				session: mapped.data,
				createRequestFingerprint: sourceRow.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find attendance session");
		}
	},

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async resolveAttendanceSession(input, ports) {
		try {
			const eventRows = await afendaDatabase.client
				.select()
				.from(hrAttendanceEvent)
				.where(
					and(
						eq(hrAttendanceEvent.organizationId, input.organizationId),
						eq(hrAttendanceEvent.employeeId, input.employeeId),
						eq(hrAttendanceEvent.localWorkDate, input.localWorkDate),
					),
				)
				.orderBy(
					asc(hrAttendanceEvent.occurredAt),
					asc(hrAttendanceEvent.sourceSequence),
					asc(hrAttendanceEvent.id),
				);
			const events: AttendanceEvent[] = [];
			for (const row of eventRows) {
				const mapped = mapEvent(row);
				if (!mapped.ok) {
					return mapped;
				}
				events.push(mapped.data);
			}
			const orderedEvents = filterAttendanceEventsForWorkDay(events, {
				organizationId: input.organizationId,
				employeeId: input.employeeId,
				localWorkDate: input.localWorkDate,
			});
			const resolved = resolveSessionFromEvents(orderedEvents);
			const policyMinutes = applyAutomaticBreakPolicy(
				resolved,
				input.automaticBreakPolicy,
			);

			const existingRows = await afendaDatabase.client
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
				const current = mapSession(requirePersistenceRow(existingRows[0]));
				if (!current.ok) {
					return current;
				}
				const previous = current.data;
				const [row] = await afendaDatabase.client
					.update(hrAttendanceSession)
					.set({
						timezone: input.timezone,
						employmentId: input.employmentId,
						firstClockInAt: resolved.firstClockInAt,
						finalClockOutAt: resolved.finalClockOutAt,
						breakMinutes: policyMinutes.breakMinutes,
						workedMinutes: policyMinutes.workedMinutes,
						grossMinutes: policyMinutes.grossMinutes,
						provenance: policyMinutes.provenance,
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
				const mapped = mapSession(requirePersistenceRow(row));
				if (!mapped.ok) {
					return mapped;
				}
				const recorded = await audit(ports, {
					organizationId: input.organizationId,
					actorUserId: input.createdBy,
					correlationId: input.correlationId,
					entity: "hr_attendance_session",
					entityId: mapped.data.id,
					action: "UPDATE",
				});
				if (!recorded.ok) {
					return recorded;
				}
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
				return errorResult.ok(mapped.data);
			}

			const id = randomUUID();
			const now = new Date();
			const [row] = await afendaDatabase.client
				.insert(hrAttendanceSession)
				.values({
					id,
					organizationId: input.organizationId,
					employeeId: input.employeeId,
					employmentId: input.employmentId,
					shiftAssignmentId: events[0]?.shiftAssignmentId ?? null,
					localWorkDate: input.localWorkDate,
					timezone: input.timezone,
					firstClockInAt: resolved.firstClockInAt,
					finalClockOutAt: resolved.finalClockOutAt,
					breakMinutes: policyMinutes.breakMinutes,
					workedMinutes: policyMinutes.workedMinutes,
					grossMinutes: policyMinutes.grossMinutes,
					provenance: policyMinutes.provenance,
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
			const mapped = mapSession(requirePersistenceRow(row));
			if (!mapped.ok) {
				return mapped;
			}
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.createdBy,
				correlationId: input.correlationId,
				entity: "hr_attendance_session",
				entityId: mapped.data.id,
				action: "CREATE",
			});
			if (!recorded.ok) {
				return recorded;
			}
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
				await afendaDatabase.client
					.delete(hrAttendanceSession)
					.where(
						and(
							eq(hrAttendanceSession.organizationId, input.organizationId),
							eq(hrAttendanceSession.id, mapped.data.id),
						),
					);
				return detected;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findAttendanceSessionByIdempotencyKey({
					organizationId: input.organizationId,
					idempotencyKey: input.idempotencyKey,
				});
				if (!replay.ok) {
					return replay;
				}
				if (
					replay.data !== null &&
					replay.data.createRequestFingerprint ===
						input.createRequestFingerprint
				) {
					return errorResult.ok(replay.data.session);
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
			const rows = await afendaDatabase.client
				.select()
				.from(hrAttendanceSession)
				.where(
					and(
						eq(hrAttendanceSession.organizationId, input.organizationId),
						eq(hrAttendanceSession.id, input.sessionId),
					),
				)
				.limit(1);
			if (rows.length === 0) {
				return errorResult.ok(null);
			}
			return mapSession(requirePersistenceRow(rows[0]));
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to get attendance session");
		}
	},

	async approveAttendanceBreakWaiver(input, _ports) {
		try {
			const sessionResult = await this.getAttendanceSession({
				organizationId: input.organizationId,
				sessionId: input.sessionId,
			});
			if (!sessionResult.ok) {
				return sessionResult;
			}
			if (sessionResult.data === null) {
				return notFound("Attendance session not found");
			}
			const session = sessionResult.data;
			const versionCheck = assertExpectedVersion(
				session.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const { automaticBreak } = session.provenance;
			if (
				automaticBreak === null ||
				!automaticBreak.applied ||
				automaticBreak.policyId !== input.policyId
			) {
				return invalidState(
					"Attendance session has no matching automatic break deduction",
				);
			}
			const asOf = new Date().toISOString().slice(0, 10);
			const authorityRows = await afendaDatabase.client
				.select({ id: hrTimeApprovalAuthorityAssignment.id })
				.from(hrTimeApprovalAuthorityAssignment)
				.where(
					and(
						eq(
							hrTimeApprovalAuthorityAssignment.organizationId,
							input.organizationId,
						),
						eq(
							hrTimeApprovalAuthorityAssignment.id,
							input.authorityAssignmentId,
						),
						eq(
							hrTimeApprovalAuthorityAssignment.actorUserId,
							input.actorUserId,
						),
						eq(hrTimeApprovalAuthorityAssignment.authority, input.authority),
						lte(hrTimeApprovalAuthorityAssignment.effectiveFrom, asOf),
						or(
							isNull(hrTimeApprovalAuthorityAssignment.effectiveTo),
							gte(hrTimeApprovalAuthorityAssignment.effectiveTo, asOf),
						),
					),
				)
				.limit(1);
			if (authorityRows.length === 0) {
				return invalidState("Approval authority assignment is not active");
			}
			const eventRows = await afendaDatabase.client
				.select()
				.from(hrAttendanceEvent)
				.where(
					and(
						eq(hrAttendanceEvent.organizationId, input.organizationId),
						eq(hrAttendanceEvent.employeeId, session.employeeId),
						eq(hrAttendanceEvent.localWorkDate, session.localWorkDate),
					),
				)
				.orderBy(
					asc(hrAttendanceEvent.occurredAt),
					asc(hrAttendanceEvent.sourceSequence),
					asc(hrAttendanceEvent.id),
				);
			const events: AttendanceEvent[] = [];
			for (const row of eventRows) {
				const mapped = mapEvent(row);
				if (!mapped.ok) {
					return mapped;
				}
				events.push(mapped.data);
			}
			const orderedEvents = filterAttendanceEventsForWorkDay(events, {
				organizationId: input.organizationId,
				employeeId: session.employeeId,
				localWorkDate: session.localWorkDate,
			});
			const recordedBreakMinutes =
				resolveSessionFromEvents(orderedEvents).breakMinutes;
			if (recordedBreakMinutes >= automaticBreak.minutes) {
				return invalidState(
					"Recorded breaks already satisfy the automatic break requirement",
				);
			}
			const duplicateRows = await afendaDatabase.client
				.select({ id: hrAttendanceBreakWaiverDecision.id })
				.from(hrAttendanceBreakWaiverDecision)
				.where(
					and(
						eq(
							hrAttendanceBreakWaiverDecision.organizationId,
							input.organizationId,
						),
						eq(hrAttendanceBreakWaiverDecision.sessionId, input.sessionId),
						eq(hrAttendanceBreakWaiverDecision.sessionVersion, session.version),
					),
				)
				.limit(1);
			if (duplicateRows.length > 0) {
				return conflict(
					"Break waiver decision already exists for session version",
				);
			}
			const now = new Date();
			const id = randomUUID();
			const [rows] = await runTimeTransaction((sqlTag) => [
				sqlTag`
					INSERT INTO hr_attendance_break_waiver_decision (
						id, organization_id, session_id, policy_id, authority_assignment_id,
						authority, actor_user_id, reason, evidence_reference,
						automatic_break_minutes, recorded_break_minutes, session_version,
						correlation_id, decided_at, created_at
					) VALUES (
						${id}, ${input.organizationId}, ${input.sessionId}, ${input.policyId},
						${input.authorityAssignmentId}, ${input.authority}, ${input.actorUserId},
						${input.reason}, ${input.evidenceReference}, ${automaticBreak.minutes},
						${recordedBreakMinutes}, ${session.version}, ${input.correlationId},
						${now}, ${now}
					)
					RETURNING *
				`,
				buildTimeAuditInsert(sqlTag, {
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId: input.correlationId,
					entity: "hr_attendance_break_waiver_decision",
					entityId: id,
					action: "CREATE",
					reasonCode: "ATTENDANCE_BREAK_WAIVER_APPROVE",
				}),
			]);
			const mapped = mapAttendanceBreakWaiverDecision(
				attendanceBreakWaiverDecisionFromSql(
					requirePersistenceRow(rows[0]) as Parameters<
						typeof attendanceBreakWaiverDecisionFromSql
					>[0],
				),
			);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return conflict(
					"Break waiver decision already exists for session version",
				);
			}
			return mapPersistenceFailure(
				error,
				"Failed to approve attendance break waiver",
			);
		}
	},

	async listAttendanceBreakWaiverDecisions(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrAttendanceBreakWaiverDecision)
				.where(
					and(
						eq(
							hrAttendanceBreakWaiverDecision.organizationId,
							input.organizationId,
						),
						eq(hrAttendanceBreakWaiverDecision.sessionId, input.sessionId),
					),
				)
				.orderBy(asc(hrAttendanceBreakWaiverDecision.decidedAt));
			const mapped: AttendanceBreakWaiverDecision[] = [];
			for (const row of rows) {
				const decision = mapAttendanceBreakWaiverDecision(row);
				if (!decision.ok) {
					return decision;
				}
				mapped.push(decision.data);
			}
			return errorResult.ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list attendance break waiver decisions",
			);
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
			const rows = await afendaDatabase.client
				.select()
				.from(hrAttendanceSession)
				.where(and(...conditions))
				.limit(limit)
				.offset(offset);
			const mapped: AttendanceSession[] = [];
			for (const row of rows) {
				const item = mapSession(row);
				if (!item.ok) {
					return item;
				}
				mapped.push(item.data);
			}
			return errorResult.ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list attendance sessions");
		}
	},

	async getPreviousCompletedAttendanceSession(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrAttendanceSession)
				.where(
					and(
						eq(hrAttendanceSession.organizationId, input.organizationId),
						eq(hrAttendanceSession.employeeId, input.employeeId),
						ne(hrAttendanceSession.id, input.excludeSessionId),
						lt(hrAttendanceSession.finalClockOutAt, input.before),
					),
				)
				.orderBy(desc(hrAttendanceSession.finalClockOutAt))
				.limit(1);
			if (rows.length === 0) {
				return errorResult.ok(null);
			}
			return mapSession(requirePersistenceRow(rows[0]));
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to get previous completed attendance session",
			);
		}
	},

	async createAttendanceException(input, _ports) {
		try {
			const id = randomUUID();
			const correlationId =
				input.correlationId ?? `hr-time-hr_attendance_exception-${id}`;
			const [rows] = await runTimeTransaction((sqlTag) => [
				sqlTag`
					INSERT INTO hr_attendance_exception (
						id, organization_id, employee_id, session_id, event_id,
						shift_assignment_id, exception_type, severity, detected_facts,
						review_status, resolution, reviewer_user_id, evidence_reference,
						remarks, version, created_by, updated_by
					) VALUES (
						${id}, ${input.organizationId}, ${input.employeeId}, ${input.sessionId},
						${input.eventId}, ${input.shiftAssignmentId}, ${input.exceptionType},
						${input.severity}, NULL, 'open', NULL, NULL, NULL, ${input.remarks},
						1, ${input.createdBy}, ${input.createdBy}
					)
					RETURNING *
				`,
				buildTimeAuditInsert(sqlTag, {
					organizationId: input.organizationId,
					actorUserId: input.createdBy,
					correlationId,
					entity: "hr_attendance_exception",
					entityId: id,
					action: "CREATE",
					reasonCode: "ATTENDANCE_EXCEPTION_CREATE",
				}),
				buildTimeOutboxInsert(sqlTag, {
					eventId: randomUUID(),
					organizationId: input.organizationId,
					actorUserId: input.createdBy,
					correlationId,
					eventType: HUMAN_RESOURCES_TIME_EXCEPTION_CREATED_EVENT,
					entityType: "hr_attendance_exception",
					entityId: id,
				}),
			]);
			const mapped = mapException(
				attendanceExceptionFromSql(
					requirePersistenceRow(rows[0]) as Parameters<
						typeof attendanceExceptionFromSql
					>[0],
				),
			);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to create attendance exception",
			);
		}
	},

	async reviewAttendanceException(input, ports) {
		return await transitionException(this, ports, input, "in_review");
	},
	async excuseAttendanceException(input, ports) {
		return await transitionException(this, ports, input, "excused", {
			resolution: input.resolution,
			...(input.evidenceReference === undefined
				? {}
				: { evidenceReference: input.evidenceReference }),
		});
	},
	async rejectAttendanceException(input, ports) {
		return await transitionException(this, ports, input, "rejected", {
			resolution: input.resolution,
		});
	},
	async resolveAttendanceException(input, ports) {
		return await transitionException(this, ports, input, "resolved", {
			resolution: input.resolution,
		});
	},

	async getAttendanceException(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrAttendanceException)
				.where(
					and(
						eq(hrAttendanceException.organizationId, input.organizationId),
						eq(hrAttendanceException.id, input.exceptionId),
					),
				)
				.limit(1);
			if (rows.length === 0) {
				return errorResult.ok(null);
			}
			return mapException(requirePersistenceRow(rows[0]));
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
			const rows = await afendaDatabase.client
				.select()
				.from(hrAttendanceException)
				.where(and(...conditions))
				.limit(limit)
				.offset(offset);
			const mapped: AttendanceException[] = [];
			for (const row of rows) {
				const item = mapException(row);
				if (!item.ok) {
					return item;
				}
				mapped.push(item.data);
			}
			return errorResult.ok(mapped);
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
			const rows = await afendaDatabase.client
				.select()
				.from(hrAttendanceException)
				.where(and(...conditions))
				.limit(limit)
				.offset(offset);
			const mapped: AttendanceException[] = [];
			for (const row of rows) {
				const item = mapException(row);
				if (!item.ok) {
					return item;
				}
				mapped.push(item.data);
			}
			return errorResult.ok(mapped);
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
			if (!scheduled.ok) {
				return scheduled;
			}
			const sessions = await this.listAttendanceSessions({
				organizationId: input.organizationId,
				employeeId: input.employeeId,
				fromDate: input.localWorkDate,
				toDate: input.localWorkDate,
				page: 1,
				pageSize: 100,
			});
			if (!sessions.ok) {
				return sessions;
			}
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
			if (!events.ok) {
				return events;
			}
			const unresolved = await this.listUnresolvedAttendanceExceptions({
				organizationId: input.organizationId,
				employeeId: input.employeeId,
				page: 1,
				pageSize: 500,
			});
			if (!unresolved.ok) {
				return unresolved;
			}
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
			return errorResult.ok({
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
			const rows = await afendaDatabase.client
				.select()
				.from(hrTimesheet)
				.where(
					and(
						eq(hrTimesheet.organizationId, input.organizationId),
						eq(hrTimesheet.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			if (rows.length === 0) {
				return errorResult.ok(null);
			}
			const sourceRow = requirePersistenceRow(rows[0]);
			const mapped = mapTimesheet(sourceRow);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok({
				timesheet: mapped.data,
				createRequestFingerprint: sourceRow.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find timesheet");
		}
	},

	async createTimesheet(input, ports) {
		try {
			const id = randomUUID();
			const now = new Date();
			const [row] = await afendaDatabase.client
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
			const mapped = mapTimesheet(requirePersistenceRow(row));
			if (!mapped.ok) {
				return mapped;
			}
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.createdBy,
				correlationId: input.correlationId,
				entity: "hr_timesheet",
				entityId: mapped.data.id,
				action: "CREATE",
			});
			if (!recorded.ok) {
				return recorded;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findTimesheetByIdempotencyKey({
					organizationId: input.organizationId,
					idempotencyKey: input.idempotencyKey,
				});
				if (!replay.ok) {
					return replay;
				}
				if (
					replay.data !== null &&
					replay.data.createRequestFingerprint ===
						input.createRequestFingerprint
				) {
					return errorResult.ok(replay.data.timesheet);
				}
				return conflict("Idempotency key already used with different data");
			}
			return mapPersistenceFailure(error, "Failed to create timesheet");
		}
	},

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async generateTimesheetEntries(input, ports, deps: TimesheetGenerationDeps) {
		try {
			const existing = await this.getTimesheet({
				organizationId: input.organizationId,
				timesheetId: input.timesheetId,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data === null) {
				return notFound("Timesheet not found");
			}
			const currentTimesheet = existing.data;
			const versionCheck = assertExpectedVersion(
				currentTimesheet.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (
				currentTimesheet.status !== "draft" &&
				currentTimesheet.status !== "returned"
			) {
				return invalidState("Timesheet is not editable for entry generation");
			}

			const leaveFacts =
				await deps.approvedLeave.listApprovedLeaveForEmployeePeriod({
					organizationId: input.organizationId,
					employeeId: currentTimesheet.employeeId,
					periodStart: currentTimesheet.periodStart,
					periodEnd: currentTimesheet.periodEnd,
				});
			if (!leaveFacts.ok) {
				return leaveFacts;
			}

			const sessions = await this.listAttendanceSessions({
				organizationId: input.organizationId,
				employeeId: currentTimesheet.employeeId,
				fromDate: currentTimesheet.periodStart,
				toDate: currentTimesheet.periodEnd,
				page: 1,
				pageSize: 500,
			});
			if (!sessions.ok) {
				return sessions;
			}
			const currentEntries = await this.listTimesheetEntries({
				organizationId: input.organizationId,
				timesheetId: input.timesheetId,
			});
			if (!currentEntries.ok) {
				return currentEntries;
			}
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
			let totalRecorded = currentTimesheet.totalRecordedMinutes;
			let totalApproved = currentTimesheet.totalApprovedMinutes;
			const resolvedSessions = sessions.data.filter(
				(session) => session.resolutionStatus === "resolved",
			);
			await runSequential(resolvedSessions, async (session) => {
				const entryPlans = buildAttendanceTimesheetEntryPlans(session);
				await runSequential(entryPlans, async (plan) => {
					if (
						plan.workDate < currentTimesheet.periodStart ||
						plan.workDate > currentTimesheet.periodEnd
					) {
						return sequentialContinue();
					}
					if (existingAttendanceRefs.has(plan.sourceReference)) {
						return sequentialContinue();
					}
					const id = randomUUID();
					const now = new Date();
					await afendaDatabase.client.insert(hrTimesheetEntry).values({
						id,
						organizationId: input.organizationId,
						timesheetId: input.timesheetId,
						employeeId: currentTimesheet.employeeId,
						workDate: plan.workDate,
						timezone: session.timezone,
						sourceType: "attendance",
						sourceReference: plan.sourceReference,
						timeType: "regular",
						startedAt: session.firstClockInAt,
						endedAt: session.finalClockOutAt,
						recordedMinutes: plan.recordedMinutes,
						approvedMinutes: plan.approvedMinutes,
						version: 1,
						createdBy: input.actorUserId,
						updatedBy: input.actorUserId,
						createdAt: now,
						updatedAt: now,
					});
					totalRecorded += plan.recordedMinutes;
					totalApproved += plan.approvedMinutes;
					existingAttendanceRefs.add(plan.sourceReference);
				});
			});

			await runSequential(leaveFacts.data, async (fact) => {
				if (existingLeaveRefs.has(fact.segmentId)) {
					return sequentialContinue();
				}
				const mapped = mapApprovedLeaveFactToEntryInput({
					fact,
					timesheet: currentTimesheet,
					actorUserId: input.actorUserId,
					correlationId: input.correlationId,
				});
				const id = randomUUID();
				const now = new Date();
				await afendaDatabase.client.insert(hrTimesheetEntry).values({
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
			});

			const periodEntries = await this.listTimesheetEntries({
				organizationId: input.organizationId,
				timesheetId: input.timesheetId,
			});
			if (!periodEntries.ok) {
				return periodEntries;
			}

			const fullStore = this as HumanResourcesStore;
			let employment = null as Awaited<
				ReturnType<HumanResourcesStore["getEmploymentById"]>
			> extends Result<infer T>
				? T
				: never;
			if (currentTimesheet.employmentId === null) {
				const found = await fullStore.findOpenEmploymentByEmployee({
					organizationId: input.organizationId,
					employeeId: currentTimesheet.employeeId,
				});
				if (!found.ok) {
					return found;
				}
				employment = found.data;
			} else {
				const employmentResult = await fullStore.getEmploymentById({
					organizationId: input.organizationId,
					employmentId: currentTimesheet.employmentId,
				});
				if (!employmentResult.ok) {
					return employmentResult;
				}
				employment = employmentResult.data;
			}

			const existingExceptions = await this.listAttendanceExceptions({
				organizationId: input.organizationId,
				employeeId: currentTimesheet.employeeId,
				page: 1,
				pageSize: 500,
			});
			if (!existingExceptions.ok) {
				return existingExceptions;
			}
			const exceptionBucket = [...existingExceptions.data];

			const sequentialOutcome4 = await runSequential(
				iterDatesInclusive(
					currentTimesheet.periodStart,
					currentTimesheet.periodEnd,
				),
				async (workDate) => {
					const expected = await resolveExpectedWorkMinutes({
						host: this,
						organizationId: input.organizationId,
						employeeId: currentTimesheet.employeeId,
						employmentId:
							currentTimesheet.employmentId ?? employment?.id ?? null,
						workDate,
					});
					if (!expected.ok) {
						return sequentialReturn(expected);
					}

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
						return sequentialContinue();
					}

					if (
						hasExistingTimesheetGenerationAbsence({
							exceptions: exceptionBucket,
							employeeId: currentTimesheet.employeeId,
							workDate,
						})
					) {
						return sequentialContinue();
					}

					const created = await this.createAttendanceException(
						{
							organizationId: input.organizationId,
							employeeId: currentTimesheet.employeeId,
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
								timesheetId: currentTimesheet.id,
							}),
							createdBy: input.actorUserId,
							correlationId: input.correlationId,
						},
						ports,
					);
					if (!created.ok) {
						return sequentialReturn(created);
					}
					exceptionBucket.push(created.data);
				},
			);
			if (sequentialOutcome4.kind === "return") {
				return sequentialOutcome4.value;
			}

			const [row] = await afendaDatabase.client
				.update(hrTimesheet)
				.set({
					totalRecordedMinutes: totalRecorded,
					totalApprovedMinutes: totalApproved,
					version: currentTimesheet.version + 1,
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
			if (!row) {
				return notFound("Timesheet not found");
			}
			const timesheet = mapTimesheet(row);
			if (!timesheet.ok) {
				return timesheet;
			}
			const entries = await this.listTimesheetEntries({
				organizationId: input.organizationId,
				timesheetId: input.timesheetId,
			});
			if (!entries.ok) {
				return entries;
			}
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_timesheet",
				entityId: timesheet.data.id,
				action: "UPDATE",
			});
			if (!recorded.ok) {
				return recorded;
			}
			return errorResult.ok({
				timesheet: timesheet.data,
				entries: entries.data,
			});
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
			if (!timesheet.ok) {
				return timesheet;
			}
			if (timesheet.data === null) {
				return notFound("Timesheet not found");
			}
			if (
				timesheet.data.status !== "draft" &&
				timesheet.data.status !== "returned"
			) {
				return invalidState("Timesheet is not editable");
			}
			const id = randomUUID();
			const now = new Date();
			const [row] = await afendaDatabase.client
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
					costCenterId: input.costCenterId,
					projectId: input.projectId,
					locationId: input.locationId,
					departmentId: input.departmentId,
					approvalReference: input.approvalReference,
					evidenceReference: input.evidenceReference,
					version: 1,
					createdBy: input.createdBy,
					updatedBy: input.createdBy,
					createdAt: now,
					updatedAt: now,
				})
				.returning();
			await afendaDatabase.client
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
			const mapped = mapEntry(requirePersistenceRow(row));
			if (!mapped.ok) {
				return mapped;
			}
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.createdBy,
				correlationId: input.correlationId,
				entity: "hr_timesheet_entry",
				entityId: mapped.data.id,
				action: "CREATE",
			});
			if (!recorded.ok) {
				return recorded;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to add timesheet entry");
		}
	},

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async updateTimesheetEntry(input, ports) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrTimesheetEntry)
				.where(
					and(
						eq(hrTimesheetEntry.organizationId, input.organizationId),
						eq(hrTimesheetEntry.id, input.entryId),
					),
				)
				.limit(1);
			if (rows.length === 0) {
				return notFound("Timesheet entry not found");
			}
			const existing = mapEntry(requirePersistenceRow(rows[0]));
			if (!existing.ok) {
				return existing;
			}
			const versionCheck = assertExpectedVersion(
				existing.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const timesheet = await this.getTimesheet({
				organizationId: input.organizationId,
				timesheetId: existing.data.timesheetId,
			});
			if (!timesheet.ok) {
				return timesheet;
			}
			if (timesheet.data === null) {
				return notFound("Timesheet not found");
			}
			if (
				timesheet.data.status !== "draft" &&
				timesheet.data.status !== "returned"
			) {
				return invalidState("Timesheet is not editable");
			}
			const [row] = await afendaDatabase.client
				.update(hrTimesheetEntry)
				.set({
					workDate: input.workDate ?? existing.data.workDate,
					timeType: input.timeType ?? existing.data.timeType,
					startedAt:
						input.startedAt === undefined
							? existing.data.startedAt
							: input.startedAt,
					endedAt:
						input.endedAt === undefined ? existing.data.endedAt : input.endedAt,
					recordedMinutes:
						input.recordedMinutes ?? existing.data.recordedMinutes,
					approvedMinutes:
						input.approvedMinutes ?? existing.data.approvedMinutes,
					costCenterId:
						input.costCenterId === undefined
							? existing.data.costCenterId
							: input.costCenterId,
					projectId:
						input.projectId === undefined
							? existing.data.projectId
							: input.projectId,
					locationId:
						input.locationId === undefined
							? existing.data.locationId
							: input.locationId,
					departmentId:
						input.departmentId === undefined
							? existing.data.departmentId
							: input.departmentId,
					approvalReference:
						input.approvalReference === undefined
							? existing.data.approvalReference
							: input.approvalReference,
					evidenceReference:
						input.evidenceReference === undefined
							? existing.data.evidenceReference
							: input.evidenceReference,
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
			if (!row) {
				return notFound("Timesheet entry not found");
			}
			await recomputeTimesheetTotals(
				input.organizationId,
				existing.data.timesheetId,
			);
			const mapped = mapEntry(row);
			if (!mapped.ok) {
				return mapped;
			}
			const recordedAudit = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_timesheet_entry",
				entityId: mapped.data.id,
				action: "UPDATE",
			});
			if (!recordedAudit.ok) {
				return recordedAudit;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update timesheet entry");
		}
	},

	async removeTimesheetEntry(input, ports) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrTimesheetEntry)
				.where(
					and(
						eq(hrTimesheetEntry.organizationId, input.organizationId),
						eq(hrTimesheetEntry.id, input.entryId),
					),
				)
				.limit(1);
			if (rows.length === 0) {
				return notFound("Timesheet entry not found");
			}
			const existing = mapEntry(requirePersistenceRow(rows[0]));
			if (!existing.ok) {
				return existing;
			}
			const versionCheck = assertExpectedVersion(
				existing.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const timesheet = await this.getTimesheet({
				organizationId: input.organizationId,
				timesheetId: existing.data.timesheetId,
			});
			if (!timesheet.ok) {
				return timesheet;
			}
			if (timesheet.data === null) {
				return notFound("Timesheet not found");
			}
			if (
				timesheet.data.status !== "draft" &&
				timesheet.data.status !== "returned"
			) {
				return invalidState("Timesheet is not editable");
			}
			await afendaDatabase.client
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
			if (!recordedAudit.ok) {
				return recordedAudit;
			}
			return errorResult.ok(undefined);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to remove timesheet entry");
		}
	},

	async submitTimesheet(input, ports) {
		return await transitionTimesheet(this, ports, input, "submitted", {
			submittedAt: new Date(),
			submissionReference: input.submissionReference,
			approvalPolicyId: input.approvalPolicyId,
			requiredApprovalSteps: [...input.requiredApprovalSteps],
			completedApprovalSteps: 0,
			approvedAt: null,
			approvedBy: null,
		});
	},
	async returnTimesheet(input, ports) {
		return await transitionTimesheet(this, ports, input, "returned", {
			approverNotes: input.approverNotes ?? null,
		});
	},
	async approveTimesheet(input, ports) {
		const existing = await this.getTimesheet({
			organizationId: input.organizationId,
			timesheetId: input.timesheetId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Timesheet not found");
		}
		const current = existing.data;
		const selfCheck = assertNoSelfApprove({
			actorUserId: input.actorUserId,
			createdBy: current.createdBy,
		});
		if (!selfCheck.ok) {
			return selfCheck;
		}
		const versionCheck = assertExpectedVersion(
			current.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		if (current.status !== "submitted") {
			return invalidState("Timesheet must be submitted for approval");
		}
		if (current.submissionReference === null) {
			return invalidState("Timesheet approval snapshot is missing");
		}
		const { submissionReference } = current;
		const expectedAuthority =
			current.requiredApprovalSteps[current.completedApprovalSteps];
		if (expectedAuthority === undefined) {
			return invalidState("Timesheet approval chain is already complete");
		}
		if (expectedAuthority !== input.authority) {
			return invalidState(
				`Approval step requires ${expectedAuthority} authority`,
			);
		}
		const now = new Date();
		const decisionId = randomUUID();
		const completedApprovalSteps = current.completedApprovalSteps + 1;
		const isFinal =
			completedApprovalSteps === current.requiredApprovalSteps.length;
		try {
			const [[approvalRow]] = await runTimeTransaction((sqlTag) => [
				sqlTag`
					WITH updated_timesheet AS (
						UPDATE hr_timesheet
						SET status = ${isFinal ? "approved" : "submitted"},
							completed_approval_steps = ${completedApprovalSteps},
							approved_at = ${isFinal ? now : null},
							approved_by = ${isFinal ? input.actorUserId : null},
							approver_notes = ${input.approverNotes ?? null},
							version = ${current.version + 1},
							updated_by = ${input.actorUserId},
							updated_at = ${now}
						WHERE organization_id = ${input.organizationId}
							AND id = ${input.timesheetId}
							AND status = 'submitted'
							AND version = ${input.expectedVersion}
							AND completed_approval_steps = ${current.completedApprovalSteps}
						RETURNING *
					),
					inserted_decision AS (
						INSERT INTO hr_timesheet_approval_decision (
							id, organization_id, timesheet_id, submission_reference,
							policy_id, authority_assignment_id, step_index, authority,
							actor_user_id, comment, version_approved, correlation_id,
							decided_at, created_at
						)
						SELECT
							${decisionId}, ${input.organizationId}, ${input.timesheetId},
							${submissionReference}, ${current.approvalPolicyId},
							${input.authorityAssignmentId}, ${current.completedApprovalSteps},
							${input.authority}, ${input.actorUserId},
							${input.approverNotes ?? null}, ${current.version},
							${input.correlationId}, ${now}, ${now}
						FROM updated_timesheet
						RETURNING *
					)
					SELECT
						(SELECT row_to_json(updated_timesheet.*) FROM updated_timesheet) AS timesheet,
						(SELECT row_to_json(inserted_decision.*) FROM inserted_decision) AS decision
				`,
			]);
			if (approvalRow.timesheet === null || approvalRow.decision === null) {
				throw new Error("Concurrent timesheet approval");
			}
			const mapped = mapTimesheet(timesheetFromSql(approvalRow.timesheet));
			if (!mapped.ok) {
				return mapped;
			}
			const decision = mapTimesheetApprovalDecision(
				timesheetApprovalDecisionFromSql(approvalRow.decision),
			);
			if (!decision.ok) {
				return decision;
			}
			const compensate = async () => {
				await runTimeTransaction((sqlTag) => [
					sqlTag`
						DELETE FROM hr_timesheet_approval_decision
						WHERE organization_id = ${input.organizationId}
							AND id = ${decision.data.id}
					`,
					sqlTag`
						UPDATE hr_timesheet
						SET status = ${current.status},
							completed_approval_steps = ${current.completedApprovalSteps},
							approved_at = ${current.approvedAt},
							approved_by = ${current.approvedBy},
							approver_notes = ${current.approverNotes},
							version = ${current.version},
							updated_by = ${current.updatedBy},
							updated_at = ${current.updatedAt}
						WHERE organization_id = ${input.organizationId}
							AND id = ${input.timesheetId}
							AND version = ${current.version + 1}
					`,
				]);
			};
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_timesheet_approval_decision",
				entityId: decision.data.id,
				action: "CREATE",
			});
			if (!recorded.ok) {
				await compensate();
				return recorded;
			}
			const event = await emitOutbox(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				eventType: isFinal
					? HUMAN_RESOURCES_TIMESHEET_APPROVED_EVENT
					: HUMAN_RESOURCES_TIME_TIMESHEET_APPROVAL_STEP_RECORDED_EVENT,
				entityType: "hr_timesheet",
				entityId: input.timesheetId,
			});
			if (!event.ok) {
				await compensate();
				const compensationAudit = await audit(ports, {
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId: input.correlationId,
					entity: "hr_timesheet_approval_decision",
					entityId: decision.data.id,
					action: "DELETE",
				});
				if (!compensationAudit.ok) {
					return compensationAudit;
				}
				return event;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return conflict("Timesheet approval step already decided");
			}
			return mapPersistenceFailure(error, "Failed to approve timesheet");
		}
	},
	async listTimesheetApprovalDecisions(input) {
		try {
			const conditions = [
				eq(hrTimesheetApprovalDecision.organizationId, input.organizationId),
				eq(hrTimesheetApprovalDecision.timesheetId, input.timesheetId),
			];
			if (input.submissionReference !== undefined) {
				conditions.push(
					eq(
						hrTimesheetApprovalDecision.submissionReference,
						input.submissionReference,
					),
				);
			}
			const rows = await afendaDatabase.client
				.select()
				.from(hrTimesheetApprovalDecision)
				.where(and(...conditions))
				.orderBy(
					asc(hrTimesheetApprovalDecision.decidedAt),
					asc(hrTimesheetApprovalDecision.stepIndex),
					asc(hrTimesheetApprovalDecision.id),
				);
			const mapped: TimesheetApprovalDecision[] = [];
			for (const row of rows) {
				const item = mapTimesheetApprovalDecision(row);
				if (!item.ok) {
					return item;
				}
				mapped.push(item.data);
			}
			return errorResult.ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list timesheet approval decisions",
			);
		}
	},
	async rejectTimesheet(input, ports) {
		return await transitionTimesheet(this, ports, input, "rejected", {
			rejectionReason: input.rejectionReason,
		});
	},
	async reopenTimesheet(input, ports) {
		return await transitionTimesheet(this, ports, input, "draft", {
			...timesheetReopenSnapshot(),
		});
	},
	async lockTimesheet(input, ports) {
		return await transitionTimesheet(this, ports, input, "locked", {
			lockedAt: new Date(),
		});
	},

	async supersedeTimesheet(input, ports) {
		try {
			const existing = await this.getTimesheet({
				organizationId: input.organizationId,
				timesheetId: input.timesheetId,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data === null) {
				return notFound("Timesheet not found");
			}
			const versionCheck = assertExpectedVersion(
				existing.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const transition = assertTimesheetStatusTransition(
				existing.data.status,
				"superseded",
			);
			if (!transition.ok) {
				return transition;
			}
			await afendaDatabase.client
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
			const rows = await afendaDatabase.client
				.select()
				.from(hrTimesheet)
				.where(
					and(
						eq(hrTimesheet.organizationId, input.organizationId),
						eq(hrTimesheet.id, input.timesheetId),
					),
				)
				.limit(1);
			if (rows.length === 0) {
				return errorResult.ok(null);
			}
			return mapTimesheet(requirePersistenceRow(rows[0]));
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to get timesheet");
		}
	},

	async findTimesheetForEmployeePeriod(input) {
		try {
			const rows = await afendaDatabase.client
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
			if (rows.length === 0) {
				return errorResult.ok(null);
			}
			return mapTimesheet(requirePersistenceRow(rows[0]));
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
			const rows = await afendaDatabase.client
				.select()
				.from(hrTimesheet)
				.where(and(...conditions))
				.limit(limit)
				.offset(offset);
			const mapped: Timesheet[] = [];
			for (const row of rows) {
				const item = mapTimesheet(row);
				if (!item.ok) {
					return item;
				}
				mapped.push(item.data);
			}
			return errorResult.ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list timesheets");
		}
	},

	async listTimesheetEntries(input) {
		try {
			const rows = await afendaDatabase.client
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
				if (!item.ok) {
					return item;
				}
				mapped.push(item.data);
			}
			return errorResult.ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list timesheet entries");
		}
	},

	async getTimesheetTotals(input) {
		try {
			const timesheet = await this.getTimesheet(input);
			if (!timesheet.ok) {
				return timesheet;
			}
			if (timesheet.data === null) {
				return errorResult.ok(null);
			}
			const entries = await this.listTimesheetEntries(input);
			if (!entries.ok) {
				return entries;
			}
			return errorResult.ok({
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
			if (!timesheet.ok) {
				return timesheet;
			}
			if (timesheet.data === null) {
				return errorResult.ok(null);
			}
			if (
				timesheet.data.status !== "approved" &&
				timesheet.data.status !== "locked"
			) {
				return errorResult.ok(null);
			}
			const entries = await this.listTimesheetEntries({
				organizationId: input.organizationId,
				timesheetId: input.timesheetId,
			});
			if (!entries.ok) {
				return entries;
			}
			const {
				nightMinutes,
				overtime,
				paidLeaveMinutes,
				publicHolidayMinutes,
				regularMinutes,
				restDayMinutes,
				unpaidLeaveMinutes,
				unpaidMinutes,
			} = aggregatePayrollMinutes(entries.data);
			const handoff: ApprovedTimeHandoff = {
				organizationId: timesheet.data.organizationId,
				employeeId: timesheet.data.employeeId,
				employmentId: timesheet.data.employmentId,
				periodStart: timesheet.data.periodStart,
				periodEnd: timesheet.data.periodEnd,
				regularMinutes,
				overtime: Array.from(overtime.entries()).map(([type, minutes]) => ({
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
			return errorResult.ok(handoff);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to get approved time handoff",
			);
		}
	},

	async findOvertimeRequestByIdempotencyKey(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrOvertimeRequest)
				.where(
					and(
						eq(hrOvertimeRequest.organizationId, input.organizationId),
						eq(hrOvertimeRequest.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			if (rows.length === 0) {
				return errorResult.ok(null);
			}
			const sourceRow = requirePersistenceRow(rows[0]);
			const mapped = mapOvertime(sourceRow);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok({
				request: mapped.data,
				createRequestFingerprint: sourceRow.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find overtime request");
		}
	},

	async createOvertimeRequest(input, ports) {
		try {
			const id = randomUUID();
			const now = new Date();
			const [row] = await afendaDatabase.client
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
			const mapped = mapOvertime(requirePersistenceRow(row));
			if (!mapped.ok) {
				return mapped;
			}
			const recordedAudit = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.createdBy,
				correlationId: input.correlationId,
				entity: "hr_overtime_request",
				entityId: mapped.data.id,
				action: "CREATE",
			});
			if (!recordedAudit.ok) {
				return recordedAudit;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findOvertimeRequestByIdempotencyKey({
					organizationId: input.organizationId,
					idempotencyKey: input.idempotencyKey,
				});
				if (!replay.ok) {
					return replay;
				}
				if (
					replay.data !== null &&
					replay.data.createRequestFingerprint ===
						input.createRequestFingerprint
				) {
					return errorResult.ok(replay.data.request);
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
			if (!existing.ok) {
				return existing;
			}
			if (existing.data === null) {
				return notFound("Overtime request not found");
			}
			const selfCheck = assertNoSelfApprove({
				actorUserId: input.actorUserId,
				createdBy: existing.data.createdBy,
			});
			if (!selfCheck.ok) {
				return selfCheck;
			}
			const versionCheck = assertExpectedVersion(
				existing.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (existing.data.status === "approved") {
				if (
					existing.data.approvedMaximumMinutes === input.approvedMaximumMinutes
				) {
					return errorResult.ok(existing.data);
				}
				return conflict(
					"Overtime request is already approved with different approved maximum minutes",
				);
			}
			const transition = assertOvertimeStatusTransition(
				existing.data.status,
				"approved",
			);
			if (!transition.ok) {
				return transition;
			}
			const [row] = await afendaDatabase.client
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
			if (!row) {
				return notFound("Overtime request not found");
			}
			await afendaDatabase.client.insert(hrOvertimeApproval).values({
				id: randomUUID(),
				organizationId: input.organizationId,
				overtimeRequestId: input.requestId,
				decision: "approved",
				approvedMaximumMinutes: input.approvedMaximumMinutes,
				actorUserId: input.actorUserId,
				authority: input.authority,
				comment: input.comment ?? null,
				decidedAt: new Date(),
				versionApproved: existing.data.version + 1,
			});
			const mapped = mapOvertime(row);
			if (!mapped.ok) {
				return mapped;
			}
			const correlationId =
				input.correlationId ?? `hr-time-hr_overtime_request-${mapped.data.id}`;
			const recordedAudit = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId,
				entity: "hr_overtime_request",
				entityId: mapped.data.id,
				action: "UPDATE",
			});
			if (!recordedAudit.ok) {
				return recordedAudit;
			}
			const event = await emitOutbox(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId,
				eventType: HUMAN_RESOURCES_TIME_OVERTIME_APPROVED_EVENT,
				entityType: "hr_overtime_request",
				entityId: mapped.data.id,
			});
			if (!event.ok) {
				return event;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to approve overtime request");
		}
	},

	async rejectOvertimeRequest(input, ports) {
		return await transitionOvertime(this, ports, input, "rejected", {
			comment: input.comment,
		});
	},
	async cancelOvertimeRequest(input, ports) {
		return await transitionOvertime(this, ports, input, "cancelled");
	},

	async recordOvertimeActual(input, ports) {
		try {
			const existing = await this.getOvertimeRequest({
				organizationId: input.organizationId,
				requestId: input.requestId,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data === null) {
				return notFound("Overtime request not found");
			}
			const versionCheck = assertExpectedVersion(
				existing.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const transition = assertOvertimeStatusTransition(
				existing.data.status,
				"worked",
			);
			if (!transition.ok) {
				return transition;
			}
			const [row] = await afendaDatabase.client
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
			if (!row) {
				return notFound("Overtime request not found");
			}
			const mapped = mapOvertime(row);
			if (!mapped.ok) {
				return mapped;
			}
			const recordedAudit = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_overtime_request",
				entityId: mapped.data.id,
				action: "UPDATE",
			});
			if (!recordedAudit.ok) {
				return recordedAudit;
			}
			return errorResult.ok(mapped.data);
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
			if (!existing.ok) {
				return existing;
			}
			if (existing.data === null) {
				return notFound("Overtime request not found");
			}
			const versionCheck = assertExpectedVersion(
				existing.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const transition = assertOvertimeStatusTransition(
				existing.data.status,
				"verified",
			);
			if (!transition.ok) {
				return transition;
			}
			const [row] = await afendaDatabase.client
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
			if (!row) {
				return notFound("Overtime request not found");
			}
			await afendaDatabase.client.insert(hrOvertimeApproval).values({
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
			if (!mapped.ok) {
				return mapped;
			}
			const recordedAudit = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_overtime_request",
				entityId: mapped.data.id,
				action: "UPDATE",
			});
			if (!recordedAudit.ok) {
				return recordedAudit;
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to verify overtime request");
		}
	},

	async getOvertimeRequest(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrOvertimeRequest)
				.where(
					and(
						eq(hrOvertimeRequest.organizationId, input.organizationId),
						eq(hrOvertimeRequest.id, input.requestId),
					),
				)
				.limit(1);
			if (rows.length === 0) {
				return errorResult.ok(null);
			}
			return mapOvertime(requirePersistenceRow(rows[0]));
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
			const rows = await afendaDatabase.client
				.select()
				.from(hrOvertimeRequest)
				.where(and(...conditions))
				.limit(limit)
				.offset(offset);
			const mapped: OvertimeRequest[] = [];
			for (const row of rows) {
				const item = mapOvertime(row);
				if (!item.ok) {
					return item;
				}
				mapped.push(item.data);
			}
			return errorResult.ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list overtime requests");
		}
	},
};

async function recomputeTimesheetTotals(
	organizationId: string,
	timesheetId: string,
): Promise<void> {
	const entries = await afendaDatabase.client
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
	const current = await afendaDatabase.client
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
	await afendaDatabase.client
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
	_ports: MutationPorts,
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
	if (!existing.ok) {
		return existing;
	}
	if (existing.data === null) {
		return notFound("Shift not found");
	}
	const versionCheck = assertExpectedVersion(
		existing.data.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) {
		return versionCheck;
	}
	const transition = assertShiftStatusTransition(existing.data.status, next);
	if (!transition.ok) {
		return transition;
	}
	try {
		const shift = existing.data;
		const updatedAt = new Date();
		const [rows] = await runTimeTransaction((sqlTag) => [
			sqlTag`
				UPDATE hr_shift SET status = ${next}, version = ${shift.version + 1},
					updated_by = ${input.actorUserId}, updated_at = ${updatedAt}
				WHERE organization_id = ${input.organizationId} AND id = ${input.shiftId}
					AND version = ${input.expectedVersion}
				RETURNING *
			`,
			sqlTag`
				SELECT 1 / COUNT(*) AS mutation_guard FROM hr_shift
				WHERE organization_id = ${input.organizationId} AND id = ${input.shiftId}
					AND version = ${shift.version + 1} AND updated_at = ${updatedAt}
			`,
			buildTimeAuditInsert(sqlTag, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_shift",
				entityId: input.shiftId,
				action: "UPDATE",
				reasonCode: `SHIFT_STATUS_${next.toUpperCase()}`,
			}),
		]);
		const row = rows[0] as ShiftSqlRow | undefined;
		if (!row) {
			return notFound("Shift not found");
		}
		const mapped = mapShift(shiftFromSql(row));
		if (!mapped.ok) {
			return mapped;
		}
		return errorResult.ok(mapped.data);
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
		listShiftBreaks: (input) => store.listShiftBreaks(input),
		getPreviousCompletedAttendanceSession: (input) =>
			store.getPreviousCompletedAttendanceSession(input),
		resolveTimePolicy: (input) => store.resolveTimePolicy(input),
		listUnresolvedAttendanceExceptions: (input) =>
			store.listUnresolvedAttendanceExceptions(input),
		createAttendanceException: (input, ports) =>
			store.createAttendanceException(input, ports),
		async deleteAttendanceExceptionForRollback(input) {
			try {
				await afendaDatabase.client
					.delete(hrAttendanceException)
					.where(
						and(
							eq(hrAttendanceException.organizationId, input.organizationId),
							eq(hrAttendanceException.id, input.exceptionId),
						),
					);
				return errorResult.ok(undefined);
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
	await afendaDatabase.client
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
	await afendaDatabase.client
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
	_ports: MutationPorts,
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
	if (!existing.ok) {
		return existing;
	}
	if (existing.data === null) {
		return notFound("Shift assignment not found");
	}
	const versionCheck = assertExpectedVersion(
		existing.data.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) {
		return versionCheck;
	}
	const transition = assertAssignmentStatusTransition(
		existing.data.publicationStatus,
		next,
	);
	if (!transition.ok) {
		return transition;
	}
	try {
		const assignment = existing.data;
		const updatedAt = new Date();
		const correlationId =
			input.correlationId ?? `hr-time-hr_shift_assignment-${assignment.id}`;
		const results = await runTimeTransaction((sqlTag) => {
			const queries = [
				sqlTag`
					UPDATE hr_shift_assignment
					SET publication_status = ${next}, version = ${assignment.version + 1},
						updated_by = ${input.actorUserId}, updated_at = ${updatedAt}
					WHERE organization_id = ${input.organizationId} AND id = ${input.assignmentId}
						AND version = ${input.expectedVersion}
					RETURNING *
				`,
				sqlTag`
					SELECT 1 / COUNT(*) AS mutation_guard FROM hr_shift_assignment
					WHERE organization_id = ${input.organizationId} AND id = ${input.assignmentId}
						AND version = ${assignment.version + 1} AND updated_at = ${updatedAt}
				`,
				buildTimeAuditInsert(sqlTag, {
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId,
					entity: "hr_shift_assignment",
					entityId: input.assignmentId,
					action: "UPDATE",
					reasonCode: `SHIFT_ASSIGNMENT_STATUS_${next.toUpperCase()}`,
				}),
			];
			if (next === "published") {
				queries.push(
					buildTimeOutboxInsert(sqlTag, {
						eventId: randomUUID(),
						organizationId: input.organizationId,
						actorUserId: input.actorUserId,
						correlationId,
						eventType: HUMAN_RESOURCES_TIME_SCHEDULE_PUBLISHED_EVENT,
						entityType: "hr_shift_assignment",
						entityId: input.assignmentId,
					}),
				);
			}
			return queries;
		});
		const row = results[0]?.[0] as
			| Parameters<typeof shiftAssignmentFromSql>[0]
			| undefined;
		if (!row) {
			return notFound("Shift assignment not found");
		}
		const mapped = mapAssignment(shiftAssignmentFromSql(row));
		if (!mapped.ok) {
			return mapped;
		}
		return errorResult.ok(mapped.data);
	} catch (error) {
		return mapPersistenceFailure(error, "Failed to transition assignment");
	}
}

async function transitionException(
	store: HumanResourcesTimeStore,
	_ports: MutationPorts,
	input: {
		organizationId: string;
		exceptionId: AttendanceException["id"];
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
	},
	next: AttendanceException["reviewStatus"],
	extra?: {
		resolution?: string | undefined;
		evidenceReference?: string | null | undefined;
	},
): Promise<Result<AttendanceException>> {
	const existing = await store.getAttendanceException({
		organizationId: input.organizationId,
		exceptionId: input.exceptionId,
	});
	if (!existing.ok) {
		return existing;
	}
	if (existing.data === null) {
		return notFound("Attendance exception not found");
	}
	const attendanceException = existing.data;
	const versionCheck = assertExpectedVersion(
		attendanceException.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) {
		return versionCheck;
	}
	const transition = assertExceptionStatusTransition(
		attendanceException.reviewStatus,
		next,
	);
	if (!transition.ok) {
		return transition;
	}
	try {
		const resolution = extra?.resolution ?? attendanceException.resolution;
		const evidenceReference =
			extra?.evidenceReference === undefined
				? attendanceException.evidenceReference
				: extra.evidenceReference;
		const updatedAt = new Date();
		const [rows] = await runTimeTransaction((sqlTag) => [
			sqlTag`
				UPDATE hr_attendance_exception
				SET review_status = ${next}, reviewer_user_id = ${input.actorUserId},
					resolution = ${resolution}, evidence_reference = ${evidenceReference},
					version = ${attendanceException.version + 1},
					updated_by = ${input.actorUserId}, updated_at = ${updatedAt}
				WHERE organization_id = ${input.organizationId} AND id = ${input.exceptionId}
					AND version = ${input.expectedVersion}
				RETURNING *
			`,
			sqlTag`
				SELECT 1 / COUNT(*) AS mutation_guard FROM hr_attendance_exception
				WHERE organization_id = ${input.organizationId} AND id = ${input.exceptionId}
					AND version = ${attendanceException.version + 1} AND updated_at = ${updatedAt}
			`,
			buildTimeAuditInsert(sqlTag, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_attendance_exception",
				entityId: input.exceptionId,
				action: "UPDATE",
				reasonCode: `ATTENDANCE_EXCEPTION_STATUS_${next.toUpperCase()}`,
			}),
		]);
		const row = rows[0] as
			| Parameters<typeof attendanceExceptionFromSql>[0]
			| undefined;
		if (!row) {
			return notFound("Attendance exception not found");
		}
		const mapped = mapException(attendanceExceptionFromSql(row));
		if (!mapped.ok) {
			return mapped;
		}
		return errorResult.ok(mapped.data);
	} catch (error) {
		return mapPersistenceFailure(error, "Failed to transition exception");
	}
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
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
		submissionReference: string;
		approvalPolicyId: Timesheet["approvalPolicyId"];
		requiredApprovalSteps: readonly TimeApprovalAuthority[];
		completedApprovalSteps: number;
		approvedAt: Date | null;
		approvedBy: string | null;
		approverNotes: string | null;
		rejectionReason: string | null;
		lockedAt: Date;
	}>,
): Promise<Result<Timesheet>> {
	const existing = await store.getTimesheet({
		organizationId: input.organizationId,
		timesheetId: input.timesheetId,
	});
	if (!existing.ok) {
		return existing;
	}
	if (existing.data === null) {
		return notFound("Timesheet not found");
	}
	const versionCheck = assertExpectedVersion(
		existing.data.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) {
		return versionCheck;
	}
	const transition = assertTimesheetStatusTransition(
		existing.data.status,
		next,
	);
	if (!transition.ok) {
		return transition;
	}
	try {
		const [row] = await afendaDatabase.client
			.update(hrTimesheet)
			.set({
				status: next,
				submittedAt: extra?.submittedAt ?? existing.data.submittedAt,
				submissionReference:
					extra?.submissionReference ?? existing.data.submissionReference,
				approvalPolicyId:
					extra?.approvalPolicyId === undefined
						? existing.data.approvalPolicyId
						: extra.approvalPolicyId,
				requiredApprovalSteps:
					extra?.requiredApprovalSteps === undefined
						? [...existing.data.requiredApprovalSteps]
						: [...extra.requiredApprovalSteps],
				completedApprovalSteps:
					extra?.completedApprovalSteps ?? existing.data.completedApprovalSteps,
				approvedAt: extra?.approvedAt ?? existing.data.approvedAt,
				approvedBy:
					extra?.approvedBy === undefined
						? existing.data.approvedBy
						: extra.approvedBy,
				approverNotes:
					extra?.approverNotes === undefined
						? existing.data.approverNotes
						: extra.approverNotes,
				rejectionReason:
					extra?.rejectionReason === undefined
						? existing.data.rejectionReason
						: extra.rejectionReason,
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
		if (!row) {
			return notFound("Timesheet not found");
		}
		const mapped = mapTimesheet(row);
		if (!mapped.ok) {
			return mapped;
		}
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
		if (!recorded.ok) {
			return recorded;
		}
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
		const sequentialOutcome1 = await runSequential(
			eventTypes,
			async (eventType) => {
				const event = await emitOutbox(ports, {
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId,
					eventType,
					entityType: "hr_timesheet",
					entityId: mapped.data.id,
				});
				if (!event.ok) {
					return sequentialReturn(event);
				}
			},
		);
		if (sequentialOutcome1.kind === "return") {
			return sequentialOutcome1.value;
		}
		return errorResult.ok(mapped.data);
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
	if (!existing.ok) {
		return existing;
	}
	if (existing.data === null) {
		return notFound("Overtime request not found");
	}
	const versionCheck = assertExpectedVersion(
		existing.data.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) {
		return versionCheck;
	}
	const transition = assertOvertimeStatusTransition(existing.data.status, next);
	if (!transition.ok) {
		return transition;
	}
	try {
		const [row] = await afendaDatabase.client
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
		if (!row) {
			return notFound("Overtime request not found");
		}
		if (next === "rejected" || next === "cancelled") {
			await afendaDatabase.client.insert(hrOvertimeApproval).values({
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
		if (!mapped.ok) {
			return mapped;
		}
		const recorded = await audit(ports, {
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: input.correlationId,
			entity: "hr_overtime_request",
			entityId: mapped.data.id,
			action: "UPDATE",
		});
		if (!recorded.ok) {
			return recorded;
		}
		return errorResult.ok(mapped.data);
	} catch (error) {
		return mapPersistenceFailure(
			error,
			"Failed to transition overtime request",
		);
	}
}
