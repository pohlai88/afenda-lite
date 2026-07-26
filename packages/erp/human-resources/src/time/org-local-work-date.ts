import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesWorkCalendarId } from "../brands";
import {
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	resolveEmployeeWorkCalendar,
	type EmployeeWorkCalendarStoreSlice,
} from "./employee-work-calendar-resolution";
import type { AssignmentContextQueryPort } from "./handoff/ports";
import { civilDateInTimeZone } from "./legal-minute-allocation";
import { lineageEligibleWorkCalendar } from "./work-calendar-lineage";

/**
 * Canonical org-local civil work date (`yyyy-MM-dd`) for an instant in an IANA timezone.
 *
 * Contract (Slice 4.9):
 * - **Organization-local work date** — civil date in the resolved employment work-calendar timezone.
 * - **Calendar timezone** — IANA on the active resolved work calendar.
 * - **Payroll handoff timezone** — display timezone on timesheet entry lines (leave from calendar;
 *   attendance from session source timezone). `ApprovedTimeHandoff` carries minute totals only.
 * - **Overtime authority effective date** — org-local civil date of the overtime window start instant.
 * - **Cross-midnight / DST** — minute walks and civil-date helpers in `legal-minute-allocation` /
 *   `calendar-resolution` (noon-UTC weekday anchor).
 *
 * UTC residual: stored instants remain UTC `Date` / ISO; handoff aggregates omit timezone.
 */
export { civilDateInTimeZone as organizationLocalWorkDate };

/** Org-local civil date for an instant when calendar IANA timezone is already resolved. */
export function resolveOrganizationLocalWorkDateFromCalendar(input: {
	instant: Date;
	timezone: string;
}): string {
	return civilDateInTimeZone(input.instant, input.timezone);
}

/** Overtime approval-authority `asOf` from the overtime window start and calendar timezone. */
export function resolveOvertimeAuthorityAsOf(input: {
	requestedStartsAt: Date;
	calendarTimezone: string;
}): string {
	return civilDateInTimeZone(input.requestedStartsAt, input.calendarTimezone);
}

type EmploymentCalendarStoreSlice = EmployeeWorkCalendarStoreSlice;

async function loadActiveCalendarTimezone(input: {
	organizationId: string;
	calendarId: HumanResourcesWorkCalendarId;
	store: EmploymentCalendarStoreSlice;
}): Promise<Result<{ timezone: string }>> {
	const calendar = await input.store.getWorkCalendar({
		organizationId: input.organizationId,
		calendarId: input.calendarId,
	});
	if (!calendar.ok) {
		return calendar;
	}
	if (
		calendar.data === null ||
		!lineageEligibleWorkCalendar(calendar.data)
	) {
		return fail(
			"NOT_FOUND",
			"Work calendar not found.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
		);
	}
	return ok({ timezone: calendar.data.timezone });
}

/**
 * Resolve org-local work date for an employment at an instant.
 *
 * Bootstrap: provisional UTC civil date selects the calendar assignment; org-local civil date is
 * derived from the calendar IANA timezone. When local and UTC civil dates differ, calendar
 * assignment is re-resolved once using the org-local date.
 */
export async function resolveEmploymentOrganizationLocalWorkDate(
	input: {
		organizationId: string;
		employeeId: string;
		employmentId: string;
		instant: Date;
	},
	deps: {
		store: EmploymentCalendarStoreSlice;
		assignmentContext: AssignmentContextQueryPort;
	},
): Promise<Result<{ workDate: string; timezone: string }>> {
	const provisionalAsOf = input.instant.toISOString().slice(0, 10);

	const resolved = await resolveEmployeeWorkCalendar(
		{
			organizationId: input.organizationId,
			employeeId: input.employeeId,
			employmentId: input.employmentId,
			asOf: provisionalAsOf,
		},
		deps,
	);
	if (!resolved.ok) {
		return resolved;
	}

	const calendarTimezone = await loadActiveCalendarTimezone({
		organizationId: input.organizationId,
		calendarId: resolved.data.calendarId,
		store: deps.store,
	});
	if (!calendarTimezone.ok) {
		return calendarTimezone;
	}

	let timezone = calendarTimezone.data.timezone;
	let workDate = civilDateInTimeZone(input.instant, timezone);

	if (workDate !== provisionalAsOf) {
		const reResolved = await resolveEmployeeWorkCalendar(
			{
				organizationId: input.organizationId,
				employeeId: input.employeeId,
				employmentId: input.employmentId,
				asOf: workDate,
			},
			deps,
		);
		if (!reResolved.ok) {
			return reResolved;
		}
		const reCalendarTimezone = await loadActiveCalendarTimezone({
			organizationId: input.organizationId,
			calendarId: reResolved.data.calendarId,
			store: deps.store,
		});
		if (!reCalendarTimezone.ok) {
			return reCalendarTimezone;
		}
		timezone = reCalendarTimezone.data.timezone;
		workDate = civilDateInTimeZone(input.instant, timezone);
	}

	return ok({ workDate, timezone });
}
