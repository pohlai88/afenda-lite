import { randomUUID } from "node:crypto";
import { fail, ok, type Result } from "@afenda/errors/result";
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

import {
	type HumanResourcesAttendanceBreakWaiverDecisionId,
	type HumanResourcesAttendanceEventId,
	type HumanResourcesAttendanceExceptionId,
	type HumanResourcesAttendanceSessionId,
	type HumanResourcesEmploymentCalendarAssignmentId,
	type HumanResourcesOvertimeRequestId,
	type HumanResourcesShiftAssignmentId,
	type HumanResourcesShiftAssignmentSegmentId,
	type HumanResourcesShiftBreakId,
	type HumanResourcesShiftId,
	type HumanResourcesTimeApprovalAuthorityAssignmentId,
	type HumanResourcesTimePolicyAssignmentId,
	type HumanResourcesTimePolicyId,
	type HumanResourcesTimesheetApprovalDecisionId,
	type HumanResourcesTimesheetEntryId,
	type HumanResourcesTimesheetId,
	type HumanResourcesWorkCalendarHolidayId,
	type HumanResourcesWorkCalendarId,
	type HumanResourcesWorkCalendarScopeAssignmentId,
	parseHumanResourcesAttendanceAdjustmentId,
	parseHumanResourcesAttendanceBreakWaiverDecisionId,
	parseHumanResourcesAttendanceEventId,
	parseHumanResourcesAttendanceExceptionId,
	parseHumanResourcesAttendanceSessionId,
	parseHumanResourcesEmploymentCalendarAssignmentId,
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
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../../error-codes";
import type { MutationPorts } from "../../ports";
import { assertExpectedVersion } from "../../shared/concurrency";
import { conflict, invalidState, notFound } from "../../shared/domain-guards";
import { selectEffectiveLineageRecord } from "../../shared/effective-lineage";
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
	AttendanceEventRecordInput,
	AttendanceExceptionCreateRecord,
	AttendanceSessionResolveInput,
	EmploymentCalendarAssignRecord,
	HumanResourcesTimeStore,
	IdempotentAttendanceEventRecord,
	IdempotentAttendanceSessionRecord,
	IdempotentOvertimeRequestRecord,
	IdempotentShiftAssignmentRecord,
	IdempotentShiftRecord,
	IdempotentTimesheetRecord,
	IdempotentWorkCalendarRecord,
	OvertimeRequestCreateRecord,
	ShiftAssignmentCreateRecord,
	ShiftBreakCreateRecord,
	ShiftCreateRecord,
	TimePolicyCreateRecord,
	TimesheetCreateRecord,
	TimesheetEntryCreateRecord,
	TimesheetGenerationDeps,
	WorkCalendarCreateRecord,
	WorkCalendarHolidayCreateRecord,
} from "../../store/time";
import {
	ATTENDANCE_SESSION_DETECTION_SOURCE,
	type ExceptionDetectionHost,
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
	IdempotentAttendanceImportBatchRecord,
	OvertimeRequest,
	OvertimeType,
	Shift,
	ShiftAssignment,
	ShiftAssignmentSegment,
	ShiftBreak,
	TimeApprovalAuthorityAssignment,
	TimePolicy,
	TimePolicyAssignment,
	Timesheet,
	TimesheetApprovalDecision,
	TimesheetEntry,
	WorkCalendar,
	WorkCalendarHolidayRecord,
	WorkCalendarScopeAssignment,
} from "../../types";
import type { CoreMemoryState } from "./core";
import { idempotencyMapKey } from "./shared";

function sourceReferenceMapKey(
	organizationId: string,
	source: string,
	sourceReference: string,
): string {
	return `${organizationId}:${source}:${sourceReference}`;
}

function resolveImportBatchStatus(input: {
	accepted: number;
	skipped: number;
	rejected: number;
}): AttendanceImportBatchStatus {
	if (input.rejected === 0) return "completed";
	if (input.accepted === 0 && input.skipped === 0) return "failed";
	return "partial";
}

const OVERTIME_TYPES = new Set<OvertimeType>([
	"weekday_overtime",
	"rest_day_overtime",
	"public_holiday_overtime",
	"night_overtime",
	"call_back",
	"emergency_overtime",
]);

export type TimeMemoryState = {
	workCalendars: Map<HumanResourcesWorkCalendarId, WorkCalendar>;
	workCalendarIdempotencyByKey: Map<string, IdempotentWorkCalendarRecord>;
	workCalendarHolidays: Map<
		HumanResourcesWorkCalendarHolidayId,
		WorkCalendarHolidayRecord
	>;
	employmentCalendarAssignments: Map<
		HumanResourcesEmploymentCalendarAssignmentId,
		EmploymentCalendarAssignment
	>;
	workCalendarScopeAssignments: Map<
		HumanResourcesWorkCalendarScopeAssignmentId,
		WorkCalendarScopeAssignment
	>;
	timePolicies: Map<HumanResourcesTimePolicyId, TimePolicy>;
	timePolicyAssignments: Map<
		HumanResourcesTimePolicyAssignmentId,
		TimePolicyAssignment
	>;
	timeApprovalAuthorityAssignments: Map<
		HumanResourcesTimeApprovalAuthorityAssignmentId,
		TimeApprovalAuthorityAssignment
	>;
	timePolicyIdempotencyByKey: Map<
		string,
		{ policy: TimePolicy; createRequestFingerprint: string }
	>;
	shifts: Map<HumanResourcesShiftId, Shift>;
	shiftIdempotencyByKey: Map<string, IdempotentShiftRecord>;
	shiftBreaks: Map<HumanResourcesShiftBreakId, ShiftBreak>;
	shiftAssignments: Map<HumanResourcesShiftAssignmentId, ShiftAssignment>;
	shiftAssignmentSegments: Map<
		HumanResourcesShiftAssignmentSegmentId,
		ShiftAssignmentSegment
	>;
	shiftAssignmentIdempotencyByKey: Map<string, IdempotentShiftAssignmentRecord>;
	attendanceEvents: Map<HumanResourcesAttendanceEventId, AttendanceEvent>;
	attendanceCorrectionTails: Map<
		HumanResourcesAttendanceEventId,
		Promise<void>
	>;
	attendanceEventIdempotencyByKey: Map<string, IdempotentAttendanceEventRecord>;
	attendanceEventBySourceRef: Map<string, IdempotentAttendanceEventRecord>;
	attendanceImportBatches: Map<string, IdempotentAttendanceImportBatchRecord>;
	attendanceImportErrors: Array<{
		id: string;
		organizationId: string;
		importBatchId: string;
		rowIndex: number;
		sourceReference: string | null;
		errorCode: string;
		errorMessage: string;
		payloadChecksum: string | null;
		createdAt: Date;
	}>;
	attendanceAdjustments: AttendanceAdjustment[];
	attendanceSessions: Map<HumanResourcesAttendanceSessionId, AttendanceSession>;
	attendanceBreakWaiverDecisions: Map<
		HumanResourcesAttendanceBreakWaiverDecisionId,
		AttendanceBreakWaiverDecision
	>;
	attendanceSessionIdempotencyByKey: Map<
		string,
		IdempotentAttendanceSessionRecord
	>;
	attendanceExceptions: Map<
		HumanResourcesAttendanceExceptionId,
		AttendanceException
	>;
	timesheets: Map<HumanResourcesTimesheetId, Timesheet>;
	timesheetApprovalDecisions: Map<
		HumanResourcesTimesheetApprovalDecisionId,
		TimesheetApprovalDecision
	>;
	timesheetIdempotencyByKey: Map<string, IdempotentTimesheetRecord>;
	timesheetEntries: Map<HumanResourcesTimesheetEntryId, TimesheetEntry>;
	overtimeRequests: Map<HumanResourcesOvertimeRequestId, OvertimeRequest>;
	overtimeRequestIdempotencyByKey: Map<string, IdempotentOvertimeRequestRecord>;
	overtimeApprovals: Array<{
		id: string;
		organizationId: string;
		overtimeRequestId: HumanResourcesOvertimeRequestId;
		decision: "approved" | "rejected" | "verified" | "cancelled";
		approvedMaximumMinutes: number | null;
		actorUserId: string;
		comment: string | null;
		decidedAt: Date;
		versionApproved: number;
	}>;
};

export function createTimeMemoryState(): TimeMemoryState {
	return {
		workCalendars: new Map(),
		workCalendarIdempotencyByKey: new Map(),
		workCalendarHolidays: new Map(),
		employmentCalendarAssignments: new Map(),
		workCalendarScopeAssignments: new Map(),
		timePolicies: new Map(),
		timePolicyAssignments: new Map(),
		timeApprovalAuthorityAssignments: new Map(),
		timePolicyIdempotencyByKey: new Map(),
		shifts: new Map(),
		shiftIdempotencyByKey: new Map(),
		shiftBreaks: new Map(),
		shiftAssignments: new Map(),
		shiftAssignmentSegments: new Map(),
		shiftAssignmentIdempotencyByKey: new Map(),
		attendanceEvents: new Map(),
		attendanceCorrectionTails: new Map(),
		attendanceEventIdempotencyByKey: new Map(),
		attendanceEventBySourceRef: new Map(),
		attendanceImportBatches: new Map(),
		attendanceImportErrors: [],
		attendanceAdjustments: [],
		attendanceSessions: new Map(),
		attendanceBreakWaiverDecisions: new Map(),
		attendanceSessionIdempotencyByKey: new Map(),
		attendanceExceptions: new Map(),
		timesheets: new Map(),
		timesheetApprovalDecisions: new Map(),
		timesheetIdempotencyByKey: new Map(),
		timesheetEntries: new Map(),
		overtimeRequests: new Map(),
		overtimeRequestIdempotencyByKey: new Map(),
		overtimeApprovals: [],
	};
}

export function resetTimeMemoryState(state: TimeMemoryState): void {
	state.workCalendars.clear();
	state.workCalendarIdempotencyByKey.clear();
	state.workCalendarHolidays.clear();
	state.employmentCalendarAssignments.clear();
	state.workCalendarScopeAssignments.clear();
	state.timePolicies.clear();
	state.timePolicyAssignments.clear();
	state.timeApprovalAuthorityAssignments.clear();
	state.timePolicyIdempotencyByKey.clear();
	state.shifts.clear();
	state.shiftIdempotencyByKey.clear();
	state.shiftBreaks.clear();
	state.shiftAssignments.clear();
	state.shiftAssignmentSegments.clear();
	state.shiftAssignmentIdempotencyByKey.clear();
	state.attendanceEvents.clear();
	state.attendanceCorrectionTails.clear();
	state.attendanceEventIdempotencyByKey.clear();
	state.attendanceEventBySourceRef.clear();
	state.attendanceImportBatches.clear();
	state.attendanceImportErrors.length = 0;
	state.attendanceAdjustments.length = 0;
	state.attendanceSessions.clear();
	state.attendanceBreakWaiverDecisions.clear();
	state.attendanceSessionIdempotencyByKey.clear();
	state.attendanceExceptions.clear();
	state.timesheets.clear();
	state.timesheetApprovalDecisions.clear();
	state.timesheetIdempotencyByKey.clear();
	state.timesheetEntries.clear();
	state.overtimeRequests.clear();
	state.overtimeRequestIdempotencyByKey.clear();
	state.overtimeApprovals.length = 0;
}

function paginate<T>(items: T[], page = 1, pageSize = 50): T[] {
	const start = (page - 1) * pageSize;
	return items.slice(start, start + pageSize);
}

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

function intervalsOverlap(
	aStart: Date,
	aEnd: Date,
	bStart: Date,
	bEnd: Date,
): boolean {
	return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}

function recomputeTimesheetTotals(
	state: TimeMemoryState,
	timesheet: Timesheet,
): void {
	const entries = Array.from(state.timesheetEntries.values()).filter(
		(entry) =>
			entry.organizationId === timesheet.organizationId &&
			entry.timesheetId === timesheet.id,
	);
	timesheet.totalRecordedMinutes = entries.reduce(
		(sum, entry) => sum + entry.recordedMinutes,
		0,
	);
	timesheet.totalApprovedMinutes = entries.reduce(
		(sum, entry) => sum + entry.approvedMinutes,
		0,
	);
}

function parseOvertimeType(value: string | null): OvertimeType | null {
	if (value === null) return null;
	return OVERTIME_TYPES.has(value as OvertimeType)
		? (value as OvertimeType)
		: null;
}

function memoryExceptionDetectionHost(
	store: HumanResourcesTimeStore,
	state: TimeMemoryState,
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
			const existing = state.attendanceExceptions.get(input.exceptionId);
			if (
				existing === undefined ||
				existing.organizationId !== input.organizationId
			) {
				return ok(undefined);
			}
			state.attendanceExceptions.delete(input.exceptionId);
			return ok(undefined);
		},
	};
}

export function createMemoryTimeMethods(
	state: TimeMemoryState,
	core: CoreMemoryState,
): HumanResourcesTimeStore {
	return {
		async findWorkCalendarByIdempotencyKey(input) {
			const record = state.workCalendarIdempotencyByKey.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			return ok(
				record ? { ...record, calendar: { ...record.calendar } } : null,
			);
		},

		async createWorkCalendar(input: WorkCalendarCreateRecord, ports) {
			const duplicate = Array.from(state.workCalendars.values()).find(
				(calendar) =>
					calendar.organizationId === input.organizationId &&
					calendar.code === input.code &&
					calendar.effectiveFrom === input.effectiveFrom,
			);
			if (duplicate) {
				return fail(
					"CONFLICT",
					"Work calendar with this code already exists",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
				);
			}
			const idResult = parseHumanResourcesWorkCalendarId(randomUUID());
			if (!idResult.ok) return idResult;
			const now = new Date();
			const calendar: WorkCalendar = {
				id: idResult.data,
				organizationId: input.organizationId,
				code: input.code,
				name: input.name,
				timezone: input.timezone,
				calendarVersion: input.calendarVersion,
				workWeek: input.workWeek,
				standardHoursPerDay: input.standardHoursPerDay,
				status: "active",
				effectiveFrom: input.effectiveFrom,
				effectiveTo: input.effectiveTo,
				supersedesCalendarId: null,
				version: 1,
				createdBy: input.createdBy,
				updatedBy: input.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.workCalendars.set(calendar.id, calendar);
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			state.workCalendarIdempotencyByKey.set(key, {
				calendar: { ...calendar },
				createRequestFingerprint: input.createRequestFingerprint,
			});
			const recorded = await audit(ports, {
				organizationId: calendar.organizationId,
				actorUserId: calendar.createdBy,
				correlationId: input.correlationId,
				entity: "hr_work_calendar",
				entityId: calendar.id,
				action: "CREATE",
			});
			if (!recorded.ok) {
				state.workCalendars.delete(calendar.id);
				state.workCalendarIdempotencyByKey.delete(key);
				return recorded;
			}
			return ok({ ...calendar });
		},

		async supersedeWorkCalendar(input, ports) {
			const predecessor = state.workCalendars.get(input.calendarId);
			if (!predecessor || predecessor.organizationId !== input.organizationId) {
				return notFound("Work calendar not found");
			}
			const versionCheck = assertExpectedVersion(
				predecessor.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			if (predecessor.status !== "active") {
				return invalidState("Only active work calendars can be superseded");
			}
			const duplicate = Array.from(state.workCalendars.values()).some(
				(calendar) =>
					calendar.organizationId === input.organizationId &&
					calendar.code === input.code &&
					calendar.effectiveFrom === input.effectiveFrom,
			);
			if (duplicate) {
				return conflict("Work calendar version already exists");
			}
			const successorId = parseHumanResourcesWorkCalendarId(randomUUID());
			if (!successorId.ok) return successorId;
			const previous = { ...predecessor };
			const now = new Date();
			predecessor.status = "superseded";
			predecessor.effectiveTo = input.predecessorEffectiveTo;
			predecessor.version += 1;
			predecessor.updatedBy = input.createdBy;
			predecessor.updatedAt = now;
			const successor: WorkCalendar = {
				id: successorId.data,
				organizationId: input.organizationId,
				code: input.code,
				name: input.name,
				timezone: input.timezone,
				calendarVersion: input.calendarVersion,
				workWeek: [...input.workWeek],
				standardHoursPerDay: input.standardHoursPerDay,
				status: "active",
				effectiveFrom: input.effectiveFrom,
				effectiveTo: input.effectiveTo,
				supersedesCalendarId: predecessor.id,
				version: 1,
				createdBy: input.createdBy,
				updatedBy: input.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.workCalendars.set(successor.id, successor);
			const clonedHolidayIds: HumanResourcesWorkCalendarHolidayId[] = [];
			for (const holiday of state.workCalendarHolidays.values()) {
				if (
					holiday.organizationId !== input.organizationId ||
					holiday.calendarId !== predecessor.id ||
					holiday.holidayDate < input.effectiveFrom
				) {
					continue;
				}
				const holidayId = parseHumanResourcesWorkCalendarHolidayId(
					randomUUID(),
				);
				if (!holidayId.ok) {
					state.workCalendars.set(predecessor.id, previous);
					state.workCalendars.delete(successor.id);
					for (const id of clonedHolidayIds) {
						state.workCalendarHolidays.delete(id);
					}
					return holidayId;
				}
				state.workCalendarHolidays.set(holidayId.data, {
					...holiday,
					id: holidayId.data,
					calendarId: successor.id,
					createdAt: now,
					updatedAt: now,
				});
				clonedHolidayIds.push(holidayId.data);
			}
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			state.workCalendarIdempotencyByKey.set(key, {
				calendar: { ...successor },
				createRequestFingerprint: input.createRequestFingerprint,
			});
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.createdBy,
				correlationId: input.correlationId,
				entity: "hr_work_calendar",
				entityId: successor.id,
				action: "CREATE",
			});
			if (!recorded.ok) {
				state.workCalendars.set(predecessor.id, previous);
				state.workCalendars.delete(successor.id);
				state.workCalendarIdempotencyByKey.delete(key);
				for (const id of clonedHolidayIds) {
					state.workCalendarHolidays.delete(id);
				}
				return recorded;
			}
			return ok({
				superseded: { ...predecessor },
				successor: { ...successor },
			});
		},

		async updateWorkCalendar(input, ports) {
			const calendar = state.workCalendars.get(input.calendarId);
			if (!calendar || calendar.organizationId !== input.organizationId) {
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
			if (!versionCheck.ok) return versionCheck;
			const now = new Date();
			const updated: WorkCalendar = {
				...calendar,
				name: input.name ?? calendar.name,
				timezone: input.timezone ?? calendar.timezone,
				calendarVersion: input.calendarVersion ?? calendar.calendarVersion,
				workWeek: input.workWeek ?? calendar.workWeek,
				standardHoursPerDay:
					input.standardHoursPerDay ?? calendar.standardHoursPerDay,
				effectiveTo:
					input.effectiveTo !== undefined
						? input.effectiveTo
						: calendar.effectiveTo,
				version: calendar.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.workCalendars.set(updated.id, updated);
			const recorded = await audit(ports, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_work_calendar",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!recorded.ok) {
				state.workCalendars.set(calendar.id, calendar);
				return recorded;
			}
			return ok({ ...updated });
		},

		async archiveWorkCalendar(input, ports) {
			const calendar = state.workCalendars.get(input.calendarId);
			if (!calendar || calendar.organizationId !== input.organizationId) {
				return notFound("Work calendar not found");
			}
			const versionCheck = assertExpectedVersion(
				calendar.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			if (calendar.status === "archived") {
				return invalidState("Work calendar is already archived");
			}
			const previous = { ...calendar };
			calendar.status = "archived";
			calendar.version += 1;
			calendar.updatedBy = input.actorUserId;
			calendar.updatedAt = new Date();
			const recorded = await audit(ports, {
				organizationId: calendar.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_work_calendar",
				entityId: calendar.id,
				action: "UPDATE",
			});
			if (!recorded.ok) {
				state.workCalendars.set(calendar.id, previous);
				return recorded;
			}
			return ok({ ...calendar });
		},

		async getWorkCalendar(input) {
			const calendar = state.workCalendars.get(input.calendarId);
			if (!calendar || calendar.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok({ ...calendar });
		},

		async listWorkCalendars(input) {
			const rows = Array.from(state.workCalendars.values())
				.filter(
					(calendar) =>
						calendar.organizationId === input.organizationId &&
						(input.status === undefined || calendar.status === input.status),
				)
				.sort((a, b) => a.code.localeCompare(b.code));
			return ok(
				paginate(rows, input.page, input.pageSize).map((row) => ({ ...row })),
			);
		},

		async addWorkCalendarHoliday(
			input: WorkCalendarHolidayCreateRecord,
			ports,
		) {
			const calendar = state.workCalendars.get(input.calendarId);
			if (!calendar || calendar.organizationId !== input.organizationId) {
				return notFound("Work calendar not found");
			}
			const duplicate = Array.from(state.workCalendarHolidays.values()).find(
				(holiday) =>
					holiday.organizationId === input.organizationId &&
					holiday.calendarId === input.calendarId &&
					holiday.holidayDate === input.holidayDate &&
					holiday.locationCode === input.locationCode &&
					holiday.jurisdiction === input.jurisdiction,
			);
			if (duplicate) {
				return conflict("Work calendar holiday already exists");
			}
			const idResult = parseHumanResourcesWorkCalendarHolidayId(randomUUID());
			if (!idResult.ok) return idResult;
			const now = new Date();
			const holiday: WorkCalendarHolidayRecord = {
				id: idResult.data,
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
			};
			state.workCalendarHolidays.set(holiday.id, holiday);
			const recorded = await audit(ports, {
				organizationId: holiday.organizationId,
				actorUserId: holiday.createdBy,
				correlationId: input.correlationId,
				entity: "hr_work_calendar_holiday",
				entityId: holiday.id,
				action: "CREATE",
			});
			if (!recorded.ok) {
				state.workCalendarHolidays.delete(holiday.id);
				return recorded;
			}
			return ok({ ...holiday });
		},

		async removeWorkCalendarHoliday(input, ports) {
			const holiday = state.workCalendarHolidays.get(input.holidayId);
			if (!holiday || holiday.organizationId !== input.organizationId) {
				return notFound("Work calendar holiday not found");
			}
			state.workCalendarHolidays.delete(holiday.id);
			const recorded = await audit(ports, {
				organizationId: holiday.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_work_calendar_holiday",
				entityId: holiday.id,
				action: "DELETE",
			});
			if (!recorded.ok) {
				state.workCalendarHolidays.set(holiday.id, holiday);
				return recorded;
			}
			return ok(undefined);
		},

		async listWorkCalendarHolidays(input) {
			const rows = Array.from(state.workCalendarHolidays.values())
				.filter(
					(holiday) =>
						holiday.organizationId === input.organizationId &&
						holiday.calendarId === input.calendarId &&
						(input.fromDate === undefined ||
							holiday.holidayDate >= input.fromDate) &&
						(input.toDate === undefined || holiday.holidayDate <= input.toDate),
				)
				.sort((a, b) => a.holidayDate.localeCompare(b.holidayDate));
			return ok(rows.map((row) => ({ ...row })));
		},

		async assignEmploymentCalendar(
			input: EmploymentCalendarAssignRecord,
			ports,
		) {
			const calendar = state.workCalendars.get(input.calendarId);
			if (!calendar || calendar.organizationId !== input.organizationId) {
				return notFound("Work calendar not found");
			}
			const idResult = parseHumanResourcesEmploymentCalendarAssignmentId(
				randomUUID(),
			);
			if (!idResult.ok) return idResult;
			const now = new Date();
			const assignment: EmploymentCalendarAssignment = {
				id: idResult.data,
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
			};
			state.employmentCalendarAssignments.set(assignment.id, assignment);
			const recorded = await audit(ports, {
				organizationId: assignment.organizationId,
				actorUserId: assignment.createdBy,
				correlationId: input.correlationId,
				entity: "hr_employment_calendar_assignment",
				entityId: assignment.id,
				action: "CREATE",
			});
			if (!recorded.ok) {
				state.employmentCalendarAssignments.delete(assignment.id);
				return recorded;
			}
			return ok({ ...assignment });
		},

		async endEmploymentCalendarAssignment(input, ports) {
			const assignment = state.employmentCalendarAssignments.get(
				input.assignmentId,
			);
			if (!assignment || assignment.organizationId !== input.organizationId) {
				return notFound("Employment calendar assignment not found");
			}
			const versionCheck = assertExpectedVersion(
				assignment.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			if (assignment.effectiveTo !== null) {
				return invalidState("Employment calendar assignment is already ended");
			}
			if (input.effectiveTo < assignment.effectiveFrom) {
				return invalidState("effectiveTo must be on or after effectiveFrom");
			}
			const previous = { ...assignment };
			assignment.effectiveTo = input.effectiveTo;
			assignment.version += 1;
			assignment.updatedBy = input.actorUserId;
			assignment.updatedAt = new Date();
			const recorded = await audit(ports, {
				organizationId: assignment.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_employment_calendar_assignment",
				entityId: assignment.id,
				action: "UPDATE",
			});
			if (!recorded.ok) {
				state.employmentCalendarAssignments.set(assignment.id, previous);
				return recorded;
			}
			return ok({ ...assignment });
		},

		async resolveEmploymentCalendar(input) {
			const matches = Array.from(state.employmentCalendarAssignments.values())
				.filter(
					(assignment) =>
						assignment.organizationId === input.organizationId &&
						assignment.employeeId === input.employeeId &&
						assignment.employmentId === input.employmentId &&
						assignment.effectiveFrom <= input.asOf &&
						(assignment.effectiveTo === null ||
							assignment.effectiveTo >= input.asOf),
				)
				.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
			const match = matches[0];
			if (!match) return ok(null);
			const assignedCalendar = state.workCalendars.get(match.calendarId);
			if (!assignedCalendar) return ok(null);
			const effectiveCalendar = selectEffectiveLineageRecord({
				assignedId: assignedCalendar.id,
				records: Array.from(state.workCalendars.values()).filter(
					(calendar) =>
						calendar.organizationId === input.organizationId &&
						calendar.code === assignedCalendar.code,
				),
				asOf: input.asOf,
				getPredecessorId: (calendar) => calendar.supersedesCalendarId,
				isEligible: (calendar) =>
					calendar.status === "active" || calendar.status === "superseded",
			});
			return ok(
				effectiveCalendar
					? { ...match, calendarId: effectiveCalendar.id }
					: null,
			);
		},

		async listWorkCalendarScopeAssignments(input) {
			const rows = Array.from(state.workCalendarScopeAssignments.values()).filter(
				(assignment) =>
					assignment.organizationId === input.organizationId &&
					assignment.effectiveFrom <= input.asOf &&
					(assignment.effectiveTo === null ||
						assignment.effectiveTo >= input.asOf),
			);
			return ok(rows.map((row) => ({ ...row })));
		},

		async assignWorkCalendarScope(input, ports) {
			const calendar = state.workCalendars.get(input.calendarId);
			if (!calendar || calendar.organizationId !== input.organizationId) {
				return notFound("Work calendar not found");
			}
			const overlap = Array.from(state.workCalendarScopeAssignments.values()).some(
				(assignment) =>
					assignment.organizationId === input.organizationId &&
					assignment.scopeType === input.scopeType &&
					assignment.scopeKey === input.scopeKey &&
					assignment.effectiveFrom <=
						(input.effectiveTo ?? "9999-12-31") &&
					(assignment.effectiveTo ?? "9999-12-31") >= input.effectiveFrom,
			);
			if (overlap) {
				return conflict("Work calendar scope assignment overlaps");
			}
			const idResult = parseHumanResourcesWorkCalendarScopeAssignmentId(
				randomUUID(),
			);
			if (!idResult.ok) return idResult;
			const now = new Date();
			const assignment: WorkCalendarScopeAssignment = {
				id: idResult.data,
				organizationId: input.organizationId,
				scopeType: input.scopeType,
				scopeKey: input.scopeKey,
				calendarId: input.calendarId,
				effectiveFrom: input.effectiveFrom,
				effectiveTo: input.effectiveTo,
				version: 1,
				createdBy: input.createdBy,
				updatedBy: input.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.workCalendarScopeAssignments.set(assignment.id, assignment);
			const recorded = await audit(ports, {
				organizationId: assignment.organizationId,
				actorUserId: assignment.createdBy,
				correlationId: input.correlationId,
				entity: "hr_work_calendar_scope_assignment",
				entityId: assignment.id,
				action: "CREATE",
			});
			if (!recorded.ok) {
				state.workCalendarScopeAssignments.delete(assignment.id);
				return recorded;
			}
			return ok({ ...assignment });
		},

		async endWorkCalendarScopeAssignment(input, ports) {
			const assignment = state.workCalendarScopeAssignments.get(input.assignmentId);
			if (!assignment || assignment.organizationId !== input.organizationId) {
				return notFound("Work calendar scope assignment not found");
			}
			const versionCheck = assertExpectedVersion(
				assignment.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			if (assignment.effectiveTo !== null) {
				return invalidState("Work calendar scope assignment is already ended");
			}
			if (input.effectiveTo < assignment.effectiveFrom) {
				return invalidState("effectiveTo must be on or after effectiveFrom");
			}
			const previous = { ...assignment };
			assignment.effectiveTo = input.effectiveTo;
			assignment.version += 1;
			assignment.updatedBy = input.actorUserId;
			assignment.updatedAt = new Date();
			const recorded = await audit(ports, {
				organizationId: assignment.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_work_calendar_scope_assignment",
				entityId: assignment.id,
				action: "UPDATE",
			});
			if (!recorded.ok) {
				state.workCalendarScopeAssignments.set(assignment.id, previous);
				return recorded;
			}
			return ok({ ...assignment });
		},

		async findTimePolicyByIdempotencyKey(input) {
			const record = state.timePolicyIdempotencyByKey.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			return ok(record ? { ...record, policy: { ...record.policy } } : null);
		},

		async createTimePolicy(input: TimePolicyCreateRecord, ports) {
			const duplicate = Array.from(state.timePolicies.values()).some(
				(policy) =>
					policy.organizationId === input.organizationId &&
					policy.code === input.code &&
					policy.effectiveFrom === input.effectiveFrom,
			);
			if (duplicate) return conflict("Time policy code already exists");
			const id = parseHumanResourcesTimePolicyId(randomUUID());
			if (!id.ok) return id;
			const now = new Date();
			const policy: TimePolicy = {
				id: id.data,
				organizationId: input.organizationId,
				code: input.code,
				name: input.name,
				status: "draft",
				effectiveFrom: input.effectiveFrom,
				effectiveTo: input.effectiveTo,
				minimumRestMinutes: input.minimumRestMinutes,
				automaticBreakAfterMinutes: input.automaticBreakAfterMinutes,
				automaticBreakMinutes: input.automaticBreakMinutes,
				approvalSteps: [...input.approvalSteps],
				supersedesPolicyId: null,
				version: 1,
				createdBy: input.createdBy,
				updatedBy: input.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.timePolicies.set(policy.id, policy);
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			state.timePolicyIdempotencyByKey.set(key, {
				policy: { ...policy },
				createRequestFingerprint: input.createRequestFingerprint,
			});
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.createdBy,
				correlationId: input.correlationId,
				entity: "hr_time_policy",
				entityId: policy.id,
				action: "CREATE",
			});
			if (!recorded.ok) {
				state.timePolicies.delete(policy.id);
				state.timePolicyIdempotencyByKey.delete(key);
				return recorded;
			}
			return ok({ ...policy });
		},

		async supersedeTimePolicy(input, ports) {
			const predecessor = state.timePolicies.get(input.policyId);
			if (!predecessor || predecessor.organizationId !== input.organizationId) {
				return notFound("Time policy not found");
			}
			const versionCheck = assertExpectedVersion(
				predecessor.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			if (predecessor.status !== "active") {
				return invalidState("Only active time policies can be superseded");
			}
			const duplicate = Array.from(state.timePolicies.values()).some(
				(policy) =>
					policy.organizationId === input.organizationId &&
					policy.code === input.code &&
					policy.effectiveFrom === input.effectiveFrom,
			);
			if (duplicate) {
				return conflict("A policy version already starts on this date");
			}
			const successorId = parseHumanResourcesTimePolicyId(randomUUID());
			if (!successorId.ok) return successorId;
			const previous = { ...predecessor };
			const now = new Date();
			predecessor.status = "superseded";
			predecessor.effectiveTo = input.predecessorEffectiveTo;
			predecessor.version += 1;
			predecessor.updatedBy = input.createdBy;
			predecessor.updatedAt = now;
			const successor: TimePolicy = {
				id: successorId.data,
				organizationId: input.organizationId,
				code: input.code,
				name: input.name,
				status: "active",
				effectiveFrom: input.effectiveFrom,
				effectiveTo: input.effectiveTo,
				minimumRestMinutes: input.minimumRestMinutes,
				automaticBreakAfterMinutes: input.automaticBreakAfterMinutes,
				automaticBreakMinutes: input.automaticBreakMinutes,
				approvalSteps: [...input.approvalSteps],
				supersedesPolicyId: predecessor.id,
				version: 1,
				createdBy: input.createdBy,
				updatedBy: input.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.timePolicies.set(successor.id, successor);
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			state.timePolicyIdempotencyByKey.set(key, {
				policy: { ...successor },
				createRequestFingerprint: input.createRequestFingerprint,
			});
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.createdBy,
				correlationId: input.correlationId,
				entity: "hr_time_policy",
				entityId: successor.id,
				action: "CREATE",
			});
			if (!recorded.ok) {
				state.timePolicies.set(predecessor.id, previous);
				state.timePolicies.delete(successor.id);
				state.timePolicyIdempotencyByKey.delete(key);
				return recorded;
			}
			return ok({
				superseded: { ...predecessor },
				successor: { ...successor },
			});
		},

		async activateTimePolicy(input, ports) {
			const policy = state.timePolicies.get(input.policyId);
			if (!policy || policy.organizationId !== input.organizationId) {
				return notFound("Time policy not found");
			}
			const versionCheck = assertExpectedVersion(
				policy.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			if (policy.status !== "draft") {
				return invalidState("Only draft time policies can be activated");
			}
			const previous = { ...policy };
			policy.status = "active";
			policy.version += 1;
			policy.updatedBy = input.actorUserId;
			policy.updatedAt = new Date();
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_time_policy",
				entityId: policy.id,
				action: "UPDATE",
			});
			if (!recorded.ok) {
				state.timePolicies.set(policy.id, previous);
				return recorded;
			}
			return ok({ ...policy });
		},

		async assignTimePolicy(input, ports) {
			const policy = state.timePolicies.get(input.policyId);
			if (
				!policy ||
				policy.organizationId !== input.organizationId ||
				policy.status !== "active"
			) {
				return invalidState("Active time policy not found");
			}
			const employment = core.employments.get(input.employmentId);
			if (!employment || employment.organizationId !== input.organizationId) {
				return notFound("Employment not found");
			}
			const overlapping = Array.from(state.timePolicyAssignments.values()).some(
				(assignment) =>
					assignment.organizationId === input.organizationId &&
					assignment.employmentId === input.employmentId &&
					assignment.effectiveFrom <= (input.effectiveTo ?? "9999-12-31") &&
					(assignment.effectiveTo ?? "9999-12-31") >= input.effectiveFrom,
			);
			if (overlapping) {
				return conflict("Time policy assignment overlaps an existing period");
			}
			const id = parseHumanResourcesTimePolicyAssignmentId(randomUUID());
			if (!id.ok) return id;
			const now = new Date();
			const assignment: TimePolicyAssignment = {
				id: id.data,
				organizationId: input.organizationId,
				policyId: input.policyId,
				employmentId: input.employmentId,
				effectiveFrom: input.effectiveFrom,
				effectiveTo: input.effectiveTo,
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			state.timePolicyAssignments.set(assignment.id, assignment);
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_time_policy_assignment",
				entityId: assignment.id,
				action: "CREATE",
			});
			if (!recorded.ok) {
				state.timePolicyAssignments.delete(assignment.id);
				return recorded;
			}
			return ok({ ...assignment });
		},

		async getTimePolicy(input) {
			const policy = state.timePolicies.get(input.policyId);
			if (!policy || policy.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok({ ...policy });
		},

		async resolveTimePolicy(input) {
			const assignment = Array.from(state.timePolicyAssignments.values())
				.filter(
					(candidate) =>
						candidate.organizationId === input.organizationId &&
						candidate.employmentId === input.employmentId &&
						candidate.effectiveFrom <= input.asOf &&
						(candidate.effectiveTo === null ||
							candidate.effectiveTo >= input.asOf),
				)
				.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
			if (assignment === undefined) return ok(null);
			const assignedPolicy = state.timePolicies.get(assignment.policyId);
			if (assignedPolicy === undefined) return ok(null);
			const policy = selectEffectiveLineageRecord({
				assignedId: assignedPolicy.id,
				records: Array.from(state.timePolicies.values()).filter(
					(candidate) =>
						candidate.organizationId === input.organizationId &&
						candidate.code === assignedPolicy.code,
				),
				asOf: input.asOf,
				getPredecessorId: (candidate) => candidate.supersedesPolicyId,
				isEligible: (candidate) =>
					candidate.status === "active" || candidate.status === "superseded",
			});
			return ok(policy === null ? null : { ...policy });
		},

		async assignTimeApprovalAuthority(input, ports) {
			const overlaps = Array.from(
				state.timeApprovalAuthorityAssignments.values(),
			).some(
				(candidate) =>
					candidate.organizationId === input.organizationId &&
					candidate.actorUserId === input.targetActorUserId &&
					candidate.authority === input.authority &&
					candidate.effectiveFrom <= (input.effectiveTo ?? "9999-12-31") &&
					(candidate.effectiveTo ?? "9999-12-31") >= input.effectiveFrom,
			);
			if (overlaps) {
				return conflict("Approval authority assignment overlaps");
			}
			const id = parseHumanResourcesTimeApprovalAuthorityAssignmentId(
				randomUUID(),
			);
			if (!id.ok) return id;
			const now = new Date();
			const assignment: TimeApprovalAuthorityAssignment = {
				id: id.data,
				organizationId: input.organizationId,
				actorUserId: input.targetActorUserId,
				authority: input.authority,
				effectiveFrom: input.effectiveFrom,
				effectiveTo: input.effectiveTo,
				version: 1,
				createdBy: input.createdBy,
				updatedBy: input.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.timeApprovalAuthorityAssignments.set(assignment.id, assignment);
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.createdBy,
				correlationId: input.correlationId,
				entity: "hr_time_approval_authority_assignment",
				entityId: assignment.id,
				action: "CREATE",
			});
			if (!recorded.ok) {
				state.timeApprovalAuthorityAssignments.delete(assignment.id);
				return recorded;
			}
			return ok({ ...assignment });
		},

		async endTimeApprovalAuthorityAssignment(input, ports) {
			const assignment = state.timeApprovalAuthorityAssignments.get(
				input.assignmentId,
			);
			if (
				assignment === undefined ||
				assignment.organizationId !== input.organizationId
			) {
				return notFound("Approval authority assignment not found");
			}
			const versionCheck = assertExpectedVersion(
				assignment.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			if (input.effectiveTo < assignment.effectiveFrom) {
				return invalidState("effectiveTo must be on or after effectiveFrom");
			}
			const previous = { ...assignment };
			assignment.effectiveTo = input.effectiveTo;
			assignment.version += 1;
			assignment.updatedBy = input.actorUserId;
			assignment.updatedAt = new Date();
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_time_approval_authority_assignment",
				entityId: assignment.id,
				action: "UPDATE",
			});
			if (!recorded.ok) {
				state.timeApprovalAuthorityAssignments.set(assignment.id, previous);
				return recorded;
			}
			return ok({ ...assignment });
		},

		async resolveTimeApprovalAuthority(input) {
			const assignment = Array.from(
				state.timeApprovalAuthorityAssignments.values(),
			)
				.filter(
					(candidate) =>
						candidate.organizationId === input.organizationId &&
						candidate.actorUserId === input.actorUserId &&
						candidate.authority === input.authority &&
						candidate.effectiveFrom <= input.asOf &&
						(candidate.effectiveTo === null ||
							candidate.effectiveTo >= input.asOf),
				)
				.sort((left, right) =>
					right.effectiveFrom.localeCompare(left.effectiveFrom),
				)[0];
			return ok(assignment === undefined ? null : { ...assignment });
		},

		async findShiftByIdempotencyKey(input) {
			const record = state.shiftIdempotencyByKey.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			return ok(record ? { ...record, shift: { ...record.shift } } : null);
		},

		async createShift(input: ShiftCreateRecord, ports) {
			const idResult = parseHumanResourcesShiftId(randomUUID());
			if (!idResult.ok) return idResult;
			const now = new Date();
			const shift: Shift = {
				id: idResult.data,
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
				supersedesShiftId: null,
				version: 1,
				createdBy: input.createdBy,
				updatedBy: input.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.shifts.set(shift.id, shift);
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			state.shiftIdempotencyByKey.set(key, {
				shift: { ...shift },
				createRequestFingerprint: input.createRequestFingerprint,
			});
			const recorded = await audit(ports, {
				organizationId: shift.organizationId,
				actorUserId: shift.createdBy,
				correlationId: input.correlationId,
				entity: "hr_shift",
				entityId: shift.id,
				action: "CREATE",
			});
			if (!recorded.ok) {
				state.shifts.delete(shift.id);
				state.shiftIdempotencyByKey.delete(key);
				return recorded;
			}
			return ok({ ...shift });
		},

		async supersedeShift(input, ports) {
			const predecessor = state.shifts.get(input.shiftId);
			if (!predecessor || predecessor.organizationId !== input.organizationId) {
				return notFound("Shift not found");
			}
			const versionCheck = assertExpectedVersion(
				predecessor.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			if (predecessor.status !== "active") {
				return invalidState("Only active shifts can be superseded");
			}
			const duplicate = Array.from(state.shifts.values()).some(
				(shift) =>
					shift.organizationId === input.organizationId &&
					shift.code === input.code &&
					shift.effectiveFrom === input.effectiveFrom,
			);
			if (duplicate) return conflict("Shift version already exists");
			const successorId = parseHumanResourcesShiftId(randomUUID());
			if (!successorId.ok) return successorId;
			const previous = { ...predecessor };
			const now = new Date();
			predecessor.status = "superseded";
			predecessor.effectiveTo = input.predecessorEffectiveTo;
			predecessor.version += 1;
			predecessor.updatedBy = input.createdBy;
			predecessor.updatedAt = now;
			const successor: Shift = {
				id: successorId.data,
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
				status: "active",
				effectiveFrom: input.effectiveFrom,
				effectiveTo: input.effectiveTo,
				supersedesShiftId: predecessor.id,
				version: 1,
				createdBy: input.createdBy,
				updatedBy: input.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.shifts.set(successor.id, successor);
			const clonedBreakIds: HumanResourcesShiftBreakId[] = [];
			for (const shiftBreak of state.shiftBreaks.values()) {
				if (
					shiftBreak.organizationId !== input.organizationId ||
					shiftBreak.shiftId !== predecessor.id
				) {
					continue;
				}
				const breakId = parseHumanResourcesShiftBreakId(randomUUID());
				if (!breakId.ok) {
					state.shifts.set(predecessor.id, previous);
					state.shifts.delete(successor.id);
					for (const id of clonedBreakIds) state.shiftBreaks.delete(id);
					return breakId;
				}
				state.shiftBreaks.set(breakId.data, {
					...shiftBreak,
					id: breakId.data,
					shiftId: successor.id,
					createdAt: now,
					updatedAt: now,
				});
				clonedBreakIds.push(breakId.data);
			}
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			state.shiftIdempotencyByKey.set(key, {
				shift: { ...successor },
				createRequestFingerprint: input.createRequestFingerprint,
			});
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.createdBy,
				correlationId: input.correlationId,
				entity: "hr_shift",
				entityId: successor.id,
				action: "CREATE",
			});
			if (!recorded.ok) {
				state.shifts.set(predecessor.id, previous);
				state.shifts.delete(successor.id);
				state.shiftIdempotencyByKey.delete(key);
				for (const id of clonedBreakIds) state.shiftBreaks.delete(id);
				return recorded;
			}
			return ok({
				superseded: { ...predecessor },
				successor: { ...successor },
			});
		},

		async updateShift(input, ports) {
			const shift = state.shifts.get(input.shiftId);
			if (!shift || shift.organizationId !== input.organizationId) {
				return notFound("Shift not found");
			}
			if (shift.status !== "draft") {
				return invalidState("Only draft shifts can be updated");
			}
			const versionCheck = assertExpectedVersion(
				shift.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			const previous = { ...shift };
			Object.assign(shift, {
				name: input.name ?? shift.name,
				shiftKind: input.shiftKind ?? shift.shiftKind,
				startLocal: input.startLocal ?? shift.startLocal,
				endLocal: input.endLocal ?? shift.endLocal,
				isOvernight: input.isOvernight ?? shift.isOvernight,
				expectedMinutes: input.expectedMinutes ?? shift.expectedMinutes,
				graceEarlyMinutes: input.graceEarlyMinutes ?? shift.graceEarlyMinutes,
				graceLateMinutes: input.graceLateMinutes ?? shift.graceLateMinutes,
				minDurationMinutes:
					input.minDurationMinutes !== undefined
						? input.minDurationMinutes
						: shift.minDurationMinutes,
				maxDurationMinutes:
					input.maxDurationMinutes !== undefined
						? input.maxDurationMinutes
						: shift.maxDurationMinutes,
				earliestClockInLocal:
					input.earliestClockInLocal !== undefined
						? input.earliestClockInLocal
						: shift.earliestClockInLocal,
				latestClockOutLocal:
					input.latestClockOutLocal !== undefined
						? input.latestClockOutLocal
						: shift.latestClockOutLocal,
				overtimeEligible: input.overtimeEligible ?? shift.overtimeEligible,
				timezone:
					input.timezone !== undefined ? input.timezone : shift.timezone,
				locationKey:
					input.locationKey !== undefined
						? input.locationKey
						: shift.locationKey,
				effectiveTo:
					input.effectiveTo !== undefined
						? input.effectiveTo
						: shift.effectiveTo,
				version: shift.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: new Date(),
			});
			const recorded = await audit(ports, {
				organizationId: shift.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_shift",
				entityId: shift.id,
				action: "UPDATE",
			});
			if (!recorded.ok) {
				state.shifts.set(shift.id, previous);
				return recorded;
			}
			return ok({ ...shift });
		},

		async activateShift(input, ports) {
			const shift = state.shifts.get(input.shiftId);
			if (!shift || shift.organizationId !== input.organizationId) {
				return notFound("Shift not found");
			}
			const versionCheck = assertExpectedVersion(
				shift.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			const transition = assertShiftStatusTransition(shift.status, "active");
			if (!transition.ok) return transition;
			const previous = { ...shift };
			shift.status = "active";
			shift.version += 1;
			shift.updatedBy = input.actorUserId;
			shift.updatedAt = new Date();
			const recorded = await audit(ports, {
				organizationId: shift.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_shift",
				entityId: shift.id,
				action: "UPDATE",
			});
			if (!recorded.ok) {
				state.shifts.set(shift.id, previous);
				return recorded;
			}
			return ok({ ...shift });
		},

		async deactivateShift(input, ports) {
			const shift = state.shifts.get(input.shiftId);
			if (!shift || shift.organizationId !== input.organizationId) {
				return notFound("Shift not found");
			}
			const versionCheck = assertExpectedVersion(
				shift.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			const transition = assertShiftStatusTransition(shift.status, "inactive");
			if (!transition.ok) return transition;
			const previous = { ...shift };
			shift.status = "inactive";
			shift.version += 1;
			shift.updatedBy = input.actorUserId;
			shift.updatedAt = new Date();
			const recorded = await audit(ports, {
				organizationId: shift.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_shift",
				entityId: shift.id,
				action: "UPDATE",
			});
			if (!recorded.ok) {
				state.shifts.set(shift.id, previous);
				return recorded;
			}
			return ok({ ...shift });
		},

		async getShift(input) {
			const shift = state.shifts.get(input.shiftId);
			if (!shift || shift.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok({ ...shift });
		},

		async listShifts(input) {
			const rows = Array.from(state.shifts.values())
				.filter(
					(shift) =>
						shift.organizationId === input.organizationId &&
						(input.status === undefined || shift.status === input.status),
				)
				.sort((a, b) => a.code.localeCompare(b.code));
			return ok(
				paginate(rows, input.page, input.pageSize).map((row) => ({ ...row })),
			);
		},

		async addShiftBreak(input: ShiftBreakCreateRecord, ports) {
			const shift = state.shifts.get(input.shiftId);
			if (!shift || shift.organizationId !== input.organizationId) {
				return notFound("Shift not found");
			}
			const idResult = parseHumanResourcesShiftBreakId(randomUUID());
			if (!idResult.ok) return idResult;
			const now = new Date();
			const breakRow: ShiftBreak = {
				id: idResult.data,
				organizationId: input.organizationId,
				shiftId: input.shiftId,
				breakOrder: input.breakOrder,
				startOffsetMinutes: input.startOffsetMinutes,
				durationMinutes: input.durationMinutes,
				isPaid: input.isPaid,
				label: input.label,
				createdAt: now,
				updatedAt: now,
			};
			state.shiftBreaks.set(breakRow.id, breakRow);
			const recorded = await audit(ports, {
				organizationId: breakRow.organizationId,
				actorUserId: shift.updatedBy,
				correlationId: input.correlationId,
				entity: "hr_shift_break",
				entityId: breakRow.id,
				action: "CREATE",
			});
			if (!recorded.ok) {
				state.shiftBreaks.delete(breakRow.id);
				return recorded;
			}
			return ok({ ...breakRow });
		},

		async removeShiftBreak(input, ports) {
			const breakRow = state.shiftBreaks.get(input.breakId);
			if (!breakRow || breakRow.organizationId !== input.organizationId) {
				return notFound("Shift break not found");
			}
			state.shiftBreaks.delete(breakRow.id);
			const recorded = await audit(ports, {
				organizationId: breakRow.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_shift_break",
				entityId: breakRow.id,
				action: "DELETE",
			});
			if (!recorded.ok) {
				state.shiftBreaks.set(breakRow.id, breakRow);
				return recorded;
			}
			return ok(undefined);
		},

		async listShiftBreaks(input) {
			const rows = Array.from(state.shiftBreaks.values())
				.filter(
					(row) =>
						row.organizationId === input.organizationId &&
						row.shiftId === input.shiftId,
				)
				.sort((a, b) => a.breakOrder - b.breakOrder);
			return ok(rows.map((row) => ({ ...row })));
		},

		async findShiftAssignmentByIdempotencyKey(input) {
			const record = state.shiftAssignmentIdempotencyByKey.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			return ok(
				record ? { ...record, assignment: { ...record.assignment } } : null,
			);
		},

		async assignShift(input: ShiftAssignmentCreateRecord, ports) {
			const shift = state.shifts.get(input.shiftId);
			if (!shift || shift.organizationId !== input.organizationId) {
				return notFound("Shift not found");
			}
			if (shift.status !== "active") {
				return invalidState("Shift must be active to assign");
			}
			const overlaps = Array.from(state.shiftAssignments.values()).filter(
				(assignment) =>
					assignment.organizationId === input.organizationId &&
					assignment.employeeId === input.employeeId &&
					assignment.publicationStatus !== "cancelled" &&
					intervalsOverlap(
						input.startsAt,
						input.endsAt,
						assignment.startsAt,
						assignment.endsAt,
					),
			);
			if (overlaps.length > 0) {
				return conflict("Shift assignment overlaps an existing assignment");
			}
			const idResult = parseHumanResourcesShiftAssignmentId(randomUUID());
			if (!idResult.ok) return idResult;
			const now = new Date();
			const assignment: ShiftAssignment = {
				id: idResult.data,
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
				createdBy: input.createdBy,
				updatedBy: input.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			const segments: ShiftAssignmentSegment[] = [];
			for (const segment of input.segments) {
				const segmentId = parseHumanResourcesShiftAssignmentSegmentId(
					randomUUID(),
				);
				if (!segmentId.ok) return segmentId;
				segments.push({
					id: segmentId.data,
					organizationId: input.organizationId,
					assignmentId: assignment.id,
					segmentOrder: segment.segmentOrder,
					startsAt: segment.startsAt,
					endsAt: segment.endsAt,
					createdAt: now,
					updatedAt: now,
				});
			}
			state.shiftAssignments.set(assignment.id, assignment);
			for (const segment of segments) {
				state.shiftAssignmentSegments.set(segment.id, segment);
			}
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			state.shiftAssignmentIdempotencyByKey.set(key, {
				assignment: { ...assignment },
				createRequestFingerprint: input.createRequestFingerprint,
			});
			const recorded = await audit(ports, {
				organizationId: assignment.organizationId,
				actorUserId: assignment.createdBy,
				correlationId: input.correlationId,
				entity: "hr_shift_assignment",
				entityId: assignment.id,
				action: "CREATE",
			});
			if (!recorded.ok) {
				state.shiftAssignments.delete(assignment.id);
				for (const segment of segments) {
					state.shiftAssignmentSegments.delete(segment.id);
				}
				state.shiftAssignmentIdempotencyByKey.delete(key);
				return recorded;
			}
			return ok({ ...assignment });
		},

		async publishShiftAssignment(input, ports) {
			const before = state.shiftAssignments.get(input.assignmentId);
			const previous =
				before && before.organizationId === input.organizationId
					? { ...before }
					: null;
			const published = await transitionAssignment(
				state,
				ports,
				input,
				"published",
			);
			if (!published.ok) return published;

			const session = Array.from(state.attendanceSessions.values()).find(
				(row) =>
					row.organizationId === input.organizationId &&
					row.employeeId === published.data.employeeId &&
					row.localWorkDate === published.data.scheduledDate,
			);
			if (session === undefined) {
				return published;
			}

			const events = Array.from(state.attendanceEvents.values())
				.filter(
					(event) =>
						event.organizationId === input.organizationId &&
						event.employeeId === session.employeeId &&
						event.localWorkDate === session.localWorkDate,
				)
				.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

			const storeHost = this as HumanResourcesTimeStore;
			const detected = await runAttendanceExceptionDetection(
				memoryExceptionDetectionHost(storeHost, state),
				{
					organizationId: input.organizationId,
					employeeId: session.employeeId,
					session,
					events,
					detectionSource: SCHEDULE_PUBLISH_DETECTION_SOURCE,
					actorUserId: input.actorUserId,
					correlationId: input.correlationId,
				},
				ports,
			);
			if (!detected.ok) {
				if (previous !== null) {
					state.shiftAssignments.set(previous.id, previous);
				}
				return detected;
			}
			return published;
		},
		async cancelShiftAssignment(input, ports) {
			return transitionAssignment(state, ports, input, "cancelled");
		},
		async completeShiftAssignment(input, ports) {
			return transitionAssignment(state, ports, input, "completed");
		},

		async changeShiftAssignment(input, ports) {
			const assignment = state.shiftAssignments.get(input.assignmentId);
			if (!assignment || assignment.organizationId !== input.organizationId) {
				return notFound("Shift assignment not found");
			}
			const versionCheck = assertExpectedVersion(
				assignment.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			const attendanceExists = Array.from(state.attendanceEvents.values()).some(
				(event) =>
					event.organizationId === input.organizationId &&
					event.voidedAt === null &&
					(event.shiftAssignmentId === assignment.id ||
						(event.employeeId === assignment.employeeId &&
							event.localWorkDate === assignment.scheduledDate)),
			);
			if (attendanceExists) {
				return conflict(
					"Shift assignment cannot be changed after attendance is recorded",
				);
			}
			const transition = assertAssignmentStatusTransition(
				assignment.publicationStatus,
				"changed",
			);
			if (!transition.ok) return transition;
			const nextStartsAt = input.startsAt ?? assignment.startsAt;
			const nextEndsAt = input.endsAt ?? assignment.endsAt;
			const overlaps = Array.from(state.shiftAssignments.values()).filter(
				(row) =>
					row.organizationId === input.organizationId &&
					row.employeeId === assignment.employeeId &&
					row.id !== assignment.id &&
					row.publicationStatus !== "cancelled" &&
					intervalsOverlap(nextStartsAt, nextEndsAt, row.startsAt, row.endsAt),
			);
			if (overlaps.length > 0) {
				return conflict("Shift assignment overlaps an existing assignment");
			}
			const previous = { ...assignment };
			assignment.shiftId = input.shiftId ?? assignment.shiftId;
			assignment.scheduledDate =
				input.scheduledDate ?? assignment.scheduledDate;
			assignment.startsAt = nextStartsAt;
			assignment.endsAt = nextEndsAt;
			assignment.locationKey =
				input.locationKey !== undefined
					? input.locationKey
					: assignment.locationKey;
			assignment.timezone = input.timezone ?? assignment.timezone;
			assignment.publicationStatus = "changed";
			assignment.version += 1;
			assignment.updatedBy = input.actorUserId;
			assignment.updatedAt = new Date();
			const recorded = await audit(ports, {
				organizationId: assignment.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_shift_assignment",
				entityId: assignment.id,
				action: "UPDATE",
			});
			if (!recorded.ok) {
				state.shiftAssignments.set(assignment.id, previous);
				return recorded;
			}
			return ok({ ...assignment });
		},

		async getShiftAssignment(input) {
			const assignment = state.shiftAssignments.get(input.assignmentId);
			if (!assignment || assignment.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok({ ...assignment });
		},

		async listShiftAssignments(input) {
			const rows = Array.from(state.shiftAssignments.values())
				.filter(
					(assignment) =>
						assignment.organizationId === input.organizationId &&
						(input.employeeId === undefined ||
							assignment.employeeId === input.employeeId) &&
						(input.fromDate === undefined ||
							assignment.scheduledDate >= input.fromDate) &&
						(input.toDate === undefined ||
							assignment.scheduledDate <= input.toDate) &&
						(input.scheduledDate === undefined ||
							assignment.scheduledDate === input.scheduledDate) &&
						(input.locationKey === undefined ||
							assignment.locationKey === input.locationKey) &&
						(input.publicationStatus === undefined ||
							assignment.publicationStatus === input.publicationStatus),
				)
				.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
			return ok(
				paginate(rows, input.page, input.pageSize).map((row) => ({ ...row })),
			);
		},

		async listShiftAssignmentSegments(input) {
			const assignment = state.shiftAssignments.get(input.assignmentId);
			if (!assignment || assignment.organizationId !== input.organizationId) {
				return ok([]);
			}
			const segments = Array.from(state.shiftAssignmentSegments.values())
				.filter(
					(segment) =>
						segment.organizationId === input.organizationId &&
						segment.assignmentId === input.assignmentId,
				)
				.sort((a, b) => a.segmentOrder - b.segmentOrder)
				.map((segment) => ({ ...segment }));
			return ok(segments);
		},

		async getScheduledShiftForEmployeeDate(input) {
			const rows = Array.from(state.shiftAssignments.values()).filter(
				(assignment) =>
					assignment.organizationId === input.organizationId &&
					assignment.employeeId === input.employeeId &&
					assignment.scheduledDate === input.scheduledDate &&
					assignment.publicationStatus !== "cancelled",
			);
			const rank: Record<ShiftAssignment["publicationStatus"], number> = {
				published: 3,
				changed: 2,
				planned: 1,
				completed: 0,
				cancelled: -1,
			};
			rows.sort(
				(a, b) => rank[b.publicationStatus] - rank[a.publicationStatus],
			);
			const match = rows[0];
			return ok(match ? { ...match } : null);
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
			const rows = Array.from(state.shiftAssignments.values()).filter(
				(assignment) =>
					assignment.organizationId === input.organizationId &&
					assignment.employeeId === input.employeeId &&
					assignment.publicationStatus !== "cancelled" &&
					assignment.id !== input.excludeAssignmentId &&
					intervalsOverlap(
						input.startsAt,
						input.endsAt,
						assignment.startsAt,
						assignment.endsAt,
					),
			);
			return ok(rows.map((row) => ({ ...row })));
		},

		async findAttendanceEventByIdempotencyKey(input) {
			const record = state.attendanceEventIdempotencyByKey.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			return ok(record ? { ...record, event: { ...record.event } } : null);
		},

		async findAttendanceEventBySourceReference(input) {
			const record = state.attendanceEventBySourceRef.get(
				sourceReferenceMapKey(
					input.organizationId,
					input.source,
					input.sourceReference,
				),
			);
			return ok(record ? { ...record, event: { ...record.event } } : null);
		},

		async findAttendanceImportBatchByIdempotencyKey(input) {
			const record = state.attendanceImportBatches.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			return ok(
				record
					? {
							result: { ...record.result },
							createRequestFingerprint: record.createRequestFingerprint,
						}
					: null,
			);
		},

		async importAttendanceEvents(input, ports) {
			const existingBatch =
				await this.findAttendanceImportBatchByIdempotencyKey({
					organizationId: input.organizationId,
					idempotencyKey: input.idempotencyKey,
				});
			if (!existingBatch.ok) return existingBatch;
			if (existingBatch.data !== null) {
				if (
					existingBatch.data.createRequestFingerprint !==
					input.createRequestFingerprint
				) {
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok({ ...existingBatch.data.result });
			}

			const importBatchId = randomUUID();
			const accepted: AttendanceImportAcceptedRow[] = [];
			const skipped: AttendanceImportSkippedRow[] = [];
			const rejected: AttendanceImportRejectedRow[] = [];
			const now = new Date();

			for (const [rowIndex, row] of input.events.entries()) {
				if (!isValidIanaTimeZone(row.sourceTimezone)) {
					const rejection: AttendanceImportRejectedRow = {
						rowIndex,
						sourceReference: row.sourceReference,
						errorCode: "INVALID_TIMEZONE",
						errorMessage: "Invalid IANA timezone",
					};
					rejected.push(rejection);
					state.attendanceImportErrors.push({
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

				const employee = core.employees.get(row.employeeId);
				if (
					employee === undefined ||
					employee.organizationId !== input.organizationId
				) {
					const rejection: AttendanceImportRejectedRow = {
						rowIndex,
						sourceReference: row.sourceReference,
						errorCode: "UNKNOWN_EMPLOYEE",
						errorMessage: "Employee not found in organization",
					};
					rejected.push(rejection);
					state.attendanceImportErrors.push({
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

				const employment =
					row.employmentId !== null && row.employmentId !== undefined
						? core.employments.get(row.employmentId)
						: Array.from(core.employments.values()).find(
								(candidate) =>
									candidate.organizationId === input.organizationId &&
									candidate.employeeId === row.employeeId &&
									(candidate.status === "active" ||
										candidate.status === "notice") &&
									candidate.startsOn <= row.localWorkDate &&
									(candidate.endsOn === null ||
										candidate.endsOn >= row.localWorkDate),
							);
				if (
					employment === undefined ||
					employment.organizationId !== input.organizationId ||
					employment.employeeId !== row.employeeId ||
					(employment.status !== "active" && employment.status !== "notice") ||
					employment.startsOn > row.localWorkDate ||
					(employment.endsOn !== null && employment.endsOn < row.localWorkDate)
				) {
					const rejection: AttendanceImportRejectedRow = {
						rowIndex,
						sourceReference: row.sourceReference,
						errorCode: "INVALID_EMPLOYMENT",
						errorMessage: "Active employment not found for attendance event",
					};
					rejected.push(rejection);
					state.attendanceImportErrors.push({
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
					employmentId: employment.id,
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
						state.attendanceImportErrors.push({
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
						employmentId: employment.id,
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
					state.attendanceImportErrors.push({
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

			const batchKey = idempotencyMapKey(
				input.organizationId,
				input.idempotencyKey,
			);
			state.attendanceImportBatches.set(batchKey, {
				result: { ...result },
				createRequestFingerprint: input.createRequestFingerprint,
			});

			const audited = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.createdBy,
				correlationId: input.correlationId,
				entity: "hr_attendance_import_batch",
				entityId: importBatchId,
				action: "CREATE",
			});
			if (!audited.ok) {
				state.attendanceImportBatches.delete(batchKey);
				return audited;
			}
			return ok(result);
		},

		async recordAttendanceEvent(input: AttendanceEventRecordInput, ports) {
			const idResult = parseHumanResourcesAttendanceEventId(randomUUID());
			if (!idResult.ok) return idResult;
			const now = new Date();
			const event: AttendanceEvent = {
				id: idResult.data,
				organizationId: input.organizationId,
				employeeId: input.employeeId,
				employmentId: input.employmentId ?? null,
				shiftAssignmentId: input.shiftAssignmentId ?? null,
				eventType: input.eventType,
				capturedOccurredAt: input.occurredAt,
				occurredAt: input.occurredAt,
				sourceTimezone: input.sourceTimezone,
				localWorkDate: input.localWorkDate,
				source: input.source,
				sourceReference: input.sourceReference ?? null,
				locationKey: input.locationKey ?? null,
				deviceMetadata: input.deviceMetadata ?? null,
				payloadChecksum: input.payloadChecksum ?? null,
				capturedNotes: input.notes ?? null,
				notes: input.notes ?? null,
				voidedAt: null,
				voidReason: null,
				version: 1,
				createdBy: input.createdBy,
				updatedBy: input.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.attendanceEvents.set(event.id, event);
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const idempotent: IdempotentAttendanceEventRecord = {
				event: { ...event },
				createRequestFingerprint: input.createRequestFingerprint,
			};
			state.attendanceEventIdempotencyByKey.set(key, idempotent);
			let sourceRefKey: string | null = null;
			if (event.sourceReference !== null) {
				sourceRefKey = sourceReferenceMapKey(
					event.organizationId,
					event.source,
					event.sourceReference,
				);
				state.attendanceEventBySourceRef.set(sourceRefKey, idempotent);
			}
			const correlationId =
				input.correlationId ?? `hr-time-hr_attendance_event-${event.id}`;
			const recorded = await audit(ports, {
				organizationId: event.organizationId,
				actorUserId: event.createdBy,
				correlationId,
				entity: "hr_attendance_event",
				entityId: event.id,
				action: "CREATE",
			});
			if (!recorded.ok) {
				state.attendanceEvents.delete(event.id);
				state.attendanceEventIdempotencyByKey.delete(key);
				if (sourceRefKey !== null) {
					state.attendanceEventBySourceRef.delete(sourceRefKey);
				}
				return recorded;
			}
			const outbox = await emitOutbox(ports, {
				organizationId: event.organizationId,
				actorUserId: event.createdBy,
				correlationId,
				eventType: HUMAN_RESOURCES_TIME_ATTENDANCE_RECORDED_EVENT,
				entityType: "hr_attendance_event",
				entityId: event.id,
			});
			if (!outbox.ok) {
				state.attendanceEvents.delete(event.id);
				state.attendanceEventIdempotencyByKey.delete(key);
				if (sourceRefKey !== null) {
					state.attendanceEventBySourceRef.delete(sourceRefKey);
				}
				return outbox;
			}
			return ok({ ...event });
		},

		async correctAttendanceEvent(input, ports) {
			const predecessor =
				state.attendanceCorrectionTails.get(input.eventId) ?? Promise.resolve();
			let release: () => void = () => undefined;
			const gate = new Promise<void>((resolve) => {
				release = resolve;
			});
			const tail = predecessor.then(() => gate);
			state.attendanceCorrectionTails.set(input.eventId, tail);
			await predecessor;
			try {
				const event = state.attendanceEvents.get(input.eventId);
				if (!event || event.organizationId !== input.organizationId) {
					return notFound("Attendance event not found");
				}
				if (event.voidedAt !== null) {
					return invalidState("Cannot correct a voided attendance event");
				}
				const versionCheck = assertExpectedVersion(
					event.version,
					input.expectedVersion,
				);
				if (!versionCheck.ok) return versionCheck;
				const nextNotes = input.notes !== undefined ? input.notes : event.notes;
				const now = new Date();
				const corrected: AttendanceEvent = {
					...event,
					occurredAt: input.occurredAt,
					notes: nextNotes,
					version: event.version + 1,
					updatedBy: input.actorUserId,
					updatedAt: now,
				};
				const adjustmentId = parseHumanResourcesAttendanceAdjustmentId(
					randomUUID(),
				);
				if (!adjustmentId.ok) return adjustmentId;
				const adjustment: AttendanceAdjustment = {
					id: adjustmentId.data,
					organizationId: event.organizationId,
					eventId: event.id,
					sequence: event.version,
					eventVersionBefore: event.version,
					eventVersionAfter: corrected.version,
					previousOccurredAt: event.occurredAt,
					newOccurredAt: input.occurredAt,
					previousNotes: event.notes,
					newNotes: nextNotes,
					adjustmentReason: input.adjustmentReason,
					evidenceReference: input.evidenceReference ?? null,
					actorUserId: input.actorUserId,
					correlationId: input.correlationId,
					createdAt: now,
				};
				const correlationId =
					input.correlationId ?? `hr-time-hr_attendance_event-${event.id}`;
				const recorded = await audit(ports, {
					organizationId: event.organizationId,
					actorUserId: input.actorUserId,
					correlationId,
					entity: "hr_attendance_event",
					entityId: event.id,
					action: "UPDATE",
				});
				if (!recorded.ok) {
					return recorded;
				}
				const outbox = await emitOutbox(ports, {
					organizationId: event.organizationId,
					actorUserId: input.actorUserId,
					correlationId,
					eventType: HUMAN_RESOURCES_TIME_ATTENDANCE_CORRECTED_EVENT,
					entityType: "hr_attendance_event",
					entityId: event.id,
				});
				if (!outbox.ok) {
					const compensationAudit = await audit(ports, {
						organizationId: event.organizationId,
						actorUserId: input.actorUserId,
						correlationId,
						entity: "hr_attendance_adjustment",
						entityId: adjustment.id,
						action: "DELETE",
					});
					if (!compensationAudit.ok) return compensationAudit;
					return outbox;
				}
				state.attendanceEvents.set(event.id, corrected);
				state.attendanceAdjustments.push(adjustment);
				return ok({ ...corrected });
			} finally {
				release();
				if (state.attendanceCorrectionTails.get(input.eventId) === tail) {
					state.attendanceCorrectionTails.delete(input.eventId);
				}
			}
		},

		async voidAttendanceEvent(input, ports) {
			const event = state.attendanceEvents.get(input.eventId);
			if (!event || event.organizationId !== input.organizationId) {
				return notFound("Attendance event not found");
			}
			const versionCheck = assertExpectedVersion(
				event.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			if (event.voidedAt !== null) {
				return invalidState("Attendance event is already voided");
			}
			const previous = { ...event };
			event.voidedAt = new Date();
			event.voidReason = input.voidReason;
			event.version += 1;
			event.updatedBy = input.actorUserId;
			event.updatedAt = new Date();
			const recorded = await audit(ports, {
				organizationId: event.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_attendance_event",
				entityId: event.id,
				action: "UPDATE",
			});
			if (!recorded.ok) {
				state.attendanceEvents.set(event.id, previous);
				return recorded;
			}
			return ok({ ...event });
		},

		async getAttendanceEvent(input) {
			const event = state.attendanceEvents.get(input.eventId);
			if (!event || event.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok({ ...event });
		},

		async listAttendanceAdjustments(input) {
			return ok(
				state.attendanceAdjustments
					.filter(
						(adjustment) =>
							adjustment.organizationId === input.organizationId &&
							adjustment.eventId === input.eventId,
					)
					.sort(
						(left, right) =>
							(left.sequence ?? Number.MAX_SAFE_INTEGER) -
								(right.sequence ?? Number.MAX_SAFE_INTEGER) ||
							left.createdAt.getTime() - right.createdAt.getTime() ||
							left.id.localeCompare(right.id),
					)
					.map((adjustment) => ({ ...adjustment })),
			);
		},

		async listAttendanceEvents(input) {
			const rows = Array.from(state.attendanceEvents.values())
				.filter(
					(event) =>
						event.organizationId === input.organizationId &&
						(input.employeeId === undefined ||
							event.employeeId === input.employeeId) &&
						(input.fromDate === undefined ||
							event.localWorkDate >= input.fromDate) &&
						(input.toDate === undefined ||
							event.localWorkDate <= input.toDate) &&
						(input.eventType === undefined ||
							event.eventType === input.eventType),
				)
				.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
			return ok(
				paginate(rows, input.page, input.pageSize).map((row) => ({ ...row })),
			);
		},

		async findAttendanceSessionByIdempotencyKey(input) {
			const record = state.attendanceSessionIdempotencyByKey.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			return ok(record ? { ...record, session: { ...record.session } } : null);
		},

		async resolveAttendanceSession(
			input: AttendanceSessionResolveInput,
			ports,
		) {
			const events = Array.from(state.attendanceEvents.values())
				.filter(
					(event) =>
						event.organizationId === input.organizationId &&
						event.employeeId === input.employeeId &&
						event.localWorkDate === input.localWorkDate,
				)
				.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
			const resolved = resolveSessionFromEvents(events);
			const policyMinutes = applyAutomaticBreakPolicy(
				resolved,
				input.automaticBreakPolicy,
			);
			const existing = Array.from(state.attendanceSessions.values()).find(
				(session) =>
					session.organizationId === input.organizationId &&
					session.employeeId === input.employeeId &&
					session.localWorkDate === input.localWorkDate,
			);
			const now = new Date();
			if (existing) {
				const previous = { ...existing };
				const previousIdempotency = state.attendanceSessionIdempotencyByKey.get(
					idempotencyMapKey(input.organizationId, input.idempotencyKey),
				);
				Object.assign(existing, {
					...resolved,
					...policyMinutes,
					employmentId: input.employmentId,
					timezone: input.timezone,
					version: existing.version + 1,
					updatedBy: input.createdBy,
					updatedAt: now,
				});
				const key = idempotencyMapKey(
					input.organizationId,
					input.idempotencyKey,
				);
				state.attendanceSessionIdempotencyByKey.set(key, {
					session: { ...existing },
					createRequestFingerprint: input.createRequestFingerprint,
				});
				const recorded = await audit(ports, {
					organizationId: existing.organizationId,
					actorUserId: input.createdBy,
					correlationId: input.correlationId,
					entity: "hr_attendance_session",
					entityId: existing.id,
					action: "UPDATE",
				});
				if (!recorded.ok) {
					state.attendanceSessions.set(existing.id, previous);
					if (previousIdempotency) {
						state.attendanceSessionIdempotencyByKey.set(
							key,
							previousIdempotency,
						);
					} else {
						state.attendanceSessionIdempotencyByKey.delete(key);
					}
					return recorded;
				}
				const storeHost = this as HumanResourcesTimeStore;
				const detected = await runAttendanceExceptionDetection(
					memoryExceptionDetectionHost(storeHost, state),
					{
						organizationId: input.organizationId,
						employeeId: input.employeeId,
						session: existing,
						events,
						detectionSource: ATTENDANCE_SESSION_DETECTION_SOURCE,
						actorUserId: input.createdBy,
						correlationId: input.correlationId,
					},
					ports,
				);
				if (!detected.ok) {
					state.attendanceSessions.set(existing.id, previous);
					if (previousIdempotency) {
						state.attendanceSessionIdempotencyByKey.set(
							key,
							previousIdempotency,
						);
					} else {
						state.attendanceSessionIdempotencyByKey.delete(key);
					}
					return detected;
				}
				return ok({ ...existing });
			}

			const idResult = parseHumanResourcesAttendanceSessionId(randomUUID());
			if (!idResult.ok) return idResult;
			const session: AttendanceSession = {
				id: idResult.data,
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
				createdBy: input.createdBy,
				updatedBy: input.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.attendanceSessions.set(session.id, session);
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			state.attendanceSessionIdempotencyByKey.set(key, {
				session: { ...session },
				createRequestFingerprint: input.createRequestFingerprint,
			});
			const recorded = await audit(ports, {
				organizationId: session.organizationId,
				actorUserId: session.createdBy,
				correlationId: input.correlationId,
				entity: "hr_attendance_session",
				entityId: session.id,
				action: "CREATE",
			});
			if (!recorded.ok) {
				state.attendanceSessions.delete(session.id);
				state.attendanceSessionIdempotencyByKey.delete(key);
				return recorded;
			}
			const storeHost = this as HumanResourcesTimeStore;
			const detected = await runAttendanceExceptionDetection(
				memoryExceptionDetectionHost(storeHost, state),
				{
					organizationId: input.organizationId,
					employeeId: input.employeeId,
					session,
					events,
					detectionSource: ATTENDANCE_SESSION_DETECTION_SOURCE,
					actorUserId: input.createdBy,
					correlationId: input.correlationId,
				},
				ports,
			);
			if (!detected.ok) {
				state.attendanceSessions.delete(session.id);
				state.attendanceSessionIdempotencyByKey.delete(key);
				return detected;
			}
			return ok({ ...session });
		},

		async getAttendanceSession(input) {
			const session = state.attendanceSessions.get(input.sessionId);
			if (!session || session.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok({ ...session });
		},

		async approveAttendanceBreakWaiver(input, ports) {
			const session = state.attendanceSessions.get(input.sessionId);
			if (!session || session.organizationId !== input.organizationId) {
				return notFound("Attendance session not found");
			}
			const versionCheck = assertExpectedVersion(
				session.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			const automaticBreak = session.provenance.automaticBreak;
			if (
				automaticBreak === null ||
				!automaticBreak.applied ||
				automaticBreak.policyId !== input.policyId
			) {
				return invalidState(
					"Attendance session has no matching automatic break deduction",
				);
			}
			const duplicate = Array.from(
				state.attendanceBreakWaiverDecisions.values(),
			).some(
				(decision) =>
					decision.organizationId === input.organizationId &&
					decision.sessionId === input.sessionId &&
					decision.sessionVersion === input.expectedVersion,
			);
			if (duplicate) {
				return conflict(
					"Break waiver decision already exists for session version",
				);
			}
			const events = Array.from(state.attendanceEvents.values())
				.filter(
					(event) =>
						event.organizationId === input.organizationId &&
						event.employeeId === session.employeeId &&
						event.localWorkDate === session.localWorkDate,
				)
				.sort(
					(left, right) =>
						left.occurredAt.getTime() - right.occurredAt.getTime(),
				);
			const recordedBreakMinutes =
				resolveSessionFromEvents(events).breakMinutes;
			if (recordedBreakMinutes >= automaticBreak.minutes) {
				return invalidState(
					"Recorded breaks already satisfy the automatic break requirement",
				);
			}
			const id = parseHumanResourcesAttendanceBreakWaiverDecisionId(
				randomUUID(),
			);
			if (!id.ok) return id;
			const now = new Date();
			const decision: AttendanceBreakWaiverDecision = {
				id: id.data,
				organizationId: input.organizationId,
				sessionId: input.sessionId,
				policyId: input.policyId,
				authorityAssignmentId: input.authorityAssignmentId,
				authority: input.authority,
				actorUserId: input.actorUserId,
				reason: input.reason,
				evidenceReference: input.evidenceReference,
				automaticBreakMinutes: automaticBreak.minutes,
				recordedBreakMinutes,
				sessionVersion: session.version,
				correlationId: input.correlationId,
				decidedAt: now,
				createdAt: now,
			};
			state.attendanceBreakWaiverDecisions.set(decision.id, decision);
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_attendance_break_waiver_decision",
				entityId: decision.id,
				action: "CREATE",
			});
			if (!recorded.ok) {
				state.attendanceBreakWaiverDecisions.delete(decision.id);
				return recorded;
			}
			return ok({ ...decision });
		},

		async listAttendanceBreakWaiverDecisions(input) {
			return ok(
				Array.from(state.attendanceBreakWaiverDecisions.values())
					.filter(
						(decision) =>
							decision.organizationId === input.organizationId &&
							decision.sessionId === input.sessionId,
					)
					.sort(
						(left, right) =>
							left.decidedAt.getTime() - right.decidedAt.getTime(),
					)
					.map((decision) => ({ ...decision })),
			);
		},

		async listAttendanceSessions(input) {
			const rows = Array.from(state.attendanceSessions.values())
				.filter(
					(session) =>
						session.organizationId === input.organizationId &&
						(input.employeeId === undefined ||
							session.employeeId === input.employeeId) &&
						(input.fromDate === undefined ||
							session.localWorkDate >= input.fromDate) &&
						(input.toDate === undefined ||
							session.localWorkDate <= input.toDate),
				)
				.sort((a, b) => a.localWorkDate.localeCompare(b.localWorkDate));
			return ok(
				paginate(rows, input.page, input.pageSize).map((row) => ({ ...row })),
			);
		},

		async getPreviousCompletedAttendanceSession(input) {
			const previous =
				Array.from(state.attendanceSessions.values())
					.filter(
						(session) =>
							session.organizationId === input.organizationId &&
							session.employeeId === input.employeeId &&
							session.id !== input.excludeSessionId &&
							session.finalClockOutAt !== null &&
							session.finalClockOutAt < input.before,
					)
					.sort(
						(a, b) =>
							(b.finalClockOutAt?.getTime() ?? 0) -
							(a.finalClockOutAt?.getTime() ?? 0),
					)[0] ?? null;
			return ok(previous === null ? null : { ...previous });
		},

		async createAttendanceException(
			input: AttendanceExceptionCreateRecord,
			ports,
		) {
			const idResult = parseHumanResourcesAttendanceExceptionId(randomUUID());
			if (!idResult.ok) return idResult;
			const now = new Date();
			const exception: AttendanceException = {
				id: idResult.data,
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
			};
			state.attendanceExceptions.set(exception.id, exception);
			const correlationId =
				input.correlationId ??
				`hr-time-hr_attendance_exception-${exception.id}`;
			const recorded = await audit(ports, {
				organizationId: exception.organizationId,
				actorUserId: exception.createdBy,
				correlationId,
				entity: "hr_attendance_exception",
				entityId: exception.id,
				action: "CREATE",
			});
			if (!recorded.ok) {
				state.attendanceExceptions.delete(exception.id);
				return recorded;
			}
			const outbox = await emitOutbox(ports, {
				organizationId: exception.organizationId,
				actorUserId: exception.createdBy,
				correlationId,
				eventType: HUMAN_RESOURCES_TIME_EXCEPTION_CREATED_EVENT,
				entityType: "hr_attendance_exception",
				entityId: exception.id,
			});
			if (!outbox.ok) {
				state.attendanceExceptions.delete(exception.id);
				return outbox;
			}
			return ok({ ...exception });
		},

		async reviewAttendanceException(input, ports) {
			return transitionException(state, ports, input, "in_review");
		},
		async excuseAttendanceException(input, ports) {
			return transitionException(state, ports, input, "excused", {
				resolution: input.resolution,
				evidenceReference: input.evidenceReference,
			});
		},
		async rejectAttendanceException(input, ports) {
			return transitionException(state, ports, input, "rejected", {
				resolution: input.resolution,
			});
		},
		async resolveAttendanceException(input, ports) {
			return transitionException(state, ports, input, "resolved", {
				resolution: input.resolution,
			});
		},

		async getAttendanceException(input) {
			const exception = state.attendanceExceptions.get(input.exceptionId);
			if (!exception || exception.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok({ ...exception });
		},

		async listAttendanceExceptions(input) {
			const rows = Array.from(state.attendanceExceptions.values())
				.filter(
					(exception) =>
						exception.organizationId === input.organizationId &&
						(input.employeeId === undefined ||
							exception.employeeId === input.employeeId) &&
						(input.reviewStatus === undefined ||
							exception.reviewStatus === input.reviewStatus),
				)
				.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
			return ok(
				paginate(rows, input.page, input.pageSize).map((row) => ({ ...row })),
			);
		},

		async listUnresolvedAttendanceExceptions(input) {
			const rows = Array.from(state.attendanceExceptions.values())
				.filter(
					(exception) =>
						exception.organizationId === input.organizationId &&
						(input.employeeId === undefined ||
							exception.employeeId === input.employeeId) &&
						(exception.reviewStatus === "open" ||
							exception.reviewStatus === "in_review"),
				)
				.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
			return ok(
				paginate(rows, input.page, input.pageSize).map((row) => ({ ...row })),
			);
		},

		async getDailyAttendanceSummary(input) {
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
		},

		async findTimesheetByIdempotencyKey(input) {
			const record = state.timesheetIdempotencyByKey.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			return ok(
				record ? { ...record, timesheet: { ...record.timesheet } } : null,
			);
		},

		async createTimesheet(input: TimesheetCreateRecord, ports) {
			const idResult = parseHumanResourcesTimesheetId(randomUUID());
			if (!idResult.ok) return idResult;
			const now = new Date();
			const timesheet: Timesheet = {
				id: idResult.data,
				organizationId: input.organizationId,
				employeeId: input.employeeId,
				employmentId: input.employmentId ?? null,
				periodStart: input.periodStart,
				periodEnd: input.periodEnd,
				status: "draft",
				totalRecordedMinutes: 0,
				totalApprovedMinutes: 0,
				submittedAt: null,
				submissionReference: null,
				approvalPolicyId: null,
				requiredApprovalSteps: [],
				completedApprovalSteps: 0,
				approvedAt: null,
				approvedBy: null,
				approverNotes: null,
				rejectionReason: null,
				lockedAt: null,
				version: 1,
				createdBy: input.createdBy,
				updatedBy: input.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.timesheets.set(timesheet.id, timesheet);
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			state.timesheetIdempotencyByKey.set(key, {
				timesheet: { ...timesheet },
				createRequestFingerprint: input.createRequestFingerprint,
			});
			const recorded = await audit(ports, {
				organizationId: timesheet.organizationId,
				actorUserId: timesheet.createdBy,
				correlationId: input.correlationId,
				entity: "hr_timesheet",
				entityId: timesheet.id,
				action: "CREATE",
			});
			if (!recorded.ok) {
				state.timesheets.delete(timesheet.id);
				state.timesheetIdempotencyByKey.delete(key);
				return recorded;
			}
			return ok({ ...timesheet });
		},

		async generateTimesheetEntries(
			input,
			ports,
			deps: TimesheetGenerationDeps,
		) {
			const timesheet = state.timesheets.get(input.timesheetId);
			if (!timesheet || timesheet.organizationId !== input.organizationId) {
				return notFound("Timesheet not found");
			}
			const versionCheck = assertExpectedVersion(
				timesheet.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			if (timesheet.status !== "draft" && timesheet.status !== "returned") {
				return invalidState("Timesheet is not editable for entry generation");
			}

			const leaveFacts =
				await deps.approvedLeave.listApprovedLeaveForEmployeePeriod({
					organizationId: input.organizationId,
					employeeId: timesheet.employeeId,
					periodStart: timesheet.periodStart,
					periodEnd: timesheet.periodEnd,
				});
			if (!leaveFacts.ok) return leaveFacts;

			const sessions = Array.from(state.attendanceSessions.values()).filter(
				(session) =>
					session.organizationId === input.organizationId &&
					session.employeeId === timesheet.employeeId &&
					session.localWorkDate >= timesheet.periodStart &&
					session.localWorkDate <= timesheet.periodEnd &&
					session.resolutionStatus === "resolved",
			);
			const createdEntries: TimesheetEntry[] = [];
			const createdExceptionIds: HumanResourcesAttendanceExceptionId[] = [];
			const host = this as HumanResourcesTimeStore;

			for (const session of sessions) {
				const entryPlans = buildAttendanceTimesheetEntryPlans(session);
				for (const plan of entryPlans) {
					if (
						plan.workDate < timesheet.periodStart ||
						plan.workDate > timesheet.periodEnd
					) {
						continue;
					}
					const already = Array.from(state.timesheetEntries.values()).some(
						(entry) =>
							entry.timesheetId === timesheet.id &&
							entry.sourceType === "attendance" &&
							entry.sourceReference === plan.sourceReference,
					);
					if (already) continue;
					const idResult = parseHumanResourcesTimesheetEntryId(randomUUID());
					if (!idResult.ok) return idResult;
					const now = new Date();
					const entry: TimesheetEntry = {
						id: idResult.data,
						organizationId: timesheet.organizationId,
						timesheetId: timesheet.id,
						employeeId: timesheet.employeeId,
						workDate: plan.workDate,
						timezone: session.timezone,
						sourceType: "attendance",
						sourceReference: plan.sourceReference,
						timeType: "regular",
						startedAt: session.firstClockInAt,
						endedAt: session.finalClockOutAt,
						recordedMinutes: plan.recordedMinutes,
						approvedMinutes: plan.approvedMinutes,
						costCenterId: null,
						projectId: null,
						locationId: null,
						departmentId: null,
						approvalReference: null,
						evidenceReference: null,
						version: 1,
						createdBy: input.actorUserId,
						updatedBy: input.actorUserId,
						createdAt: now,
						updatedAt: now,
					};
					state.timesheetEntries.set(entry.id, entry);
					createdEntries.push(entry);
				}
			}

			for (const fact of leaveFacts.data) {
				const already = Array.from(state.timesheetEntries.values()).some(
					(entry) =>
						entry.timesheetId === timesheet.id &&
						entry.sourceType === "leave" &&
						entry.sourceReference === fact.segmentId,
				);
				if (already) continue;
				const mapped = mapApprovedLeaveFactToEntryInput({
					fact,
					timesheet,
					actorUserId: input.actorUserId,
					correlationId: input.correlationId,
				});
				const idResult = parseHumanResourcesTimesheetEntryId(randomUUID());
				if (!idResult.ok) return idResult;
				const now = new Date();
				const entry: TimesheetEntry = {
					id: idResult.data,
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
					costCenterId: null,
					projectId: null,
					locationId: null,
					departmentId: null,
					approvalReference: null,
					evidenceReference: null,
					version: 1,
					createdBy: mapped.createdBy,
					updatedBy: mapped.createdBy,
					createdAt: now,
					updatedAt: now,
				};
				state.timesheetEntries.set(entry.id, entry);
				createdEntries.push(entry);
			}

			const periodEntries = Array.from(state.timesheetEntries.values()).filter(
				(entry) => entry.timesheetId === timesheet.id,
			);

			const fullStore = this as HumanResourcesStore;
			let employment = null as Awaited<
				ReturnType<HumanResourcesStore["getEmploymentById"]>
			> extends Result<infer T>
				? T
				: never;
			if (timesheet.employmentId !== null) {
				const employmentResult = await fullStore.getEmploymentById({
					organizationId: input.organizationId,
					employmentId: timesheet.employmentId,
				});
				if (!employmentResult.ok) return employmentResult;
				employment = employmentResult.data;
			} else {
				const found = await fullStore.findOpenEmploymentByEmployee({
					organizationId: input.organizationId,
					employeeId: timesheet.employeeId,
				});
				if (!found.ok) return found;
				employment = found.data;
			}

			const existingExceptions = Array.from(
				state.attendanceExceptions.values(),
			).filter(
				(exception) =>
					exception.organizationId === input.organizationId &&
					exception.employeeId === timesheet.employeeId,
			);

			for (const workDate of iterDatesInclusive(
				timesheet.periodStart,
				timesheet.periodEnd,
			)) {
				const expected = await resolveExpectedWorkMinutes({
					host,
					organizationId: input.organizationId,
					employeeId: timesheet.employeeId,
					employmentId: timesheet.employmentId ?? employment?.id ?? null,
					workDate,
				});
				if (!expected.ok) return expected;

				const leaveMinutes = approvedLeaveMinutesForDate(
					workDate,
					leaveFacts.data,
				);
				const workedMinutes = qualifyingWorkedMinutesForDate(
					workDate,
					sessions,
					periodEntries,
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
						exceptions: existingExceptions,
						employeeId: timesheet.employeeId,
						workDate,
					})
				) {
					continue;
				}

				const created = await host.createAttendanceException(
					{
						organizationId: input.organizationId,
						employeeId: timesheet.employeeId,
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
							timesheetId: timesheet.id,
						}),
						createdBy: input.actorUserId,
						correlationId: input.correlationId,
					},
					ports,
				);
				if (!created.ok) {
					for (const entry of createdEntries) {
						state.timesheetEntries.delete(entry.id);
					}
					for (const exceptionId of createdExceptionIds) {
						state.attendanceExceptions.delete(exceptionId);
					}
					return created;
				}
				createdExceptionIds.push(created.data.id);
				existingExceptions.push(created.data);
			}

			const previous = { ...timesheet };
			recomputeTimesheetTotals(state, timesheet);
			timesheet.version += 1;
			timesheet.updatedBy = input.actorUserId;
			timesheet.updatedAt = new Date();
			const recorded = await audit(ports, {
				organizationId: timesheet.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_timesheet",
				entityId: timesheet.id,
				action: "UPDATE",
			});
			if (!recorded.ok) {
				for (const entry of createdEntries) {
					state.timesheetEntries.delete(entry.id);
				}
				for (const exceptionId of createdExceptionIds) {
					state.attendanceExceptions.delete(exceptionId);
				}
				state.timesheets.set(timesheet.id, previous);
				return recorded;
			}
			const entries = Array.from(state.timesheetEntries.values())
				.filter((entry) => entry.timesheetId === timesheet.id)
				.map((entry) => ({ ...entry }));
			return ok({ timesheet: { ...timesheet }, entries });
		},

		async addTimesheetEntry(input: TimesheetEntryCreateRecord, ports) {
			const timesheet = state.timesheets.get(input.timesheetId);
			if (!timesheet || timesheet.organizationId !== input.organizationId) {
				return notFound("Timesheet not found");
			}
			if (timesheet.status !== "draft" && timesheet.status !== "returned") {
				return invalidState("Timesheet is not editable");
			}
			const idResult = parseHumanResourcesTimesheetEntryId(randomUUID());
			if (!idResult.ok) return idResult;
			const now = new Date();
			const entry: TimesheetEntry = {
				id: idResult.data,
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
			};
			state.timesheetEntries.set(entry.id, entry);
			recomputeTimesheetTotals(state, timesheet);
			timesheet.version += 1;
			timesheet.updatedBy = input.createdBy;
			timesheet.updatedAt = now;
			const recorded = await audit(ports, {
				organizationId: entry.organizationId,
				actorUserId: entry.createdBy,
				correlationId: input.correlationId,
				entity: "hr_timesheet_entry",
				entityId: entry.id,
				action: "CREATE",
			});
			if (!recorded.ok) {
				state.timesheetEntries.delete(entry.id);
				return recorded;
			}
			return ok({ ...entry });
		},

		async updateTimesheetEntry(input, ports) {
			const entry = state.timesheetEntries.get(input.entryId);
			if (!entry || entry.organizationId !== input.organizationId) {
				return notFound("Timesheet entry not found");
			}
			const timesheet = state.timesheets.get(entry.timesheetId);
			if (!timesheet) return notFound("Timesheet not found");
			if (timesheet.status !== "draft" && timesheet.status !== "returned") {
				return invalidState("Timesheet is not editable");
			}
			const versionCheck = assertExpectedVersion(
				entry.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			const previous = { ...entry };
			entry.workDate = input.workDate ?? entry.workDate;
			entry.timeType = input.timeType ?? entry.timeType;
			if (input.startedAt !== undefined) entry.startedAt = input.startedAt;
			if (input.endedAt !== undefined) entry.endedAt = input.endedAt;
			entry.recordedMinutes = input.recordedMinutes ?? entry.recordedMinutes;
			entry.approvedMinutes = input.approvedMinutes ?? entry.approvedMinutes;
			if (input.costCenterId !== undefined) {
				entry.costCenterId = input.costCenterId;
			}
			if (input.projectId !== undefined) entry.projectId = input.projectId;
			if (input.locationId !== undefined) entry.locationId = input.locationId;
			if (input.departmentId !== undefined) {
				entry.departmentId = input.departmentId;
			}
			if (input.approvalReference !== undefined) {
				entry.approvalReference = input.approvalReference;
			}
			if (input.evidenceReference !== undefined) {
				entry.evidenceReference = input.evidenceReference;
			}
			entry.version += 1;
			entry.updatedBy = input.actorUserId;
			entry.updatedAt = new Date();
			recomputeTimesheetTotals(state, timesheet);
			const recorded = await audit(ports, {
				organizationId: entry.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_timesheet_entry",
				entityId: entry.id,
				action: "UPDATE",
			});
			if (!recorded.ok) {
				state.timesheetEntries.set(entry.id, previous);
				return recorded;
			}
			return ok({ ...entry });
		},

		async removeTimesheetEntry(input, ports) {
			const entry = state.timesheetEntries.get(input.entryId);
			if (!entry || entry.organizationId !== input.organizationId) {
				return notFound("Timesheet entry not found");
			}
			const versionCheck = assertExpectedVersion(
				entry.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			const timesheet = state.timesheets.get(entry.timesheetId);
			if (!timesheet) return notFound("Timesheet not found");
			if (timesheet.status !== "draft" && timesheet.status !== "returned") {
				return invalidState("Timesheet is not editable");
			}
			state.timesheetEntries.delete(entry.id);
			recomputeTimesheetTotals(state, timesheet);
			const recorded = await audit(ports, {
				organizationId: entry.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_timesheet_entry",
				entityId: entry.id,
				action: "DELETE",
			});
			if (!recorded.ok) {
				state.timesheetEntries.set(entry.id, entry);
				return recorded;
			}
			return ok(undefined);
		},

		async submitTimesheet(input, ports) {
			return transitionTimesheet(state, ports, input, "submitted", {
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
			return transitionTimesheet(state, ports, input, "returned", {
				approverNotes: input.approverNotes ?? null,
			});
		},
		async approveTimesheet(input, ports) {
			const timesheet = state.timesheets.get(input.timesheetId);
			if (!timesheet || timesheet.organizationId !== input.organizationId) {
				return notFound("Timesheet not found");
			}
			const selfCheck = assertNoSelfApprove({
				actorUserId: input.actorUserId,
				createdBy: timesheet.createdBy,
			});
			if (!selfCheck.ok) return selfCheck;
			const versionCheck = assertExpectedVersion(
				timesheet.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			if (timesheet.status !== "submitted") {
				return invalidState("Timesheet must be submitted for approval");
			}
			if (timesheet.submissionReference === null) {
				return invalidState("Timesheet approval snapshot is missing");
			}
			const expectedAuthority =
				timesheet.requiredApprovalSteps[timesheet.completedApprovalSteps];
			if (expectedAuthority === undefined) {
				return invalidState("Timesheet approval chain is already complete");
			}
			if (expectedAuthority !== input.authority) {
				return invalidState(
					`Approval step requires ${expectedAuthority} authority`,
				);
			}
			const duplicate = [...state.timesheetApprovalDecisions.values()].some(
				(decision) =>
					decision.organizationId === input.organizationId &&
					decision.submissionReference === timesheet.submissionReference &&
					decision.stepIndex === timesheet.completedApprovalSteps,
			);
			if (duplicate) {
				return conflict("Timesheet approval step already decided");
			}
			const id = parseHumanResourcesTimesheetApprovalDecisionId(randomUUID());
			if (!id.ok) return id;
			const now = new Date();
			const completedApprovalSteps = timesheet.completedApprovalSteps + 1;
			const isFinal =
				completedApprovalSteps === timesheet.requiredApprovalSteps.length;
			const previous = { ...timesheet };
			const decision: TimesheetApprovalDecision = {
				id: id.data,
				organizationId: input.organizationId,
				timesheetId: timesheet.id,
				submissionReference: timesheet.submissionReference,
				policyId: timesheet.approvalPolicyId,
				authorityAssignmentId: input.authorityAssignmentId,
				stepIndex: timesheet.completedApprovalSteps,
				authority: input.authority,
				actorUserId: input.actorUserId,
				comment: input.approverNotes ?? null,
				versionApproved: timesheet.version,
				correlationId: input.correlationId,
				decidedAt: now,
				createdAt: now,
			};
			state.timesheetApprovalDecisions.set(decision.id, decision);
			timesheet.completedApprovalSteps = completedApprovalSteps;
			timesheet.status = isFinal ? "approved" : "submitted";
			timesheet.approvedAt = isFinal ? now : null;
			timesheet.approvedBy = isFinal ? input.actorUserId : null;
			timesheet.approverNotes = input.approverNotes ?? null;
			timesheet.version += 1;
			timesheet.updatedBy = input.actorUserId;
			timesheet.updatedAt = now;
			const recorded = await audit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_timesheet_approval_decision",
				entityId: decision.id,
				action: "CREATE",
			});
			if (!recorded.ok) {
				state.timesheetApprovalDecisions.delete(decision.id);
				state.timesheets.set(timesheet.id, previous);
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
				entityId: timesheet.id,
			});
			if (!event.ok) {
				state.timesheetApprovalDecisions.delete(decision.id);
				state.timesheets.set(timesheet.id, previous);
				const compensationAudit = await audit(ports, {
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId: input.correlationId,
					entity: "hr_timesheet_approval_decision",
					entityId: decision.id,
					action: "DELETE",
				});
				if (!compensationAudit.ok) return compensationAudit;
				return event;
			}
			return ok({ ...timesheet });
		},
		async listTimesheetApprovalDecisions(input) {
			return ok(
				[...state.timesheetApprovalDecisions.values()]
					.filter(
						(decision) =>
							decision.organizationId === input.organizationId &&
							decision.timesheetId === input.timesheetId &&
							(input.submissionReference === undefined ||
								decision.submissionReference === input.submissionReference),
					)
					.sort((left, right) => left.stepIndex - right.stepIndex)
					.map((decision) => ({ ...decision })),
			);
		},
		async rejectTimesheet(input, ports) {
			return transitionTimesheet(state, ports, input, "rejected", {
				rejectionReason: input.rejectionReason,
			});
		},
		async reopenTimesheet(input, ports) {
			return transitionTimesheet(state, ports, input, "draft");
		},
		async lockTimesheet(input, ports) {
			return transitionTimesheet(state, ports, input, "locked", {
				lockedAt: new Date(),
			});
		},

		async supersedeTimesheet(input, ports) {
			const timesheet = state.timesheets.get(input.timesheetId);
			if (!timesheet || timesheet.organizationId !== input.organizationId) {
				return notFound("Timesheet not found");
			}
			const versionCheck = assertExpectedVersion(
				timesheet.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			const transition = assertTimesheetStatusTransition(
				timesheet.status,
				"superseded",
			);
			if (!transition.ok) return transition;
			const previous = { ...timesheet };
			timesheet.status = "superseded";
			timesheet.version += 1;
			timesheet.updatedBy = input.actorUserId;
			timesheet.updatedAt = new Date();

			const idResult = parseHumanResourcesTimesheetId(randomUUID());
			if (!idResult.ok) {
				state.timesheets.set(timesheet.id, previous);
				return idResult;
			}
			const now = new Date();
			const replacement: Timesheet = {
				id: idResult.data,
				organizationId: timesheet.organizationId,
				employeeId: timesheet.employeeId,
				employmentId: timesheet.employmentId,
				periodStart: timesheet.periodStart,
				periodEnd: timesheet.periodEnd,
				status: "draft",
				totalRecordedMinutes: 0,
				totalApprovedMinutes: 0,
				submittedAt: null,
				submissionReference: null,
				approvalPolicyId: null,
				requiredApprovalSteps: [],
				completedApprovalSteps: 0,
				approvedAt: null,
				approvedBy: null,
				approverNotes: null,
				rejectionReason: null,
				lockedAt: null,
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			state.timesheets.set(replacement.id, replacement);
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			state.timesheetIdempotencyByKey.set(key, {
				timesheet: { ...replacement },
				createRequestFingerprint: input.createRequestFingerprint,
			});

			const recorded = await audit(ports, {
				organizationId: timesheet.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_timesheet",
				entityId: timesheet.id,
				action: "UPDATE",
			});
			if (!recorded.ok) {
				state.timesheets.set(timesheet.id, previous);
				state.timesheets.delete(replacement.id);
				state.timesheetIdempotencyByKey.delete(key);
				return recorded;
			}
			const createdAudit = await audit(ports, {
				organizationId: replacement.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_timesheet",
				entityId: replacement.id,
				action: "CREATE",
			});
			if (!createdAudit.ok) {
				state.timesheets.set(timesheet.id, previous);
				state.timesheets.delete(replacement.id);
				state.timesheetIdempotencyByKey.delete(key);
				return createdAudit;
			}
			return ok({ ...replacement });
		},

		async getTimesheet(input) {
			const timesheet = state.timesheets.get(input.timesheetId);
			if (!timesheet || timesheet.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok({ ...timesheet });
		},

		async findTimesheetForEmployeePeriod(input) {
			const match = Array.from(state.timesheets.values()).find(
				(timesheet) =>
					timesheet.organizationId === input.organizationId &&
					timesheet.employeeId === input.employeeId &&
					timesheet.periodStart === input.periodStart &&
					timesheet.periodEnd === input.periodEnd &&
					timesheet.status !== "superseded",
			);
			return ok(match ? { ...match } : null);
		},

		async listTimesheets(input) {
			const rows = Array.from(state.timesheets.values())
				.filter(
					(timesheet) =>
						timesheet.organizationId === input.organizationId &&
						(input.employeeId === undefined ||
							timesheet.employeeId === input.employeeId) &&
						(input.status === undefined || timesheet.status === input.status) &&
						(input.periodStart === undefined ||
							timesheet.periodStart === input.periodStart),
				)
				.sort((a, b) => b.periodStart.localeCompare(a.periodStart));
			return ok(
				paginate(rows, input.page, input.pageSize).map((row) => ({ ...row })),
			);
		},

		async listTimesheetEntries(input) {
			const rows = Array.from(state.timesheetEntries.values())
				.filter(
					(entry) =>
						entry.organizationId === input.organizationId &&
						entry.timesheetId === input.timesheetId,
				)
				.sort((a, b) => a.workDate.localeCompare(b.workDate));
			return ok(rows.map((row) => ({ ...row })));
		},

		async getTimesheetTotals(input) {
			const timesheet = state.timesheets.get(input.timesheetId);
			if (!timesheet || timesheet.organizationId !== input.organizationId) {
				return ok(null);
			}
			const entries = Array.from(state.timesheetEntries.values()).filter(
				(entry) =>
					entry.organizationId === input.organizationId &&
					entry.timesheetId === input.timesheetId,
			);
			return ok({
				timesheetId: timesheet.id,
				totalRecordedMinutes: timesheet.totalRecordedMinutes,
				totalApprovedMinutes: timesheet.totalApprovedMinutes,
				entryCount: entries.length,
			});
		},

		async getApprovedTimeHandoff(input) {
			const timesheet = state.timesheets.get(input.timesheetId);
			if (!timesheet || timesheet.organizationId !== input.organizationId) {
				return ok(null);
			}
			if (timesheet.status !== "approved" && timesheet.status !== "locked") {
				return ok(null);
			}
			const entries = Array.from(state.timesheetEntries.values()).filter(
				(entry) =>
					entry.organizationId === input.organizationId &&
					entry.timesheetId === timesheet.id,
			);
			const overtimeMap = new Map<OvertimeType, number>();
			let regularMinutes = 0;
			let publicHolidayMinutes = 0;
			let restDayMinutes = 0;
			let nightMinutes = 0;
			let unpaidMinutes = 0;
			let paidLeaveMinutes = 0;
			let unpaidLeaveMinutes = 0;
			for (const entry of entries) {
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
						if (entry.sourceType === "leave") {
							unpaidLeaveMinutes += minutes;
						}
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
						if (entry.sourceType === "leave") {
							paidLeaveMinutes += minutes;
						}
						break;
					default: {
						const _exhaustive: never = entry.timeType;
						void _exhaustive;
					}
				}
			}
			const handoff: ApprovedTimeHandoff = {
				organizationId: timesheet.organizationId,
				employeeId: timesheet.employeeId,
				employmentId: timesheet.employmentId,
				periodStart: timesheet.periodStart,
				periodEnd: timesheet.periodEnd,
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
				timesheetId: timesheet.id,
				timesheetVersion: timesheet.version,
				approvedAt: (timesheet.approvedAt ?? timesheet.updatedAt).toISOString(),
				approvalReference: timesheet.approvedBy ?? timesheet.id,
			};
			return ok(handoff);
		},

		async findOvertimeRequestByIdempotencyKey(input) {
			const record = state.overtimeRequestIdempotencyByKey.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			return ok(record ? { ...record, request: { ...record.request } } : null);
		},

		async createOvertimeRequest(input: OvertimeRequestCreateRecord, ports) {
			const idResult = parseHumanResourcesOvertimeRequestId(randomUUID());
			if (!idResult.ok) return idResult;
			const now = new Date();
			const request: OvertimeRequest = {
				id: idResult.data,
				organizationId: input.organizationId,
				employeeId: input.employeeId,
				employmentId: input.employmentId,
				overtimeType: input.overtimeType,
				requestedStartsAt: input.requestedStartsAt,
				requestedEndsAt: input.requestedEndsAt,
				requestedMinutes: input.requestedMinutes,
				approvedMaximumMinutes: null,
				actualMinutes: null,
				payrollApprovedMinutes: null,
				reason: input.reason,
				evidenceReference: input.evidenceReference,
				status: "requested",
				version: 1,
				createdBy: input.createdBy,
				updatedBy: input.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.overtimeRequests.set(request.id, request);
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			state.overtimeRequestIdempotencyByKey.set(key, {
				request: { ...request },
				createRequestFingerprint: input.createRequestFingerprint,
			});
			const recorded = await audit(ports, {
				organizationId: request.organizationId,
				actorUserId: request.createdBy,
				correlationId: input.correlationId,
				entity: "hr_overtime_request",
				entityId: request.id,
				action: "CREATE",
			});
			if (!recorded.ok) {
				state.overtimeRequests.delete(request.id);
				state.overtimeRequestIdempotencyByKey.delete(key);
				return recorded;
			}
			return ok({ ...request });
		},

		async approveOvertimeRequest(input, ports) {
			const request = state.overtimeRequests.get(input.requestId);
			if (!request || request.organizationId !== input.organizationId) {
				return notFound("Overtime request not found");
			}
			const selfCheck = assertNoSelfApprove({
				actorUserId: input.actorUserId,
				createdBy: request.createdBy,
			});
			if (!selfCheck.ok) return selfCheck;
			const versionCheck = assertExpectedVersion(
				request.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			const transition = assertOvertimeStatusTransition(
				request.status,
				"approved",
			);
			if (!transition.ok) return transition;
			const previous = { ...request };
			request.status = "approved";
			request.approvedMaximumMinutes = input.approvedMaximumMinutes;
			request.version += 1;
			request.updatedBy = input.actorUserId;
			request.updatedAt = new Date();
			state.overtimeApprovals.push({
				id: randomUUID(),
				organizationId: request.organizationId,
				overtimeRequestId: request.id,
				decision: "approved",
				approvedMaximumMinutes: input.approvedMaximumMinutes,
				actorUserId: input.actorUserId,
				comment: input.comment ?? null,
				decidedAt: new Date(),
				versionApproved: request.version,
			});
			const correlationId =
				input.correlationId ?? `hr-time-hr_overtime_request-${request.id}`;
			const recorded = await audit(ports, {
				organizationId: request.organizationId,
				actorUserId: input.actorUserId,
				correlationId,
				entity: "hr_overtime_request",
				entityId: request.id,
				action: "UPDATE",
			});
			if (!recorded.ok) {
				state.overtimeRequests.set(request.id, previous);
				state.overtimeApprovals.pop();
				return recorded;
			}
			const outbox = await emitOutbox(ports, {
				organizationId: request.organizationId,
				actorUserId: input.actorUserId,
				correlationId,
				eventType: HUMAN_RESOURCES_TIME_OVERTIME_APPROVED_EVENT,
				entityType: "hr_overtime_request",
				entityId: request.id,
			});
			if (!outbox.ok) {
				state.overtimeRequests.set(request.id, previous);
				state.overtimeApprovals.pop();
				return outbox;
			}
			return ok({ ...request });
		},

		async rejectOvertimeRequest(input, ports) {
			return transitionOvertime(state, ports, input, "rejected", {
				comment: input.comment,
			});
		},
		async cancelOvertimeRequest(input, ports) {
			return transitionOvertime(state, ports, input, "cancelled");
		},
		async recordOvertimeActual(input, ports) {
			const request = state.overtimeRequests.get(input.requestId);
			if (!request || request.organizationId !== input.organizationId) {
				return notFound("Overtime request not found");
			}
			const versionCheck = assertExpectedVersion(
				request.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			const transition = assertOvertimeStatusTransition(
				request.status,
				"worked",
			);
			if (!transition.ok) return transition;
			const previous = { ...request };
			request.status = "worked";
			request.actualMinutes = input.actualMinutes;
			request.version += 1;
			request.updatedBy = input.actorUserId;
			request.updatedAt = new Date();
			const recorded = await audit(ports, {
				organizationId: request.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_overtime_request",
				entityId: request.id,
				action: "UPDATE",
			});
			if (!recorded.ok) {
				state.overtimeRequests.set(request.id, previous);
				return recorded;
			}
			return ok({ ...request });
		},
		async verifyOvertimeRequest(input, ports) {
			const request = state.overtimeRequests.get(input.requestId);
			if (!request || request.organizationId !== input.organizationId) {
				return notFound("Overtime request not found");
			}
			const versionCheck = assertExpectedVersion(
				request.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			const transition = assertOvertimeStatusTransition(
				request.status,
				"verified",
			);
			if (!transition.ok) return transition;
			const previous = { ...request };
			request.status = "verified";
			request.payrollApprovedMinutes = input.payrollApprovedMinutes;
			request.version += 1;
			request.updatedBy = input.actorUserId;
			request.updatedAt = new Date();
			state.overtimeApprovals.push({
				id: randomUUID(),
				organizationId: request.organizationId,
				overtimeRequestId: request.id,
				decision: "verified",
				approvedMaximumMinutes: input.payrollApprovedMinutes,
				actorUserId: input.actorUserId,
				comment: null,
				decidedAt: new Date(),
				versionApproved: request.version,
			});
			const recorded = await audit(ports, {
				organizationId: request.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "hr_overtime_request",
				entityId: request.id,
				action: "UPDATE",
			});
			if (!recorded.ok) {
				state.overtimeRequests.set(request.id, previous);
				state.overtimeApprovals.pop();
				return recorded;
			}
			return ok({ ...request });
		},

		async getOvertimeRequest(input) {
			const request = state.overtimeRequests.get(input.requestId);
			if (!request || request.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok({ ...request });
		},

		async listOvertimeRequests(input) {
			const rows = Array.from(state.overtimeRequests.values())
				.filter(
					(request) =>
						request.organizationId === input.organizationId &&
						(input.employeeId === undefined ||
							request.employeeId === input.employeeId) &&
						(input.status === undefined || request.status === input.status),
				)
				.sort(
					(a, b) =>
						b.requestedStartsAt.getTime() - a.requestedStartsAt.getTime(),
				);
			return ok(
				paginate(rows, input.page, input.pageSize).map((row) => ({ ...row })),
			);
		},
	};
}

async function transitionAssignment(
	state: TimeMemoryState,
	ports: MutationPorts,
	input: {
		organizationId: string;
		assignmentId: HumanResourcesShiftAssignmentId;
		expectedVersion: number;
		actorUserId: string;
		correlationId?: string;
	},
	next: ShiftAssignment["publicationStatus"],
): Promise<Result<ShiftAssignment>> {
	const assignment = state.shiftAssignments.get(input.assignmentId);
	if (!assignment || assignment.organizationId !== input.organizationId) {
		return notFound("Shift assignment not found");
	}
	const versionCheck = assertExpectedVersion(
		assignment.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) return versionCheck;
	const transition = assertAssignmentStatusTransition(
		assignment.publicationStatus,
		next,
	);
	if (!transition.ok) return transition;
	const previous = { ...assignment };
	assignment.publicationStatus = next;
	assignment.version += 1;
	assignment.updatedBy = input.actorUserId;
	assignment.updatedAt = new Date();
	const correlationId =
		input.correlationId ?? `hr-time-hr_shift_assignment-${assignment.id}`;
	const recorded = await audit(ports, {
		organizationId: assignment.organizationId,
		actorUserId: input.actorUserId,
		correlationId,
		entity: "hr_shift_assignment",
		entityId: assignment.id,
		action: "UPDATE",
	});
	if (!recorded.ok) {
		state.shiftAssignments.set(assignment.id, previous);
		return recorded;
	}
	if (next === "published") {
		const outbox = await emitOutbox(ports, {
			organizationId: assignment.organizationId,
			actorUserId: input.actorUserId,
			correlationId,
			eventType: HUMAN_RESOURCES_TIME_SCHEDULE_PUBLISHED_EVENT,
			entityType: "hr_shift_assignment",
			entityId: assignment.id,
		});
		if (!outbox.ok) {
			state.shiftAssignments.set(assignment.id, previous);
			return outbox;
		}
	}
	return ok({ ...assignment });
}

async function transitionException(
	state: TimeMemoryState,
	ports: MutationPorts,
	input: {
		organizationId: string;
		exceptionId: HumanResourcesAttendanceExceptionId;
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
	},
	next: AttendanceException["reviewStatus"],
	extra?: {
		resolution?: string;
		evidenceReference?: string | null;
	},
): Promise<Result<AttendanceException>> {
	const exception = state.attendanceExceptions.get(input.exceptionId);
	if (!exception || exception.organizationId !== input.organizationId) {
		return notFound("Attendance exception not found");
	}
	const versionCheck = assertExpectedVersion(
		exception.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) return versionCheck;
	const transition = assertExceptionStatusTransition(
		exception.reviewStatus,
		next,
	);
	if (!transition.ok) return transition;
	const previous = { ...exception };
	exception.reviewStatus = next;
	exception.reviewerUserId = input.actorUserId;
	if (extra?.resolution !== undefined) exception.resolution = extra.resolution;
	if (extra?.evidenceReference !== undefined) {
		exception.evidenceReference = extra.evidenceReference;
	}
	exception.version += 1;
	exception.updatedBy = input.actorUserId;
	exception.updatedAt = new Date();
	const recorded = await audit(ports, {
		organizationId: exception.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		entity: "hr_attendance_exception",
		entityId: exception.id,
		action: "UPDATE",
	});
	if (!recorded.ok) {
		state.attendanceExceptions.set(exception.id, previous);
		return recorded;
	}
	return ok({ ...exception });
}

async function transitionTimesheet(
	state: TimeMemoryState,
	ports: MutationPorts,
	input: {
		organizationId: string;
		timesheetId: HumanResourcesTimesheetId;
		expectedVersion: number;
		actorUserId: string;
		correlationId?: string;
	},
	next: Timesheet["status"],
	extra?: Partial<Timesheet>,
): Promise<Result<Timesheet>> {
	const timesheet = state.timesheets.get(input.timesheetId);
	if (!timesheet || timesheet.organizationId !== input.organizationId) {
		return notFound("Timesheet not found");
	}
	const versionCheck = assertExpectedVersion(
		timesheet.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) return versionCheck;
	const transition = assertTimesheetStatusTransition(timesheet.status, next);
	if (!transition.ok) return transition;
	const previous = { ...timesheet };
	timesheet.status = next;
	if (extra) Object.assign(timesheet, extra);
	timesheet.version += 1;
	timesheet.updatedBy = input.actorUserId;
	timesheet.updatedAt = new Date();
	const correlationId =
		input.correlationId ?? `hr-time-hr_timesheet-${timesheet.id}`;
	const recorded = await audit(ports, {
		organizationId: timesheet.organizationId,
		actorUserId: input.actorUserId,
		correlationId,
		entity: "hr_timesheet",
		entityId: timesheet.id,
		action: "UPDATE",
	});
	if (!recorded.ok) {
		state.timesheets.set(timesheet.id, previous);
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
	for (const eventType of eventTypes) {
		const event = await emitOutbox(ports, {
			organizationId: timesheet.organizationId,
			actorUserId: input.actorUserId,
			correlationId,
			eventType,
			entityType: "hr_timesheet",
			entityId: timesheet.id,
		});
		if (!event.ok) {
			state.timesheets.set(timesheet.id, previous);
			return event;
		}
	}
	return ok({ ...timesheet });
}

async function transitionOvertime(
	state: TimeMemoryState,
	ports: MutationPorts,
	input: {
		organizationId: string;
		requestId: HumanResourcesOvertimeRequestId;
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
		comment?: string;
	},
	next: OvertimeRequest["status"],
	extra?: { comment?: string },
): Promise<Result<OvertimeRequest>> {
	const request = state.overtimeRequests.get(input.requestId);
	if (!request || request.organizationId !== input.organizationId) {
		return notFound("Overtime request not found");
	}
	const versionCheck = assertExpectedVersion(
		request.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) return versionCheck;
	const transition = assertOvertimeStatusTransition(request.status, next);
	if (!transition.ok) return transition;
	const previous = { ...request };
	request.status = next;
	request.version += 1;
	request.updatedBy = input.actorUserId;
	request.updatedAt = new Date();
	if (next === "rejected" || next === "cancelled") {
		state.overtimeApprovals.push({
			id: randomUUID(),
			organizationId: request.organizationId,
			overtimeRequestId: request.id,
			decision: next === "rejected" ? "rejected" : "cancelled",
			approvedMaximumMinutes: null,
			actorUserId: input.actorUserId,
			comment: extra?.comment ?? input.comment ?? null,
			decidedAt: new Date(),
			versionApproved: request.version,
		});
	}
	const recorded = await audit(ports, {
		organizationId: request.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		entity: "hr_overtime_request",
		entityId: request.id,
		action: "UPDATE",
	});
	if (!recorded.ok) {
		state.overtimeRequests.set(request.id, previous);
		if (next === "rejected" || next === "cancelled") {
			state.overtimeApprovals.pop();
		}
		return recorded;
	}
	return ok({ ...request });
}
