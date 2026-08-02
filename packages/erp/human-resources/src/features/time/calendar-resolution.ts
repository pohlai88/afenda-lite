import type { WorkCalendarDateOverrideKind } from "../../kernel/contracts";
import type {
	ResolvedWorkCalendarContext,
	WorkCalendarDayResolution,
	WorkCalendarHoliday,
	WorkWeekDayPattern,
} from "./work-calendar";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEKDAY_BY_SHORT_LABEL: Readonly<Record<string, number>> = {
	Fri: 5,
	Mon: 1,
	Sat: 6,
	Sun: 0,
	Thu: 4,
	Tue: 2,
	Wed: 3,
};

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
		!(
			Number.isInteger(year) &&
			Number.isInteger(month) &&
			Number.isInteger(day)
		)
	) {
		return null;
	}
	return { year, month, day };
}

/**
 * Weekday in the calendar's IANA timezone for a civil date (yyyy-MM-dd).
 * Uses noon UTC on that civil date so DST transitions do not shift the day.
 */
export function weekdayInTimeZone(isoDate: string, timeZone: string): number {
	const parts = parseIsoDateParts(isoDate);
	if (parts === null) {
		return Number.NaN;
	}
	const instant = new Date(
		Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0),
	);
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone,
		weekday: "short",
	});
	const label = formatter.format(instant);
	return WEEKDAY_BY_SHORT_LABEL[label] ?? Number.NaN;
}

function patternForDay(
	workWeek: readonly WorkWeekDayPattern[],
	dayOfWeek: number,
): WorkWeekDayPattern | undefined {
	return workWeek.find((entry) => entry.dayOfWeek === dayOfWeek);
}

function overrideMatchesContext(
	holiday: WorkCalendarHoliday,
	context: ResolvedWorkCalendarContext,
	isoDate: string,
): boolean {
	if (holiday.date !== isoDate) {
		return false;
	}
	if (
		holiday.locationCode !== null &&
		context.locationCode !== null &&
		holiday.locationCode !== context.locationCode
	) {
		return false;
	}
	if (
		holiday.jurisdiction !== null &&
		context.jurisdiction !== null &&
		holiday.jurisdiction !== context.jurisdiction
	) {
		return false;
	}
	return true;
}

function findMatchingOverride(
	context: ResolvedWorkCalendarContext,
	isoDate: string,
): WorkCalendarHoliday | null {
	return (
		context.holidays.find((holiday) =>
			overrideMatchesContext(holiday, context, isoDate),
		) ?? null
	);
}

function standardMinutesFromContext(
	context: ResolvedWorkCalendarContext,
): number {
	const hours = context.standardHoursPerDay;
	if (!Number.isFinite(hours) || hours <= 0) {
		return 0;
	}
	return Math.round(hours * 60);
}

function resolveExpectedMinutes(
	override: WorkCalendarHoliday,
	pattern: WorkWeekDayPattern | undefined,
	context: ResolvedWorkCalendarContext,
): number | null {
	if (override.expectedMinutes !== null) {
		return override.expectedMinutes;
	}
	if (!override.isWorkingDay) {
		return null;
	}
	const patternMinutes = pattern?.standardMinutes;
	if (patternMinutes !== null && patternMinutes !== undefined) {
		return patternMinutes;
	}
	const standard = standardMinutesFromContext(context);
	return standard > 0 ? standard : null;
}

/**
 * Resolve whether a civil date is a working day and its expected minutes,
 * applying date overrides (holiday, half-day, shortened day, replacement workday).
 */
export function resolveWorkCalendarCivilDay(
	context: ResolvedWorkCalendarContext,
	isoDate: string,
): WorkCalendarDayResolution {
	const weekday = weekdayInTimeZone(isoDate, context.timezone);
	const pattern = Number.isInteger(weekday)
		? patternForDay(context.workWeek, weekday)
		: undefined;
	const override = findMatchingOverride(context, isoDate);

	if (override !== null) {
		const kind: WorkCalendarDateOverrideKind = override.overrideKind;
		return {
			isWorkingDay: override.isWorkingDay,
			expectedMinutes: resolveExpectedMinutes(override, pattern, context),
			overrideKind: kind,
		};
	}

	if (pattern === undefined) {
		return {
			isWorkingDay: false,
			expectedMinutes: null,
			overrideKind: null,
		};
	}

	if (!pattern.isWorkingDay) {
		return {
			isWorkingDay: false,
			expectedMinutes: null,
			overrideKind: null,
		};
	}
	const fromPattern = pattern.standardMinutes;
	const fromStandard = standardMinutesFromContext(context);
	return {
		isWorkingDay: true,
		expectedMinutes: fromPattern ?? (fromStandard > 0 ? fromStandard : null),
		overrideKind: null,
	};
}

export function isWorkingCivilDate(
	context: ResolvedWorkCalendarContext,
	isoDate: string,
): boolean {
	return resolveWorkCalendarCivilDay(context, isoDate).isWorkingDay;
}
