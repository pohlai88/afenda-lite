import { ok, type Result } from "@afenda/errors/result";

import type { DayPortion } from "../shared/leave-status";
import type {
	WorkCalendarPort,
	WorkCalendarSegment,
	WorkCalendarSegmentInput,
} from "../time/work-calendar";

function parseIsoDate(value: string): Date {
	const [yearText, monthText, dayText] = value.split("-");
	const year = Number(yearText);
	const month = Number(monthText);
	const day = Number(dayText);
	if (
		!Number.isInteger(year) ||
		!Number.isInteger(month) ||
		!Number.isInteger(day)
	) {
		throw new RangeError(`Invalid ISO date: ${value}`);
	}
	return new Date(Date.UTC(year, month - 1, day));
}

function formatIsoDate(value: Date): string {
	return value.toISOString().slice(0, 10);
}

function isWeekend(value: Date): boolean {
	const day = value.getUTCDay();
	return day === 0 || day === 6;
}

function addUtcDays(value: Date, days: number): Date {
	const next = new Date(value);
	next.setUTCDate(next.getUTCDate() + days);
	return next;
}

function quantityForPortion(dayPortion: DayPortion): string {
	switch (dayPortion) {
		case "morning":
		case "afternoon":
			return "0.5";
		default:
			return "1";
	}
}

/** Test-only weekend calendar — Mon–Fri working; hours unit treats every day as working. */
export function createMemoryWorkCalendar(): WorkCalendarPort {
	return {
		async isWorkingDay(input) {
			try {
				const date = parseIsoDate(input.date);
				return ok(!isWeekend(date));
			} catch {
				return ok(false);
			}
		},
		async expandLeaveSegments(
			input: WorkCalendarSegmentInput,
		): Promise<Result<WorkCalendarSegment[]>> {
			const dayPortion = input.partialDay ?? "full";
			const segments: WorkCalendarSegment[] = [];
			let cursor = parseIsoDate(input.startDate);
			const end = parseIsoDate(input.endDate);

			while (cursor <= end) {
				const date = formatIsoDate(cursor);
				const working = input.unit === "hours" ? true : !isWeekend(cursor);
				if (working) {
					segments.push({
						date,
						quantity: quantityForPortion(dayPortion),
						dayPortion,
						calendarVersion: "memory-v1",
					});
				}
				cursor = addUtcDays(cursor, 1);
			}

			return ok(segments);
		},
	};
}
