import type { Result } from "@afenda/errors/result";

import type { DayPortion, LeaveUnit } from "../shared/leave-status";
import type { WorkCalendarDateOverrideKind } from "../types";

export type WorkCalendarSegmentInput = {
	organizationId: string;
	employeeId: string;
	employmentId: string;
	startDate: string;
	endDate: string;
	unit: LeaveUnit;
	partialDay?: DayPortion;
};

export type WorkCalendarSegment = {
	date: string;
	quantity: string;
	dayPortion: DayPortion;
	/** Calendar definition version / id used for this segment. */
	calendarVersion: string;
};

export type WorkCalendarHoliday = {
	date: string;
	locationCode: string | null;
	jurisdiction: string | null;
	label: string | null;
	overrideKind: WorkCalendarDateOverrideKind;
	isWorkingDay: boolean;
	expectedMinutes: number | null;
};

export type WorkCalendarDayResolution = {
	isWorkingDay: boolean;
	expectedMinutes: number | null;
	overrideKind: WorkCalendarDateOverrideKind | null;
};

export type WorkCalendarShiftWindow = {
	/** Local wall-clock HH:mm */
	startTime: string;
	/** Local wall-clock HH:mm — may be before startTime when overnight */
	endTime: string;
	overnight: boolean;
	expectedMinutes: number;
};

/** Day-of-week bitmask: 0 = Sunday … 6 = Saturday (JS getUTCDay / local weekday). */
export type WorkWeekDayPattern = {
	dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
	isWorkingDay: boolean;
	standardStartTime: string | null;
	standardEndTime: string | null;
	standardMinutes: number | null;
};

export type ResolvedWorkCalendarContext = {
	calendarId: string;
	calendarVersion: string;
	timezone: string;
	workWeek: readonly WorkWeekDayPattern[];
	standardHoursPerDay: number;
	holidays: readonly WorkCalendarHoliday[];
	shiftWindows: readonly WorkCalendarShiftWindow[];
	locationCode: string | null;
	jurisdiction: string | null;
};

export type WorkCalendarLookupPort = {
	resolveCalendarContext(input: {
		organizationId: string;
		employeeId: string;
		employmentId: string;
		fromDate: string;
		toDate: string;
	}): Promise<Result<ResolvedWorkCalendarContext>>;
};

export type WorkCalendarPort = {
	isWorkingDay(input: {
		organizationId: string;
		employeeId: string;
		employmentId: string;
		date: string;
	}): Promise<Result<boolean>>;
	expandLeaveSegments(
		input: WorkCalendarSegmentInput,
	): Promise<Result<WorkCalendarSegment[]>>;
};
