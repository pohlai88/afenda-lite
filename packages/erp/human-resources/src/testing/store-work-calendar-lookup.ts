import { fail, ok, type Result } from "@afenda/errors/result";

import {
	parseHumanResourcesEmployeeId,
	parseHumanResourcesEmploymentId,
} from "../brands";
import type { HumanResourcesStore } from "../store";
import type {
	ResolvedWorkCalendarContext,
	WorkCalendarHoliday,
	WorkCalendarLookupPort,
	WorkWeekDayPattern,
} from "../work-calendar";

/**
 * Builds a WorkCalendarLookupPort from a HumanResourcesStore for calendar
 * resolution (memory or Drizzle).
 */
export function createStoreWorkCalendarLookup(input: {
	store: HumanResourcesStore;
}): WorkCalendarLookupPort {
	const { store } = input;

	return {
		async resolveCalendarContext(
			query,
		): Promise<Result<ResolvedWorkCalendarContext>> {
			const employeeId = parseHumanResourcesEmployeeId(query.employeeId);
			if (!employeeId.ok) return employeeId;
			const employmentId = parseHumanResourcesEmploymentId(query.employmentId);
			if (!employmentId.ok) return employmentId;

			const assignment = await store.resolveEmploymentCalendar({
				organizationId: query.organizationId,
				employeeId: employeeId.data,
				employmentId: employmentId.data,
				asOf: query.toDate,
			});
			if (!assignment.ok) return assignment;
			if (assignment.data === null) {
				return fail("NOT_FOUND", "No employment calendar assignment found");
			}

			const calendar = await store.getWorkCalendar({
				organizationId: query.organizationId,
				calendarId: assignment.data.calendarId,
			});
			if (!calendar.ok) return calendar;
			if (calendar.data === null) {
				return fail("NOT_FOUND", "Work calendar not found");
			}

			const holidayRows = await store.listWorkCalendarHolidays({
				organizationId: query.organizationId,
				calendarId: assignment.data.calendarId,
				fromDate: query.fromDate,
				toDate: query.toDate,
			});
			if (!holidayRows.ok) return holidayRows;

			const holidays: WorkCalendarHoliday[] = holidayRows.data.map((row) => ({
				date: row.holidayDate,
				label: row.label,
				locationCode: row.locationCode,
				jurisdiction: row.jurisdiction,
				overrideKind: row.overrideKind,
				isWorkingDay: row.isWorkingDay,
				expectedMinutes: row.expectedMinutes,
			}));

			const workWeek = calendar.data.workWeek as readonly WorkWeekDayPattern[];
			const standardHours = Number(calendar.data.standardHoursPerDay);
			if (!Number.isFinite(standardHours) || standardHours <= 0) {
				return fail("CONFLICT", "Work calendar standard hours are invalid");
			}

			return ok({
				calendarId: calendar.data.id,
				calendarVersion: calendar.data.calendarVersion,
				timezone: calendar.data.timezone,
				workWeek,
				standardHoursPerDay: standardHours,
				holidays,
				shiftWindows: [],
				locationCode: assignment.data.locationCode,
				jurisdiction: assignment.data.jurisdiction,
			});
		},
	};
}
