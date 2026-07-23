import type { Result } from "@afenda/errors/result";
import { ok } from "@afenda/errors/result";

import type {
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentId,
	HumanResourcesShiftAssignmentId,
	HumanResourcesShiftId,
	HumanResourcesTimesheetId,
	HumanResourcesWorkCalendarId,
} from "../brands";
import type { DayPortion } from "../shared/leave-status";
import type { TimesheetEntryCreateRecord } from "../store/time";
import type {
	AttendanceException,
	AttendanceSession,
	Employment,
	EmploymentCalendarAssignment,
	Shift,
	ShiftAssignment,
	Timesheet,
	TimesheetEntry,
	TimesheetEntryTimeType,
	WorkCalendar,
	WorkCalendarHolidayRecord,
} from "../types";
import type {
	ResolvedWorkCalendarContext,
	WorkCalendarHoliday,
	WorkWeekDayPattern,
} from "../work-calendar";
import { resolveWorkCalendarCivilDay } from "./calendar-resolution";
import type { ApprovedLeaveFact } from "./handoff/ports";
import {
	allocateWorkedMinutesByCivilDate,
	attendanceEntrySourceReference,
	sessionBreakIntervals,
	workedMinutesForSessionCivilDate,
} from "./legal-minute-allocation";

export const TIMESHEET_GENERATION_ABSENCE_SOURCE = "timesheet_generation";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type BasicAbsenceDetectionInput = {
	activeEmployment: boolean;
	expectedWorkMinutes: number;
	qualifyingWorkedMinutes: number;
	approvedLeaveCoveredMinutes: number;
};

export type AbsenceDetectionRemarks = {
	workDate: string;
	expectedMinutes: number;
	detectionSource: typeof TIMESHEET_GENERATION_ABSENCE_SOURCE;
	shiftAssignmentId: string | null;
	timesheetId: string;
};

export function iterDatesInclusive(
	periodStart: string,
	periodEnd: string,
): string[] {
	const start = parseIsoDateParts(periodStart);
	const end = parseIsoDateParts(periodEnd);
	if (start === null || end === null) {
		return [];
	}
	const dates: string[] = [];
	let cursor = start;
	const endKey = formatIsoDateFromParts(end);
	while (true) {
		const date = formatIsoDateFromParts(cursor);
		dates.push(date);
		if (date === endKey) {
			break;
		}
		cursor = addCalendarDays(cursor, 1);
	}
	return dates;
}

export function approvedLeaveMinutesForDate(
	workDate: string,
	facts: readonly ApprovedLeaveFact[],
): number {
	let total = 0;
	for (const fact of facts) {
		if (fact.workDate === workDate) {
			total += fact.approvedMinutes;
		}
	}
	return total;
}

export function qualifyingWorkedMinutesForDate(
	workDate: string,
	sessions: readonly AttendanceSession[],
	entries: readonly TimesheetEntry[],
): number {
	let total = 0;
	for (const session of sessions) {
		if (session.resolutionStatus === "resolved") {
			total += workedMinutesForSessionCivilDate(session, workDate);
		}
	}
	for (const entry of entries) {
		if (entry.workDate !== workDate) continue;
		if (entry.sourceType === "attendance" || entry.sourceType === "manual") {
			if (
				entry.timeType === "regular" ||
				entry.timeType === "overtime" ||
				entry.timeType === "night" ||
				entry.timeType === "call_back"
			) {
				total += entry.approvedMinutes;
			}
		}
	}
	return total;
}

export type AttendanceTimesheetEntryPlan = {
	workDate: string;
	sourceReference: string;
	recordedMinutes: number;
	approvedMinutes: number;
};

export function buildAttendanceTimesheetEntryPlans(
	session: AttendanceSession,
): AttendanceTimesheetEntryPlan[] {
	if (
		session.resolutionStatus !== "resolved" ||
		session.firstClockInAt === null ||
		session.finalClockOutAt === null ||
		session.workedMinutes <= 0
	) {
		return [];
	}

	const intervals = sessionBreakIntervals(session);
	if (intervals.length === 0) {
		return [
			{
				workDate: session.localWorkDate,
				sourceReference: session.id,
				recordedMinutes: session.workedMinutes,
				approvedMinutes: session.workedMinutes,
			},
		];
	}

	const allocated = allocateWorkedMinutesByCivilDate({
		firstClockInAt: session.firstClockInAt,
		finalClockOutAt: session.finalClockOutAt,
		breakIntervals: intervals,
		timeZone: session.timezone,
	});
	const plans: AttendanceTimesheetEntryPlan[] = [];
	for (const [workDate, minutes] of allocated) {
		if (minutes <= 0) {
			continue;
		}
		plans.push({
			workDate,
			sourceReference: attendanceEntrySourceReference(session.id, workDate),
			recordedMinutes: minutes,
			approvedMinutes: minutes,
		});
	}
	if (plans.length === 0) {
		return [
			{
				workDate: session.localWorkDate,
				sourceReference: session.id,
				recordedMinutes: session.workedMinutes,
				approvedMinutes: session.workedMinutes,
			},
		];
	}
	return plans;
}

export function isBasicFullDayAbsence(
	input: BasicAbsenceDetectionInput,
): boolean {
	return (
		input.activeEmployment &&
		input.expectedWorkMinutes > 0 &&
		input.qualifyingWorkedMinutes === 0 &&
		input.approvedLeaveCoveredMinutes === 0
	);
}

export function isActiveEmploymentOnDate(
	employment: Employment | null,
	workDate: string,
): boolean {
	if (employment === null) return false;
	if (employment.status !== "active" && employment.status !== "notice") {
		return false;
	}
	if (workDate < employment.startsOn) return false;
	if (employment.endsOn !== null && workDate > employment.endsOn) {
		return false;
	}
	return true;
}

export function leaveTimeType(paid: boolean): TimesheetEntryTimeType {
	return paid ? "training" : "unpaid";
}

export function mapApprovedLeaveFactToEntryInput(input: {
	fact: ApprovedLeaveFact;
	timesheet: Timesheet;
	actorUserId: string;
	correlationId: string;
}): TimesheetEntryCreateRecord {
	const { fact, timesheet, actorUserId, correlationId } = input;
	return {
		organizationId: timesheet.organizationId,
		timesheetId: timesheet.id,
		employeeId: timesheet.employeeId,
		workDate: fact.workDate,
		timezone: fact.timezone,
		sourceType: "leave",
		sourceReference: fact.segmentId,
		timeType: leaveTimeType(fact.paid),
		startedAt: null,
		endedAt: null,
		recordedMinutes: fact.approvedMinutes,
		approvedMinutes: fact.approvedMinutes,
		costCenterId: null,
		projectId: null,
		locationId: null,
		departmentId: null,
		approvalReference: null,
		evidenceReference: null,
		createdBy: actorUserId,
		correlationId,
	};
}

export function encodeAbsenceDetectionRemarks(
	input: AbsenceDetectionRemarks,
): string {
	return JSON.stringify(input);
}

export function parseAbsenceDetectionRemarks(
	remarks: string | null,
): AbsenceDetectionRemarks | null {
	if (remarks === null || remarks.trim().length === 0) {
		return null;
	}
	try {
		const parsed: unknown = JSON.parse(remarks);
		if (
			typeof parsed !== "object" ||
			parsed === null ||
			!("workDate" in parsed) ||
			!("detectionSource" in parsed)
		) {
			return null;
		}
		const record = parsed as Record<string, unknown>;
		if (
			typeof record.workDate !== "string" ||
			record.detectionSource !== TIMESHEET_GENERATION_ABSENCE_SOURCE ||
			typeof record.expectedMinutes !== "number" ||
			typeof record.timesheetId !== "string"
		) {
			return null;
		}
		return {
			workDate: record.workDate,
			expectedMinutes: record.expectedMinutes,
			detectionSource: TIMESHEET_GENERATION_ABSENCE_SOURCE,
			shiftAssignmentId:
				typeof record.shiftAssignmentId === "string"
					? record.shiftAssignmentId
					: record.shiftAssignmentId === null
						? null
						: null,
			timesheetId: record.timesheetId,
		};
	} catch {
		return null;
	}
}

export function hasExistingTimesheetGenerationAbsence(input: {
	exceptions: readonly AttendanceException[];
	employeeId: HumanResourcesEmployeeId;
	workDate: string;
}): boolean {
	return input.exceptions.some((exception) => {
		if (exception.employeeId !== input.employeeId) return false;
		if (exception.exceptionType !== "absence") return false;
		if (
			exception.reviewStatus !== "open" &&
			exception.reviewStatus !== "in_review"
		) {
			return false;
		}
		const decoded = parseAbsenceDetectionRemarks(exception.remarks);
		return decoded?.workDate === input.workDate;
	});
}

export function segmentMinutesFromQuantity(input: {
	unit: "days" | "hours";
	quantity: string;
	dayPortion: DayPortion;
	standardDayMinutes: number;
}): number {
	const quantity = Number(input.quantity);
	if (!Number.isFinite(quantity) || quantity <= 0) {
		return 0;
	}
	if (input.unit === "hours") {
		return Math.round(quantity * 60);
	}
	const dayMinutes =
		input.standardDayMinutes > 0 ? input.standardDayMinutes : 480;
	return Math.round(quantity * dayMinutes);
}

function parseIsoDateParts(value: string): {
	year: number;
	month: number;
	day: number;
} | null {
	const match = ISO_DATE.exec(value);
	if (match === null) {
		return null;
	}
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	if (
		!Number.isInteger(year) ||
		!Number.isInteger(month) ||
		!Number.isInteger(day)
	) {
		return null;
	}
	return { year, month, day };
}

function formatIsoDateFromParts(parts: {
	year: number;
	month: number;
	day: number;
}): string {
	const month = String(parts.month).padStart(2, "0");
	const day = String(parts.day).padStart(2, "0");
	return `${parts.year}-${month}-${day}`;
}

function addCalendarDays(
	parts: { year: number; month: number; day: number },
	days: number,
): { year: number; month: number; day: number } {
	const utc = Date.UTC(parts.year, parts.month - 1, parts.day + days);
	const next = new Date(utc);
	return {
		year: next.getUTCFullYear(),
		month: next.getUTCMonth() + 1,
		day: next.getUTCDate(),
	};
}

/** Narrow helper for callers that need employment id branding. */
export type TimesheetGenerationContext = {
	timesheetId: HumanResourcesTimesheetId;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId | null;
	shiftAssignmentId: HumanResourcesShiftAssignmentId | null;
};

export type ExpectedWorkMinutesHost = {
	getScheduledShiftForEmployeeDate(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		scheduledDate: string;
	}): Promise<Result<ShiftAssignment | null>>;
	getShift(input: {
		organizationId: string;
		shiftId: HumanResourcesShiftId;
	}): Promise<Result<Shift | null>>;
	resolveEmploymentCalendar(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		employmentId: HumanResourcesEmploymentId;
		asOf: string;
	}): Promise<Result<EmploymentCalendarAssignment | null>>;
	getWorkCalendar(input: {
		organizationId: string;
		calendarId: HumanResourcesWorkCalendarId;
	}): Promise<Result<WorkCalendar | null>>;
	listWorkCalendarHolidays(input: {
		organizationId: string;
		calendarId: HumanResourcesWorkCalendarId;
		fromDate: string;
		toDate: string;
	}): Promise<Result<WorkCalendarHolidayRecord[]>>;
};

export type ExpectedWorkMinutesResult = {
	expectedWorkMinutes: number;
	shiftAssignmentId: HumanResourcesShiftAssignmentId | null;
};

/**
 * Published/changed shift expected minutes win; otherwise employment calendar day.
 */
export async function resolveExpectedWorkMinutes(input: {
	host: ExpectedWorkMinutesHost;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId | null;
	workDate: string;
}): Promise<Result<ExpectedWorkMinutesResult>> {
	const scheduled = await input.host.getScheduledShiftForEmployeeDate({
		organizationId: input.organizationId,
		employeeId: input.employeeId,
		scheduledDate: input.workDate,
	});
	if (!scheduled.ok) return scheduled;

	if (
		scheduled.data !== null &&
		(scheduled.data.publicationStatus === "published" ||
			scheduled.data.publicationStatus === "changed")
	) {
		const shift = await input.host.getShift({
			organizationId: input.organizationId,
			shiftId: scheduled.data.shiftId,
		});
		if (!shift.ok) return shift;
		if (shift.data !== null && shift.data.expectedMinutes > 0) {
			return ok({
				expectedWorkMinutes: shift.data.expectedMinutes,
				shiftAssignmentId: scheduled.data.id,
			});
		}
	}

	if (input.employmentId === null) {
		return ok({ expectedWorkMinutes: 0, shiftAssignmentId: null });
	}

	const assignment = await input.host.resolveEmploymentCalendar({
		organizationId: input.organizationId,
		employeeId: input.employeeId,
		employmentId: input.employmentId,
		asOf: input.workDate,
	});
	if (!assignment.ok) return assignment;
	if (assignment.data === null) {
		return ok({ expectedWorkMinutes: 0, shiftAssignmentId: null });
	}

	const calendar = await input.host.getWorkCalendar({
		organizationId: input.organizationId,
		calendarId: assignment.data.calendarId,
	});
	if (!calendar.ok) return calendar;
	if (calendar.data === null) {
		return ok({ expectedWorkMinutes: 0, shiftAssignmentId: null });
	}

	const holidays = await input.host.listWorkCalendarHolidays({
		organizationId: input.organizationId,
		calendarId: assignment.data.calendarId,
		fromDate: input.workDate,
		toDate: input.workDate,
	});
	if (!holidays.ok) return holidays;

	const holidayFacts: WorkCalendarHoliday[] = holidays.data.map((row) => ({
		date: row.holidayDate,
		label: row.label,
		locationCode: row.locationCode,
		jurisdiction: row.jurisdiction,
		overrideKind: row.overrideKind,
		isWorkingDay: row.isWorkingDay,
		expectedMinutes: row.expectedMinutes,
	}));

	const standardHours = Number(calendar.data.standardHoursPerDay);
	const context: ResolvedWorkCalendarContext = {
		calendarId: calendar.data.id,
		calendarVersion: calendar.data.calendarVersion,
		timezone: calendar.data.timezone,
		workWeek: calendar.data.workWeek as readonly WorkWeekDayPattern[],
		standardHoursPerDay:
			Number.isFinite(standardHours) && standardHours > 0 ? standardHours : 8,
		holidays: holidayFacts,
		shiftWindows: [],
		locationCode: assignment.data.locationCode,
		jurisdiction: assignment.data.jurisdiction,
	};

	const resolution = resolveWorkCalendarCivilDay(context, input.workDate);
	return ok({
		expectedWorkMinutes:
			resolution.isWorkingDay && resolution.expectedMinutes !== null
				? resolution.expectedMinutes
				: 0,
		shiftAssignmentId: scheduled.data?.id ?? null,
	});
}
