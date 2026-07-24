import { fail, ok, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "./error-codes";
import type { DayPortion } from "./shared/leave-status";
import {
	isWorkingCivilDate,
	resolveWorkCalendarCivilDay,
} from "./time/calendar-resolution";
import type {
	ResolvedWorkCalendarContext,
	WorkCalendarLookupPort,
	WorkCalendarPort,
	WorkCalendarSegment,
	WorkCalendarSegmentInput,
} from "./time/work-calendar";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

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

function quantityForPortion(
	dayPortion: DayPortion,
	unit: WorkCalendarSegmentInput["unit"],
	context: ResolvedWorkCalendarContext,
	isoDate: string,
): string {
	const resolution = resolveWorkCalendarCivilDay(context, isoDate);
	const dayMinutes =
		resolution.expectedMinutes ??
		(Number.isFinite(context.standardHoursPerDay) &&
		context.standardHoursPerDay > 0
			? Math.round(context.standardHoursPerDay * 60)
			: 0);
	const dayHours =
		dayMinutes > 0 ? dayMinutes / 60 : context.standardHoursPerDay;

	if (unit === "hours") {
		const hours =
			dayPortion === "morning" || dayPortion === "afternoon"
				? dayHours / 2
				: dayHours;
		return String(hours);
	}
	switch (dayPortion) {
		case "morning":
		case "afternoon":
			return "0.5";
		default:
			return "1";
	}
}

function overnightShiftCoversDate(
	context: ResolvedWorkCalendarContext,
	_isoDate: string,
): boolean {
	if (context.shiftWindows.length === 0) {
		return false;
	}
	return context.shiftWindows.some((window) => window.overnight);
}

async function resolveContext(
	lookup: WorkCalendarLookupPort,
	input: {
		organizationId: string;
		employeeId: string;
		employmentId: string;
		fromDate: string;
		toDate: string;
	},
): Promise<Result<ResolvedWorkCalendarContext>> {
	const resolved = await lookup.resolveCalendarContext(input);
	if (!resolved.ok) {
		return resolved;
	}
	if (resolved.data.timezone.trim().length === 0) {
		return fail(
			"CONFLICT",
			"Work calendar timezone is missing.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE),
		);
	}
	return resolved;
}

export function createProductionWorkCalendar(deps: {
	lookup: WorkCalendarLookupPort;
}): WorkCalendarPort {
	const { lookup } = deps;

	return {
		async isWorkingDay(input) {
			const context = await resolveContext(lookup, {
				organizationId: input.organizationId,
				employeeId: input.employeeId,
				employmentId: input.employmentId,
				fromDate: input.date,
				toDate: input.date,
			});
			if (!context.ok) {
				return context;
			}
			return ok(isWorkingCivilDate(context.data, input.date));
		},

		async expandLeaveSegments(
			input: WorkCalendarSegmentInput,
		): Promise<Result<WorkCalendarSegment[]>> {
			const startParts = parseIsoDateParts(input.startDate);
			const endParts = parseIsoDateParts(input.endDate);
			if (startParts === null || endParts === null) {
				return fail(
					"VALIDATION_ERROR",
					"Leave dates must be valid ISO calendar dates.",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
				);
			}

			const context = await resolveContext(lookup, {
				organizationId: input.organizationId,
				employeeId: input.employeeId,
				employmentId: input.employmentId,
				fromDate: input.startDate,
				toDate: input.endDate,
			});
			if (!context.ok) {
				return context;
			}

			const dayPortion = input.partialDay ?? "full";
			const segments: WorkCalendarSegment[] = [];
			let cursor = startParts;
			const endKey = formatIsoDateFromParts(endParts);

			while (true) {
				const date = formatIsoDateFromParts(cursor);
				const working =
					input.unit === "hours"
						? isWorkingCivilDate(context.data, date) ||
							overnightShiftCoversDate(context.data, date)
						: isWorkingCivilDate(context.data, date);

				if (working) {
					segments.push({
						date,
						quantity: quantityForPortion(
							dayPortion,
							input.unit,
							context.data,
							date,
						),
						dayPortion,
						calendarVersion: context.data.calendarVersion,
					});
				}

				if (date === endKey) {
					break;
				}
				cursor = addCalendarDays(cursor, 1);
			}

			return ok(segments);
		},
	};
}
