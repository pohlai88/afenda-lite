import { fail, ok, type Result } from "@afenda/errors/result";

import {
	parseHumanResourcesEmployeeId,
	parseHumanResourcesEmploymentId,
} from "../brands";
import type { HumanResourcesStore } from "../store";
import { resolveEmployeeWorkCalendar } from "./employee-work-calendar-resolution";
import type { AssignmentContextQueryPort } from "./handoff/ports";
import { createStoreAssignmentContextQuery } from "./store-assignment-context-query";
import type {
	ResolvedWorkCalendarContext,
	WorkCalendarHoliday,
	WorkCalendarLookupPort,
	WorkWeekDayPattern,
} from "./work-calendar";

/** Builds a WorkCalendarLookupPort backed by HumanResourcesStore (memory or Drizzle). */
export function createStoreWorkCalendarLookup(input: {
	store: HumanResourcesStore;
	assignmentContext?: AssignmentContextQueryPort;
}): WorkCalendarLookupPort {
	const { store } = input;
	const assignmentContext =
		input.assignmentContext ?? createStoreAssignmentContextQuery({ store });

	return {
		async resolveCalendarContext(
			query,
		): Promise<Result<ResolvedWorkCalendarContext>> {
			const employeeId = parseHumanResourcesEmployeeId(query.employeeId);
			if (!employeeId.ok) return employeeId;
			const employmentId = parseHumanResourcesEmploymentId(query.employmentId);
			if (!employmentId.ok) return employmentId;

			const resolved = await resolveEmployeeWorkCalendar(
				{
					organizationId: query.organizationId,
					employeeId: query.employeeId,
					employmentId: query.employmentId,
					asOf: query.toDate,
				},
				{ store, assignmentContext },
			);
			if (!resolved.ok) {
				return resolved;
			}

			const employmentAssignment = await store.resolveEmploymentCalendar({
				organizationId: query.organizationId,
				employeeId: employeeId.data,
				employmentId: employmentId.data,
				asOf: query.toDate,
			});
			if (!employmentAssignment.ok) {
				return employmentAssignment;
			}

			const calendar = await store.getWorkCalendar({
				organizationId: query.organizationId,
				calendarId: resolved.data.calendarId,
			});
			if (!calendar.ok) return calendar;
			if (calendar.data === null) {
				return fail("NOT_FOUND", "Work calendar not found");
			}

			const holidayRows = await store.listWorkCalendarHolidays({
				organizationId: query.organizationId,
				calendarId: resolved.data.calendarId,
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
				locationCode: employmentAssignment.data?.locationCode ?? null,
				jurisdiction: employmentAssignment.data?.jurisdiction ?? null,
			});
		},
	};
}
