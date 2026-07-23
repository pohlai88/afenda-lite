import {
	and,
	db,
	eq,
	gte,
	hrEmploymentCalendarAssignment,
	hrWorkCalendar,
	hrWorkCalendarHoliday,
	isNull,
	lte,
	or,
	sql,
} from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../../error-codes";
import type {
	ResolvedWorkCalendarContext,
	WorkCalendarHoliday,
	WorkCalendarLookupPort,
	WorkWeekDayPattern,
} from "../../work-calendar";

const DEFAULT_MON_FRI_WEEK: WorkWeekDayPattern[] = [
	{ dayOfWeek: 0, isWorkingDay: false, standardStartTime: null, standardEndTime: null, standardMinutes: null },
	{ dayOfWeek: 1, isWorkingDay: true, standardStartTime: "09:00", standardEndTime: "17:00", standardMinutes: 480 },
	{ dayOfWeek: 2, isWorkingDay: true, standardStartTime: "09:00", standardEndTime: "17:00", standardMinutes: 480 },
	{ dayOfWeek: 3, isWorkingDay: true, standardStartTime: "09:00", standardEndTime: "17:00", standardMinutes: 480 },
	{ dayOfWeek: 4, isWorkingDay: true, standardStartTime: "09:00", standardEndTime: "17:00", standardMinutes: 480 },
	{ dayOfWeek: 5, isWorkingDay: true, standardStartTime: "09:00", standardEndTime: "17:00", standardMinutes: 480 },
	{ dayOfWeek: 6, isWorkingDay: false, standardStartTime: null, standardEndTime: null, standardMinutes: null },
];

function parseWorkWeek(value: unknown): WorkWeekDayPattern[] {
	if (!Array.isArray(value)) {
		return DEFAULT_MON_FRI_WEEK;
	}
	const parsed: WorkWeekDayPattern[] = [];
	for (const entry of value) {
		if (typeof entry !== "object" || entry === null) {
			continue;
		}
		const record = entry as Record<string, unknown>;
		const dayOfWeek = Number(record.dayOfWeek);
		if (
			!Number.isInteger(dayOfWeek) ||
			dayOfWeek < 0 ||
			dayOfWeek > 6 ||
			typeof record.isWorkingDay !== "boolean"
		) {
			continue;
		}
		parsed.push({
			dayOfWeek: dayOfWeek as WorkWeekDayPattern["dayOfWeek"],
			isWorkingDay: record.isWorkingDay,
			standardStartTime:
				typeof record.standardStartTime === "string"
					? record.standardStartTime
					: null,
			standardEndTime:
				typeof record.standardEndTime === "string"
					? record.standardEndTime
					: null,
			standardMinutes:
				typeof record.standardMinutes === "number"
					? record.standardMinutes
					: null,
		});
	}
	return parsed.length === 7 ? parsed : DEFAULT_MON_FRI_WEEK;
}

export function createDrizzleWorkCalendarLookup(): WorkCalendarLookupPort {
	return {
		async resolveCalendarContext(input): Promise<
			Result<ResolvedWorkCalendarContext>
		> {
			const assignmentRows = await db
				.select({
					calendarId: hrEmploymentCalendarAssignment.calendarId,
					locationCode: hrEmploymentCalendarAssignment.locationCode,
					jurisdiction: hrEmploymentCalendarAssignment.jurisdiction,
					effectiveFrom: hrEmploymentCalendarAssignment.effectiveFrom,
					effectiveTo: hrEmploymentCalendarAssignment.effectiveTo,
				})
				.from(hrEmploymentCalendarAssignment)
				.where(
					and(
						eq(
							hrEmploymentCalendarAssignment.organizationId,
							input.organizationId,
						),
						eq(hrEmploymentCalendarAssignment.employmentId, input.employmentId),
						eq(hrEmploymentCalendarAssignment.employeeId, input.employeeId),
						lte(hrEmploymentCalendarAssignment.effectiveFrom, input.toDate),
						or(
							isNull(hrEmploymentCalendarAssignment.effectiveTo),
							gte(hrEmploymentCalendarAssignment.effectiveTo, input.fromDate),
						),
					),
				)
				.orderBy(sql`${hrEmploymentCalendarAssignment.effectiveFrom} DESC`)
				.limit(1);

			let calendarId: string | null = assignmentRows[0]?.calendarId ?? null;
			let locationCode: string | null =
				assignmentRows[0]?.locationCode ?? null;
			let jurisdiction: string | null =
				assignmentRows[0]?.jurisdiction ?? null;

			if (calendarId === null) {
				const orgDefault = await db
					.select({
						id: hrWorkCalendar.id,
					})
					.from(hrWorkCalendar)
					.where(
						and(
							eq(hrWorkCalendar.organizationId, input.organizationId),
							eq(hrWorkCalendar.status, "active"),
							eq(hrWorkCalendar.code, "DEFAULT"),
							lte(hrWorkCalendar.effectiveFrom, input.toDate),
							or(
								isNull(hrWorkCalendar.effectiveTo),
								gte(hrWorkCalendar.effectiveTo, input.fromDate),
							),
						),
					)
					.limit(1);
				calendarId = orgDefault[0]?.id ?? null;
			}

			if (calendarId === null) {
				const anyActive = await db
					.select({
						id: hrWorkCalendar.id,
					})
					.from(hrWorkCalendar)
					.where(
						and(
							eq(hrWorkCalendar.organizationId, input.organizationId),
							eq(hrWorkCalendar.status, "active"),
							lte(hrWorkCalendar.effectiveFrom, input.toDate),
							or(
								isNull(hrWorkCalendar.effectiveTo),
								gte(hrWorkCalendar.effectiveTo, input.fromDate),
							),
						),
					)
					.orderBy(sql`${hrWorkCalendar.effectiveFrom} DESC`)
					.limit(1);
				calendarId = anyActive[0]?.id ?? null;
			}

			if (calendarId === null) {
				return fail(
					"NOT_FOUND",
					"No active work calendar is assigned for this employment.",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}

			const calendarRows = await db
				.select()
				.from(hrWorkCalendar)
				.where(
					and(
						eq(hrWorkCalendar.organizationId, input.organizationId),
						eq(hrWorkCalendar.id, calendarId),
					),
				)
				.limit(1);

			const calendar = calendarRows[0];
			if (calendar === undefined) {
				return fail(
					"NOT_FOUND",
					"Work calendar not found.",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}

			if (calendar.status !== "active") {
				return fail(
					"CONFLICT",
					"Work calendar is not active.",
					humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
					),
				);
			}

			const holidayRows = await db
				.select({
					holidayDate: hrWorkCalendarHoliday.holidayDate,
					label: hrWorkCalendarHoliday.label,
					locationCode: hrWorkCalendarHoliday.locationCode,
					jurisdiction: hrWorkCalendarHoliday.jurisdiction,
					overrideKind: hrWorkCalendarHoliday.overrideKind,
					isWorkingDay: hrWorkCalendarHoliday.isWorkingDay,
					expectedMinutes: hrWorkCalendarHoliday.expectedMinutes,
				})
				.from(hrWorkCalendarHoliday)
				.where(
					and(
						eq(hrWorkCalendarHoliday.organizationId, input.organizationId),
						eq(hrWorkCalendarHoliday.calendarId, calendarId),
						gte(hrWorkCalendarHoliday.holidayDate, input.fromDate),
						lte(hrWorkCalendarHoliday.holidayDate, input.toDate),
					),
				);

			const holidays: WorkCalendarHoliday[] = [];
			for (const row of holidayRows) {
				const kind = row.overrideKind;
				if (
					kind !== "holiday" &&
					kind !== "half_day" &&
					kind !== "shortened_day" &&
					kind !== "replacement_workday" &&
					kind !== "closure"
				) {
					return fail(
						"CONFLICT",
						"Work calendar date override kind is invalid.",
						humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
						),
					);
				}
				holidays.push({
					date: row.holidayDate,
					label: row.label,
					locationCode: row.locationCode,
					jurisdiction: row.jurisdiction,
					overrideKind: kind,
					isWorkingDay: row.isWorkingDay,
					expectedMinutes: row.expectedMinutes,
				});
			}

			const standardHours = Number(calendar.standardHoursPerDay);
			if (!Number.isFinite(standardHours) || standardHours <= 0) {
				return fail(
					"CONFLICT",
					"Work calendar standard hours are invalid.",
					humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
					),
				);
			}

			return ok({
				calendarId: calendar.id,
				calendarVersion: calendar.calendarVersion,
				timezone: calendar.timezone,
				workWeek: parseWorkWeek(calendar.workWeekJson),
				standardHoursPerDay: standardHours,
				holidays,
				shiftWindows: [],
				locationCode,
				jurisdiction,
			});
		},
	};
}

export { DEFAULT_MON_FRI_WEEK };
