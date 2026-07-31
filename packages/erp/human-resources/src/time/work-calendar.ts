import type { Result } from "@afenda/errors";

import type { DayPortion, LeaveUnit } from "../shared/leave-status";
import type { WorkCalendarDateOverrideKind } from "../types";

export interface WorkCalendarSegmentInput {
	employeeId: string;
	employmentId: string;
	endDate: string;
	organizationId: string;
	partialDay?: DayPortion | undefined;
	startDate: string;
	unit: LeaveUnit;
}

export interface WorkCalendarSegment {
	/** Calendar definition version / id used for this segment. */
	calendarVersion: string;
	date: string;
	dayPortion: DayPortion;
	quantity: string;
}

export interface WorkCalendarHoliday {
	date: string;
	expectedMinutes: number | null;
	isWorkingDay: boolean;
	jurisdiction: string | null;
	label: string | null;
	locationCode: string | null;
	overrideKind: WorkCalendarDateOverrideKind;
}

export interface WorkCalendarDayResolution {
	expectedMinutes: number | null;
	isWorkingDay: boolean;
	overrideKind: WorkCalendarDateOverrideKind | null;
}

export interface WorkCalendarShiftWindow {
	/** Local wall-clock HH:mm — may be before startTime when overnight */
	endTime: string;
	expectedMinutes: number;
	overnight: boolean;
	/** Local wall-clock HH:mm */
	startTime: string;
}

/** Day-of-week bitmask: 0 = Sunday … 6 = Saturday (JS getUTCDay / local weekday). */
export interface WorkWeekDayPattern {
	dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
	isWorkingDay: boolean;
	standardEndTime: string | null;
	standardMinutes: number | null;
	standardStartTime: string | null;
}

export interface ResolvedWorkCalendarContext {
	calendarId: string;
	calendarVersion: string;
	holidays: readonly WorkCalendarHoliday[];
	jurisdiction: string | null;
	locationCode: string | null;
	shiftWindows: readonly WorkCalendarShiftWindow[];
	standardHoursPerDay: number;
	timezone: string;
	workWeek: readonly WorkWeekDayPattern[];
}

export interface WorkCalendarLookupPort {
	resolveCalendarContext: (input: {
		organizationId: string;
		employeeId: string;
		employmentId: string;
		fromDate: string;
		toDate: string;
	}) => Promise<Result<ResolvedWorkCalendarContext>>;
}

export interface WorkCalendarPort {
	expandLeaveSegments: (
		input: WorkCalendarSegmentInput,
	) => Promise<Result<WorkCalendarSegment[]>>;
	isWorkingDay: (input: {
		organizationId: string;
		employeeId: string;
		employmentId: string;
		date: string;
	}) => Promise<Result<boolean>>;
}
