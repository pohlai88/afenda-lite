/**
 * Memory vs Drizzle parity — HR Time / calendar.
 */

import { afterAll, describe, expect, it } from "vitest";

import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import { createProductionWorkCalendar } from "../src/production-work-calendar";
import {
	recordAttendanceEvent,
	recordClockIn,
} from "../src/time/attendance/events";
import { resolveAttendanceSession } from "../src/time/attendance/sessions";
import {
	addCalendarDateOverride,
	assignEmploymentCalendar,
	createWorkCalendar,
	resolveEmploymentCalendar,
	supersedeWorkCalendar,
} from "../src/time/calendar";
import { resolveWorkCalendarCivilDay } from "../src/time/calendar-resolution";
import { getApprovedTimeHandoff } from "../src/time/handoff/approved-time-handoff";
import { assignTimeApprovalAuthority } from "../src/time/policy";
import {
	assignShift,
	listShiftAssignmentSegments,
	publishShiftAssignment,
} from "../src/time/scheduling";
import {
	activateShift,
	addShiftBreak,
	createShift,
	listShiftBreaks,
	supersedeShift,
} from "../src/time/shift";
import {
	addTimesheetEntry,
	approveTimesheet,
	createTimesheet,
	getTimesheet,
	submitTimesheet,
} from "../src/time/timesheet";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import { cleanupHumanResourcesNeonOrgs } from "./helpers/neon-cleanup";
import { createStoreWorkCalendarLookup } from "./helpers/store-work-calendar-lookup";
import {
	runDrizzleParity,
	STANDARD_WEEK,
	uniqueSuffix,
} from "./helpers/time-parity-shared";

function defineTimeCalendarParitySuite(adapter: WorkforceStoreAdapter): void {
	const suffix = uniqueSuffix(adapter);
	const ORG = `org-hr-time-parity-${suffix}`;
	const ACTOR = `user-hr-time-parity-${suffix}`;
	const _MANAGER = `user-hr-time-mgr-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await cleanupHumanResourcesNeonOrgs([ORG]);
		}
	});

	it("calendar → schedule → attendance → timesheet handoff parity", async () => {
		const ready = createHrParityHarness(adapter);
		const handoffManager = `user-hr-time-handoff-manager-${suffix}`;

		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-emp-${suffix}`,
				idempotencyKey: `idem-emp-${suffix}`,
				employeeNumber: `E-${suffix}`,
				legalName: `Worker ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-employ-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const calendar = await createWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cal-${suffix}`,
				idempotencyKey: `idem-cal-${suffix}`,
				code: `CAL-${suffix}`,
				name: "Parity Calendar",
				timezone: "Asia/Singapore",
				calendarVersion: "v1",
				workWeek: STANDARD_WEEK,
				standardHoursPerDay: "8.00",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(calendar.ok).toBe(true);
		if (!calendar.ok) return;

		const assignedCal = await assignEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cal-assign-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				calendarId: calendar.data.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(assignedCal.ok).toBe(true);

		const resolvedCal = await resolveEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cal-resolve-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				asOf: "2025-07-01",
			},
			ready,
		);
		expect(resolvedCal.ok).toBe(true);
		if (!resolvedCal.ok) return;
		expect(resolvedCal.data?.calendarId).toBe(calendar.data.id);

		const shift = await createShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-shift-${suffix}`,
				idempotencyKey: `idem-shift-${suffix}`,
				code: `DAY-${suffix}`,
				name: "Day",
				shiftKind: "fixed",
				startLocal: "09:00",
				endLocal: "17:00",
				expectedMinutes: 480,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(shift.ok).toBe(true);
		if (!shift.ok) return;

		const activated = await activateShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-shift-act-${suffix}`,
				shiftId: shift.data.id,
				expectedVersion: shift.data.version,
			},
			ready,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) return;

		const assignment = await assignShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-assign-${suffix}`,
				idempotencyKey: `idem-assign-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				shiftId: shift.data.id,
				scheduledDate: "2025-07-01",
				startsAt: "2025-07-01T01:00:00.000Z",
				endsAt: "2025-07-01T09:00:00.000Z",
				timezone: "Asia/Singapore",
				segments: [
					{
						segmentOrder: 1,
						startsAt: "2025-07-01T01:00:00.000Z",
						endsAt: "2025-07-01T05:00:00.000Z",
					},
					{
						segmentOrder: 2,
						startsAt: "2025-07-01T06:00:00.000Z",
						endsAt: "2025-07-01T09:00:00.000Z",
					},
				],
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) return;
		const assignmentSegments = await listShiftAssignmentSegments(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-assign-segments-${suffix}`,
				assignmentId: assignment.data.id,
			},
			ready,
		);
		expect(assignmentSegments.ok).toBe(true);
		if (!assignmentSegments.ok) return;
		expect(
			assignmentSegments.data.map((segment) => segment.segmentOrder),
		).toEqual([1, 2]);

		const published = await publishShiftAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-publish-${suffix}`,
				assignmentId: assignment.data.id,
				expectedVersion: assignment.data.version,
			},
			ready,
		);
		expect(published.ok).toBe(true);
		if (!published.ok) return;
		expect(published.data.publicationStatus).toBe("published");

		const clockIn = await recordClockIn(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cin-${suffix}`,
				idempotencyKey: `idem-cin-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				shiftAssignmentId: assignment.data.id,
				occurredAt: "2025-07-01T01:00:00.000Z",
				sourceTimezone: "Asia/Singapore",
				localWorkDate: "2025-07-01",
			},
			ready,
		);
		expect(clockIn.ok).toBe(true);

		const clockOut = await recordAttendanceEvent(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cout-${suffix}`,
				idempotencyKey: `idem-cout-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				shiftAssignmentId: assignment.data.id,
				eventType: "clock_out",
				occurredAt: "2025-07-01T09:00:00.000Z",
				sourceTimezone: "Asia/Singapore",
				localWorkDate: "2025-07-01",
			},
			ready,
		);
		expect(clockOut.ok).toBe(true);

		const session = await resolveAttendanceSession(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-sess-${suffix}`,
				idempotencyKey: `idem-sess-${suffix}`,
				employeeId: employee.data.id,
				localWorkDate: "2025-07-01",
				timezone: "Asia/Singapore",
			},
			ready,
		);
		expect(session.ok).toBe(true);
		if (!session.ok) return;
		expect(session.data.workedMinutes).toBe(480);

		const timesheet = await createTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ts-${suffix}`,
				idempotencyKey: `idem-ts-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				periodStart: "2025-07-01",
				periodEnd: "2025-07-07",
			},
			ready,
		);
		expect(timesheet.ok).toBe(true);
		if (!timesheet.ok) return;

		const entry = await addTimesheetEntry(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-entry-${suffix}`,
				timesheetId: timesheet.data.id,
				employeeId: employee.data.id,
				workDate: "2025-07-01",
				timezone: "Asia/Singapore",
				sourceType: "attendance",
				sourceReference: session.data.id,
				timeType: "regular",
				recordedMinutes: 480,
				approvedMinutes: 480,
				costCenterId: "cost-center-parity",
				projectId: "project-parity",
				locationId: "location-parity",
				departmentId: "department-parity",
				approvalReference: "approval-parity",
				evidenceReference: "evidence-parity",
			},
			ready,
		);
		expect(entry.ok).toBe(true);
		if (!entry.ok) return;
		expect(entry.data).toMatchObject({
			costCenterId: "cost-center-parity",
			projectId: "project-parity",
			locationId: "location-parity",
			departmentId: "department-parity",
			approvalReference: "approval-parity",
			evidenceReference: "evidence-parity",
		});

		const otEntry = await addTimesheetEntry(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ot-${suffix}`,
				timesheetId: timesheet.data.id,
				employeeId: employee.data.id,
				workDate: "2025-07-01",
				timezone: "Asia/Singapore",
				sourceType: "manual",
				sourceReference: "weekday_overtime",
				timeType: "overtime",
				recordedMinutes: 90,
				approvedMinutes: 90,
			},
			ready,
		);
		expect(otEntry.ok).toBe(true);

		const current = await getTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ts-get-${suffix}`,
				timesheetId: timesheet.data.id,
			},
			ready,
		);
		expect(current.ok).toBe(true);
		if (!current.ok || current.data === null) return;

		const submitted = await submitTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-submit-${suffix}`,
				timesheetId: current.data.id,
				expectedVersion: current.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) return;
		const authority = await assignTimeApprovalAuthority(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-authority-${suffix}`,
				targetActorUserId: handoffManager,
				authority: "line_manager",
				effectiveFrom: "2020-01-01",
			},
			ready,
		);
		expect(authority.ok).toBe(true);
		if (!authority.ok) return;

		const approved = await approveTimesheet(
			{
				organizationId: ORG,
				actorUserId: handoffManager,
				correlationId: `corr-approve-${suffix}`,
				authority: "line_manager",
				timesheetId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;

		const handoff = await getApprovedTimeHandoff(
			{
				organizationId: ORG,
				actorUserId: handoffManager,
				correlationId: `corr-handoff-${suffix}`,
				timesheetId: approved.data.id,
			},
			ready,
		);
		expect(handoff.ok).toBe(true);
		if (!handoff.ok || handoff.data === null) return;
		expect(handoff.data.regularMinutes).toBe(480);
		expect(handoff.data.overtime).toEqual([
			{ type: "weekday_overtime", minutes: 90 },
		]);
	});

	it("effective-dated calendar and shift successor parity", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-successor-employee-${suffix}`,
				idempotencyKey: `idem-successor-employee-${suffix}`,
				employeeNumber: `ES-${suffix}`,
				legalName: `Successor Worker ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;
		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-successor-employment-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;
		const calendar = await createWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-successor-calendar-${suffix}`,
				idempotencyKey: `idem-successor-calendar-${suffix}`,
				code: `SUCCESSOR-CAL-${suffix}`,
				name: "Successor Calendar v1",
				timezone: "UTC",
				calendarVersion: "v1",
				workWeek: STANDARD_WEEK,
				standardHoursPerDay: "8.00",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(calendar.ok).toBe(true);
		if (!calendar.ok) return;
		const assigned = await assignEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-successor-calendar-assign-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				calendarId: calendar.data.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(assigned.ok).toBe(true);
		const calendarSuccessor = await supersedeWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-successor-calendar-create-${suffix}`,
				idempotencyKey: `idem-successor-calendar-create-${suffix}`,
				calendarId: calendar.data.id,
				expectedVersion: calendar.data.version,
				calendarVersion: "v2",
				effectiveFrom: "2025-08-01",
				standardHoursPerDay: "7.50",
			},
			ready,
		);
		expect(calendarSuccessor.ok).toBe(true);
		if (!calendarSuccessor.ok) return;
		const historicalCalendar = await resolveEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-successor-calendar-historical-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				asOf: "2025-07-31",
			},
			ready,
		);
		expect(historicalCalendar.ok).toBe(true);
		if (!historicalCalendar.ok) return;
		expect(historicalCalendar.data?.calendarId).toBe(calendar.data.id);
		const futureCalendar = await resolveEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-successor-calendar-future-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				asOf: "2025-08-01",
			},
			ready,
		);
		expect(futureCalendar.ok).toBe(true);
		if (!futureCalendar.ok) return;
		expect(futureCalendar.data?.calendarId).toBe(
			calendarSuccessor.data.successor.id,
		);
		const unrelatedCalendar = await createWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-successor-calendar-unrelated-${suffix}`,
				idempotencyKey: `idem-successor-calendar-unrelated-${suffix}`,
				code: calendar.data.code,
				name: "Unrelated same-code calendar",
				timezone: "UTC",
				calendarVersion: "unrelated",
				workWeek: STANDARD_WEEK,
				standardHoursPerDay: "6.00",
				effectiveFrom: "2025-09-01",
			},
			ready,
		);
		expect(unrelatedCalendar.ok).toBe(true);
		const isolatedCalendar = await resolveEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-successor-calendar-isolated-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				asOf: "2025-10-01",
			},
			ready,
		);
		expect(isolatedCalendar.ok).toBe(true);
		if (!isolatedCalendar.ok) return;
		expect(isolatedCalendar.data?.calendarId).toBe(
			calendarSuccessor.data.successor.id,
		);

		const shift = await createShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-successor-shift-${suffix}`,
				idempotencyKey: `idem-successor-shift-${suffix}`,
				code: `SUCCESSOR-SHIFT-${suffix}`,
				name: "Successor Shift v1",
				shiftKind: "fixed",
				startLocal: "09:00",
				endLocal: "17:00",
				expectedMinutes: 480,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(shift.ok).toBe(true);
		if (!shift.ok) return;
		const shiftBreak = await addShiftBreak(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-successor-shift-break-${suffix}`,
				shiftId: shift.data.id,
				durationMinutes: 60,
				startOffsetMinutes: 240,
			},
			ready,
		);
		expect(shiftBreak.ok).toBe(true);
		const activeShift = await activateShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-successor-shift-activate-${suffix}`,
				shiftId: shift.data.id,
				expectedVersion: shift.data.version,
			},
			ready,
		);
		expect(activeShift.ok).toBe(true);
		if (!activeShift.ok) return;
		const shiftSuccessor = await supersedeShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-successor-shift-create-${suffix}`,
				idempotencyKey: `idem-successor-shift-create-${suffix}`,
				shiftId: activeShift.data.id,
				expectedVersion: activeShift.data.version,
				effectiveFrom: "2025-08-01",
				endLocal: "16:30",
				expectedMinutes: 450,
			},
			ready,
		);
		expect(shiftSuccessor.ok).toBe(true);
		if (!shiftSuccessor.ok) return;
		expect(shiftSuccessor.data.superseded).toMatchObject({
			status: "superseded",
			effectiveTo: "2025-07-31",
		});
		expect(shiftSuccessor.data.successor.supersedesShiftId).toBe(
			activeShift.data.id,
		);
		const clonedBreaks = await listShiftBreaks(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-successor-shift-breaks-${suffix}`,
				shiftId: shiftSuccessor.data.successor.id,
			},
			ready,
		);
		expect(clonedBreaks.ok).toBe(true);
		if (!clonedBreaks.ok) return;
		expect(clonedBreaks.data).toHaveLength(1);
		expect(clonedBreaks.data[0]?.durationMinutes).toBe(60);
	});

	it("normal, holiday, half-day, and replacement calendar days resolve identically", async () => {
		const ready = createHrParityHarness(adapter);
		expect(ready.store).toBeDefined();
		if (ready.store === undefined) return;

		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-emp-ov-${suffix}`,
				idempotencyKey: `idem-emp-ov-${suffix}`,
				employeeNumber: `EOV-${suffix}`,
				legalName: `Override Worker ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-employ-ov-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const calendar = await createWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cal-ov-${suffix}`,
				idempotencyKey: `idem-cal-ov-${suffix}`,
				code: `OV-${suffix}`,
				name: "Override Parity Calendar",
				timezone: "UTC",
				calendarVersion: "v1",
				workWeek: STANDARD_WEEK,
				standardHoursPerDay: "8.00",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(calendar.ok).toBe(true);
		if (!calendar.ok) return;

		const assigned = await assignEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cal-assign-ov-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				calendarId: calendar.data.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(assigned.ok).toBe(true);
		if (!assigned.ok) return;

		const override = await addCalendarDateOverride(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-override-${suffix}`,
				calendarId: calendar.data.id,
				holidayDate: "2025-01-07",
				overrideKind: "half_day",
				isWorkingDay: true,
				expectedMinutes: 240,
				label: "Half day",
			},
			ready,
		);
		expect(override.ok).toBe(true);
		if (!override.ok) return;
		expect(override.data.overrideKind).toBe("half_day");
		expect(override.data.expectedMinutes).toBe(240);
		const holiday = await addCalendarDateOverride(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-override-holiday-${suffix}`,
				calendarId: calendar.data.id,
				holidayDate: "2025-01-08",
				overrideKind: "holiday",
				label: "Public holiday",
			},
			ready,
		);
		expect(holiday.ok).toBe(true);
		if (!holiday.ok) return;
		const replacement = await addCalendarDateOverride(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-override-replacement-${suffix}`,
				calendarId: calendar.data.id,
				holidayDate: "2025-01-11",
				overrideKind: "replacement_workday",
				isWorkingDay: true,
				label: "Replacement Saturday",
			},
			ready,
		);
		expect(replacement.ok).toBe(true);
		if (!replacement.ok) return;

		const lookup = createStoreWorkCalendarLookup({ store: ready.store });
		const context = await lookup.resolveCalendarContext({
			organizationId: ORG,
			employeeId: employee.data.id,
			employmentId: employment.data.id,
			fromDate: "2025-01-07",
			toDate: "2025-01-11",
		});
		expect(context.ok).toBe(true);
		if (!context.ok) return;
		const halfDay = resolveWorkCalendarCivilDay(context.data, "2025-01-07");
		expect(halfDay.isWorkingDay).toBe(true);
		expect(halfDay.expectedMinutes).toBe(240);
		expect(halfDay.overrideKind).toBe("half_day");
		const holidayDay = resolveWorkCalendarCivilDay(context.data, "2025-01-08");
		expect(holidayDay.isWorkingDay).toBe(false);
		expect(holidayDay.expectedMinutes).toBeNull();
		expect(holidayDay.overrideKind).toBe("holiday");
		const normalDay = resolveWorkCalendarCivilDay(context.data, "2025-01-09");
		expect(normalDay.isWorkingDay).toBe(true);
		expect(normalDay.expectedMinutes).toBe(480);
		expect(normalDay.overrideKind).toBeNull();
		const replacementDay = resolveWorkCalendarCivilDay(
			context.data,
			"2025-01-11",
		);
		expect(replacementDay.isWorkingDay).toBe(true);
		expect(replacementDay.expectedMinutes).toBe(480);
		expect(replacementDay.overrideKind).toBe("replacement_workday");

		const production = createProductionWorkCalendar({ lookup });
		const working = await production.isWorkingDay({
			organizationId: ORG,
			employeeId: employee.data.id,
			employmentId: employment.data.id,
			date: "2025-01-07",
		});
		expect(working.ok).toBe(true);
		if (!working.ok) return;
		expect(working.data).toBe(true);
	});
}

describe("human-resources.time.calendar.parity (memory)", () => {
	defineTimeCalendarParitySuite("memory");
});

describe.runIf(runDrizzleParity)(
	"human-resources.time.calendar.parity (drizzle)",
	() => {
		defineTimeCalendarParitySuite("drizzle");
	},
);
