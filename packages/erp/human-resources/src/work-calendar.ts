import { ok, type Result } from "@afenda/errors/result";

import type { DayPortion, LeaveUnit } from "./shared/leave-status";

export type WorkCalendarSegmentInput = {
	organizationId: string;
	startDate: string;
	endDate: string;
	unit: LeaveUnit;
	partialDay?: DayPortion;
};

export type WorkCalendarSegment = {
	date: string;
	quantity: string;
	dayPortion: DayPortion;
};

export type WorkCalendarPort = {
	isWorkingDay(input: {
		organizationId: string;
		date: string;
	}): Promise<Result<boolean>>;
	expandLeaveSegments(
		input: WorkCalendarSegmentInput,
	): Promise<Result<WorkCalendarSegment[]>>;
};

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
		async expandLeaveSegments(input) {
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
					});
				}
				cursor = addUtcDays(cursor, 1);
			}

			return ok(segments);
		},
	};
}
