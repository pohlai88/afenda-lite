import { ok, type Result } from "@afenda/errors/result";

import type {
	ResolvedWorkCalendarContext,
	WorkCalendarHoliday,
	WorkCalendarLookupPort,
	WorkWeekDayPattern,
} from "../time/work-calendar";

const MON_FRI: WorkWeekDayPattern[] = [
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

export type MemoryWorkCalendarLookupHolidayInput = Omit<
	WorkCalendarHoliday,
	"overrideKind" | "isWorkingDay" | "expectedMinutes"
> & {
	overrideKind?: WorkCalendarHoliday["overrideKind"];
	isWorkingDay?: boolean;
	expectedMinutes?: number | null;
};

export type MemoryWorkCalendarLookupOptions = {
	timezone?: string;
	calendarVersion?: string;
	workWeek?: readonly WorkWeekDayPattern[];
	standardHoursPerDay?: number;
	holidays?: readonly MemoryWorkCalendarLookupHolidayInput[];
};

/** In-memory calendar context for production-work-calendar unit tests. */
export function createMemoryWorkCalendarLookup(
	options: MemoryWorkCalendarLookupOptions = {},
): WorkCalendarLookupPort {
	const holidays = (options.holidays ?? []).map((holiday) => ({
		date: holiday.date,
		locationCode: holiday.locationCode,
		jurisdiction: holiday.jurisdiction,
		label: holiday.label,
		overrideKind: holiday.overrideKind ?? ("holiday" as const),
		isWorkingDay: holiday.isWorkingDay ?? false,
		expectedMinutes: holiday.expectedMinutes ?? null,
	}));

	const context: ResolvedWorkCalendarContext = {
		calendarId: "cal-memory",
		calendarVersion: options.calendarVersion ?? "memory-lookup-v1",
		timezone: options.timezone ?? "UTC",
		workWeek: options.workWeek ?? MON_FRI,
		standardHoursPerDay: options.standardHoursPerDay ?? 8,
		holidays,
		shiftWindows: [],
		locationCode: null,
		jurisdiction: null,
	};

	return {
		async resolveCalendarContext(): Promise<
			Result<ResolvedWorkCalendarContext>
		> {
			return ok(context);
		},
	};
}
