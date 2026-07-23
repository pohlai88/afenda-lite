/**
 * Memory vs Drizzle parity for time management (HR Time).
 */

import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { afterAll, describe, expect, it } from "vitest";

import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import { HUMAN_RESOURCES_ERROR_CONFLICT } from "../src/error-codes";
import {
	correctAttendanceEvent,
	getAttendanceEvent,
	listAttendanceEvents,
	recordAttendanceEvent,
	recordClockIn,
	recordClockOut,
} from "../src/time/attendance/events";
import {
	ATTENDANCE_SESSION_DETECTION_SOURCE,
	parseExceptionDetectionRemarks,
} from "../src/time/attendance/exception-detection";
import { listUnresolvedAttendanceExceptions } from "../src/time/attendance/exceptions";
import { importAttendanceEvents } from "../src/time/attendance/import";
import { resolveAttendanceSession } from "../src/time/attendance/sessions";
import { createProductionWorkCalendar } from "../src/production-work-calendar";
import {
	addCalendarDateOverride,
	assignEmploymentCalendar,
	createWorkCalendar,
	resolveEmploymentCalendar,
} from "../src/time/calendar";
import { resolveWorkCalendarCivilDay } from "../src/time/calendar-resolution";
import { getApprovedTimeHandoff } from "../src/time/handoff/approved-time-handoff";
import {
	assignShift,
	publishShiftAssignment,
} from "../src/time/scheduling";
import { activateShift, createShift } from "../src/time/shift";
import {
	addTimesheetEntry,
	approveTimesheet,
	createTimesheet,
	getTimesheet,
	reopenTimesheet,
	returnTimesheet,
	submitTimesheet,
} from "../src/time/timesheet";
import { cleanupHumanResourcesNeonOrgs } from "./helpers/neon-cleanup";
import { humanResourcesCodeFromResult } from "./helpers/result-details";
import { createStoreWorkCalendarLookup } from "./helpers/store-work-calendar-lookup";
import {
	createWorkforceHarness,
	type WorkforceStoreAdapter,
} from "./helpers/workforce-harness";

const { hasDatabase } = resolveDatabaseUrlForTests();

const STANDARD_WEEK = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
	dayOfWeek: dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
	isWorkingDay: dayOfWeek >= 1 && dayOfWeek <= 5,
	standardStartTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "09:00" : null,
	standardEndTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "17:00" : null,
	standardMinutes: dayOfWeek >= 1 && dayOfWeek <= 5 ? 480 : null,
}));

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defineTimeParitySuite(adapter: WorkforceStoreAdapter): void {
	const suffix = uniqueSuffix(adapter);
	const ORG = `org-hr-time-parity-${suffix}`;
	const ACTOR = `user-hr-time-parity-${suffix}`;
	const MANAGER = `user-hr-time-mgr-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await cleanupHumanResourcesNeonOrgs([ORG]);
		}
	});

	it("calendar → schedule → attendance → timesheet handoff parity", async () => {
		const ready = createWorkforceHarness(adapter);

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
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) return;

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
			},
			ready,
		);
		expect(entry.ok).toBe(true);

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

		const approved = await approveTimesheet(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: `corr-approve-${suffix}`,
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
				actorUserId: MANAGER,
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

	it("half-day calendar override resolves identically for store lookup", async () => {
		const ready = createWorkforceHarness(adapter);
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

		const lookup = createStoreWorkCalendarLookup({ store: ready.store });
		const context = await lookup.resolveCalendarContext({
			organizationId: ORG,
			employeeId: employee.data.id,
			employmentId: employment.data.id,
			fromDate: "2025-01-07",
			toDate: "2025-01-07",
		});
		expect(context.ok).toBe(true);
		if (!context.ok) return;
		const day = resolveWorkCalendarCivilDay(context.data, "2025-01-07");
		expect(day.isWorkingDay).toBe(true);
		expect(day.expectedMinutes).toBe(240);
		expect(day.overrideKind).toBe("half_day");

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

	it("importAttendanceEvents source_reference idempotency parity", async () => {
		const ready = createWorkforceHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-imp-emp-${suffix}`,
				idempotencyKey: `idem-imp-emp-${suffix}`,
				employeeNumber: `EI-${suffix}`,
				legalName: `Importer ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const first = await importAttendanceEvents(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-imp-1-${suffix}`,
				idempotencyKey: `idem-imp-batch-${suffix}`,
				batchId: `batch-imp-${suffix}`,
				sourceKey: "parity-terminal",
				events: [
					{
						employeeId: employee.data.id,
						eventType: "clock_in",
						occurredAt: "2025-07-15T01:00:00.000Z",
						sourceTimezone: "UTC",
						localWorkDate: "2025-07-15",
						sourceReference: `ext-${suffix}`,
					},
				],
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) return;
		expect(first.data.status).toBe("completed");
		expect(first.data.totals.accepted).toBe(1);

		const second = await importAttendanceEvents(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-imp-2-${suffix}`,
				idempotencyKey: `idem-imp-batch-2-${suffix}`,
				batchId: `batch-imp-2-${suffix}`,
				sourceKey: "parity-terminal",
				events: [
					{
						employeeId: employee.data.id,
						eventType: "clock_in",
						occurredAt: "2025-07-15T01:00:00.000Z",
						sourceTimezone: "UTC",
						localWorkDate: "2025-07-15",
						sourceReference: `ext-${suffix}`,
					},
				],
			},
			ready,
		);
		expect(second.ok).toBe(true);
		if (!second.ok) return;
		expect(second.data.totals.skipped).toBe(1);
		expect(second.data.totals.accepted).toBe(0);

		const listed = await listAttendanceEvents(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-imp-list-${suffix}`,
				employeeId: employee.data.id,
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) return;
		expect(listed.data).toHaveLength(1);
	});

	it("auto-detects late_arrival on session resolve (P0-06)", async () => {
		const ready = createWorkforceHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p06-emp-${suffix}`,
				idempotencyKey: `idem-p06-emp-${suffix}`,
				employeeNumber: `EP06-${suffix}`,
				legalName: `Detector ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;
		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p06-employ-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const shift = await createShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p06-shift-${suffix}`,
				idempotencyKey: `idem-p06-shift-${suffix}`,
				code: `P06-${suffix}`,
				name: "P06 Day",
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
				correlationId: `corr-p06-act-${suffix}`,
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
				correlationId: `corr-p06-assign-${suffix}`,
				idempotencyKey: `idem-p06-assign-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				shiftId: shift.data.id,
				scheduledDate: "2025-07-25",
				startsAt: "2025-07-25T01:00:00.000Z",
				endsAt: "2025-07-25T09:00:00.000Z",
				timezone: "Asia/Singapore",
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) return;
		const published = await publishShiftAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p06-pub-${suffix}`,
				assignmentId: assignment.data.id,
				expectedVersion: assignment.data.version,
			},
			ready,
		);
		expect(published.ok).toBe(true);
		if (!published.ok) return;

		const clockIn = await recordClockIn(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p06-cin-${suffix}`,
				idempotencyKey: `idem-p06-cin-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				shiftAssignmentId: assignment.data.id,
				occurredAt: "2025-07-25T01:25:00.000Z",
				sourceTimezone: "Asia/Singapore",
				localWorkDate: "2025-07-25",
			},
			ready,
		);
		expect(clockIn.ok).toBe(true);
		if (!clockIn.ok) return;
		const clockOut = await recordClockOut(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p06-cout-${suffix}`,
				idempotencyKey: `idem-p06-cout-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				shiftAssignmentId: assignment.data.id,
				occurredAt: "2025-07-25T09:00:00.000Z",
				sourceTimezone: "Asia/Singapore",
				localWorkDate: "2025-07-25",
			},
			ready,
		);
		expect(clockOut.ok).toBe(true);
		if (!clockOut.ok) return;

		const session = await resolveAttendanceSession(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p06-sess-${suffix}`,
				idempotencyKey: `idem-p06-sess-${suffix}`,
				employeeId: employee.data.id,
				localWorkDate: "2025-07-25",
				timezone: "Asia/Singapore",
			},
			ready,
		);
		expect(session.ok).toBe(true);
		if (!session.ok) return;

		const unresolved = await listUnresolvedAttendanceExceptions(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: `corr-p06-exc-${suffix}`,
				employeeId: employee.data.id,
			},
			ready,
		);
		expect(unresolved.ok).toBe(true);
		if (!unresolved.ok) return;
		const late = unresolved.data.filter((exception) => {
			const remarks = parseExceptionDetectionRemarks(exception.remarks);
			return (
				exception.exceptionType === "late_arrival" &&
				remarks?.detectionSource === ATTENDANCE_SESSION_DETECTION_SOURCE
			);
		});
		expect(late).toHaveLength(1);
	});

	it("timesheet return → reopen → approve → handoff parity", async () => {
		const ready = createWorkforceHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-ts-emp-${suffix}`,
				idempotencyKey: `idem-p07-ts-emp-${suffix}`,
				employeeNumber: `EP07TS-${suffix}`,
				legalName: `Timesheet Parity ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;
		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-ts-employ-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const timesheet = await createTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-ts-create-${suffix}`,
				idempotencyKey: `idem-p07-ts-create-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				periodStart: "2025-07-28",
				periodEnd: "2025-07-28",
			},
			ready,
		);
		expect(timesheet.ok).toBe(true);
		if (!timesheet.ok) return;

		const entry = await addTimesheetEntry(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-ts-entry-${suffix}`,
				timesheetId: timesheet.data.id,
				employeeId: employee.data.id,
				workDate: "2025-07-28",
				timezone: "Asia/Singapore",
				sourceType: "manual",
				timeType: "regular",
				recordedMinutes: 480,
				approvedMinutes: 480,
			},
			ready,
		);
		expect(entry.ok).toBe(true);

		const current = await getTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-ts-get-${suffix}`,
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
				correlationId: `corr-p07-ts-submit-${suffix}`,
				timesheetId: current.data.id,
				expectedVersion: current.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) return;

		const returned = await returnTimesheet(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: `corr-p07-ts-return-${suffix}`,
				timesheetId: submitted.data.id,
				approverNotes: "parity return",
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(returned.ok).toBe(true);
		if (!returned.ok) return;
		expect(returned.data.status).toBe("returned");

		const reopened = await reopenTimesheet(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: `corr-p07-ts-reopen-${suffix}`,
				timesheetId: returned.data.id,
				expectedVersion: returned.data.version,
			},
			ready,
		);
		expect(reopened.ok).toBe(true);
		if (!reopened.ok) return;
		expect(reopened.data.status).toBe("draft");

		const resubmitted = await submitTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-ts-resubmit-${suffix}`,
				timesheetId: reopened.data.id,
				expectedVersion: reopened.data.version,
			},
			ready,
		);
		expect(resubmitted.ok).toBe(true);
		if (!resubmitted.ok) return;

		const approved = await approveTimesheet(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: `corr-p07-ts-approve-${suffix}`,
				timesheetId: resubmitted.data.id,
				expectedVersion: resubmitted.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;
		expect(approved.data.status).toBe("approved");

		const handoff = await getApprovedTimeHandoff(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: `corr-p07-ts-handoff-${suffix}`,
				timesheetId: approved.data.id,
			},
			ready,
		);
		expect(handoff.ok).toBe(true);
		if (!handoff.ok || handoff.data === null) return;
		expect(handoff.data.regularMinutes).toBe(480);
	});

	it("correctAttendanceEvent parity", async () => {
		const ready = createWorkforceHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-corr-emp-${suffix}`,
				idempotencyKey: `idem-p07-corr-emp-${suffix}`,
				employeeNumber: `EP07C-${suffix}`,
				legalName: `Correct Parity ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;
		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-corr-employ-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const clockIn = await recordClockIn(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-corr-cin-${suffix}`,
				idempotencyKey: `idem-p07-corr-cin-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				occurredAt: "2025-07-29T01:00:00.000Z",
				sourceTimezone: "Asia/Singapore",
				localWorkDate: "2025-07-29",
			},
			ready,
		);
		expect(clockIn.ok).toBe(true);
		if (!clockIn.ok) return;

		const corrected = await correctAttendanceEvent(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: `corr-p07-corr-${suffix}`,
				eventId: clockIn.data.id,
				occurredAt: "2025-07-29T01:10:00.000Z",
				adjustmentReason: "parity correction",
				expectedVersion: clockIn.data.version,
			},
			ready,
		);
		expect(corrected.ok).toBe(true);
		if (!corrected.ok) return;
		expect(corrected.data.id).toBe(clockIn.data.id);
		expect(corrected.data.version).toBe(clockIn.data.version + 1);
		expect(corrected.data.voidedAt).toBeNull();
		expect(corrected.data.occurredAt.toISOString()).toBe(
			"2025-07-29T01:10:00.000Z",
		);

		const fetched = await getAttendanceEvent(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: `corr-p07-corr-get-${suffix}`,
				eventId: clockIn.data.id,
			},
			ready,
		);
		expect(fetched.ok).toBe(true);
		if (!fetched.ok || fetched.data === null) return;
		expect(fetched.data.occurredAt.toISOString()).toBe(
			"2025-07-29T01:10:00.000Z",
		);
	});

	it("rejects overlapping shift assignment parity", async () => {
		const ready = createWorkforceHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-ov-emp-${suffix}`,
				idempotencyKey: `idem-p07-ov-emp-${suffix}`,
				employeeNumber: `EP07OV-${suffix}`,
				legalName: `Overlap Parity ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;
		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-ov-employ-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const shift = await createShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-ov-shift-${suffix}`,
				idempotencyKey: `idem-p07-ov-shift-${suffix}`,
				code: `P07OV-${suffix}`,
				name: "Overlap Day",
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
				correlationId: `corr-p07-ov-act-${suffix}`,
				shiftId: shift.data.id,
				expectedVersion: shift.data.version,
			},
			ready,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) return;

		const first = await assignShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-ov-a1-${suffix}`,
				idempotencyKey: `idem-p07-ov-a1-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				shiftId: shift.data.id,
				scheduledDate: "2025-07-30",
				startsAt: "2025-07-30T01:00:00.000Z",
				endsAt: "2025-07-30T09:00:00.000Z",
				timezone: "Asia/Singapore",
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) return;

		const overlapping = await assignShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-ov-a2-${suffix}`,
				idempotencyKey: `idem-p07-ov-a2-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				shiftId: shift.data.id,
				scheduledDate: "2025-07-30",
				startsAt: "2025-07-30T08:00:00.000Z",
				endsAt: "2025-07-30T16:00:00.000Z",
				timezone: "Asia/Singapore",
			},
			ready,
		);
		expect(overlapping.ok).toBe(false);
		if (overlapping.ok) return;
		expect(humanResourcesCodeFromResult(overlapping)).toBe(
			HUMAN_RESOURCES_ERROR_CONFLICT,
		);
	});
}

describe("human-resources.time.parity (memory)", () => {
	defineTimeParitySuite("memory");
});

describe.runIf(hasDatabase)("human-resources.time.parity (drizzle)", () => {
	defineTimeParitySuite("drizzle");
});
