/**
 * Memory vs Drizzle parity for time management (HR Time).
 */

import { fail } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_TIME_TIMESHEET_APPROVAL_STEP_RECORDED_EVENT,
	HUMAN_RESOURCES_TIMESHEET_APPROVED_EVENT,
} from "@afenda/events/schemas";
import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { afterAll, describe, expect, it } from "vitest";

import { createEmployee } from "../src/core/employee";
import { amendEmployment, createEmployment } from "../src/core/employment";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	HUMAN_RESOURCES_ERROR_STALE_VERSION,
} from "../src/error-codes";
import { grantLeaveEntitlement } from "../src/leave/entitlement";
import {
	createLeavePolicy,
	publishLeavePolicy,
} from "../src/leave/leave-policy";
import {
	approveLeaveRequest,
	createDraftLeaveRequest,
	submitLeaveRequest,
} from "../src/leave/leave-request";
import { assignPrimaryReportingLine } from "../src/organization/reporting-line";
import { createProductionWorkCalendar } from "../src/production-work-calendar";
import {
	approveAttendanceBreakWaiver,
	listAttendanceBreakWaiverDecisions,
} from "../src/time/attendance/break-waivers";
import {
	correctAttendanceEvent,
	getAttendanceEvent,
	listAttendanceAdjustments,
	listAttendanceEvents,
	recordAttendanceEvent,
	recordBreakEnd,
	recordBreakStart,
	recordClockIn,
	recordClockOut,
	recordManualAttendance,
} from "../src/time/attendance/events";
import {
	ATTENDANCE_SESSION_DETECTION_SOURCE,
	parseExceptionDetectionRemarks,
} from "../src/time/attendance/exception-detection";
import { listUnresolvedAttendanceExceptions } from "../src/time/attendance/exceptions";
import { importAttendanceEvents } from "../src/time/attendance/import";
import { namespacedImportSourceReference } from "../src/time/attendance/import-keys";
import { resolveAttendanceSession } from "../src/time/attendance/sessions";
import {
	addCalendarDateOverride,
	assignEmploymentCalendar,
	createWorkCalendar,
	getWorkCalendar,
	resolveEmploymentCalendar,
	supersedeWorkCalendar,
} from "../src/time/calendar";
import { resolveWorkCalendarCivilDay } from "../src/time/calendar-resolution";
import { getApprovedTimeHandoff } from "../src/time/handoff/approved-time-handoff";
import {
	approveOvertimeRequest,
	createOvertimeRequest,
	getOvertimeRequest,
	recordOvertimeActual,
	verifyOvertimeRequest,
} from "../src/time/overtime";
import {
	activateTimePolicy,
	assignTimeApprovalAuthority,
	assignTimePolicy,
	createTimePolicy,
	endTimeApprovalAuthorityAssignment,
	resolveTimePolicy,
	supersedeTimePolicy,
} from "../src/time/policy";
import {
	assignShift,
	changeShiftAssignment,
	getScheduledShiftForEmployeeDate,
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
	generateTimesheetEntries,
	getTimesheet,
	listTimesheetApprovalDecisions,
	listTimesheetEntries,
	lockTimesheet,
	removeTimesheetEntry,
	reopenTimesheet,
	returnTimesheet,
	submitTimesheet,
	supersedeTimesheet,
	updateTimesheetEntry,
} from "../src/time/timesheet";
import {
	parseAbsenceDetectionRemarks,
	TIMESHEET_GENERATION_ABSENCE_SOURCE,
} from "../src/time/timesheet-generation";
import type { AttendanceExceptionType } from "../src/types";
import { mapActorToEmployee } from "./helpers/identity-resolver";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { cleanupHumanResourcesNeonOrgs } from "./helpers/neon-cleanup";
import { humanResourcesCodeFromResult } from "./helpers/result-details";
import { createStoreWorkCalendarLookup } from "./helpers/store-work-calendar-lookup";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";

const { hasDatabase } = resolveDatabaseUrlForTests();
const runDrizzleParity =
	hasDatabase && process.env.REQUIRE_DATABASE_TESTS === "1";

const STANDARD_WEEK = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
	dayOfWeek: dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
	isWorkingDay: dayOfWeek >= 1 && dayOfWeek <= 5,
	standardStartTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "09:00" : null,
	standardEndTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "17:00" : null,
	standardMinutes: dayOfWeek >= 1 && dayOfWeek <= 5 ? 480 : null,
}));

const ALL_ATTENDANCE_EXCEPTION_TYPES = [
	"late_arrival",
	"early_departure",
	"absence",
	"missing_clock_in",
	"missing_clock_out",
	"unplanned_attendance",
	"overlapping_attendance",
	"excessive_break",
	"insufficient_rest",
	"schedule_mismatch",
	"location_mismatch",
	"overtime_candidate",
] as const satisfies readonly AttendanceExceptionType[];

type MissingAttendanceExceptionType = Exclude<
	AttendanceExceptionType,
	(typeof ALL_ATTENDANCE_EXCEPTION_TYPES)[number]
>;

const ATTENDANCE_EXCEPTION_INVENTORY_IS_EXHAUSTIVE: MissingAttendanceExceptionType extends never
	? true
	: never = true;

const ATTENDANCE_EXCEPTION_SEVERITY = {
	late_arrival: "warning",
	early_departure: "warning",
	absence: "warning",
	missing_clock_in: "critical",
	missing_clock_out: "warning",
	unplanned_attendance: "info",
	overlapping_attendance: "critical",
	excessive_break: "warning",
	insufficient_rest: "critical",
	schedule_mismatch: "warning",
	location_mismatch: "warning",
	overtime_candidate: "info",
} as const satisfies Record<
	AttendanceExceptionType,
	"info" | "warning" | "critical"
>;

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

	it("effective-dated time policy successor parity", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-successor-employee-${suffix}`,
				idempotencyKey: `idem-policy-successor-employee-${suffix}`,
				employeeNumber: `EPS-${suffix}`,
				legalName: `Policy Successor Worker ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;
		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-successor-employment-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;
		const policy = await createTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-successor-create-${suffix}`,
				idempotencyKey: `idem-policy-successor-create-${suffix}`,
				code: `POLICY-SUCCESSOR-${suffix}`,
				name: "Policy v1",
				effectiveFrom: "2025-01-01",
				minimumRestMinutes: 660,
				automaticBreakAfterMinutes: 300,
				automaticBreakMinutes: 60,
				approvalSteps: ["line_manager", "hr"],
			},
			ready,
		);
		expect(policy.ok).toBe(true);
		if (!policy.ok) return;
		const activePolicy = await activateTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-successor-activate-${suffix}`,
				policyId: policy.data.id,
				expectedVersion: policy.data.version,
			},
			ready,
		);
		expect(activePolicy.ok).toBe(true);
		if (!activePolicy.ok) return;
		const policyAssignment = await assignTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-successor-assign-${suffix}`,
				policyId: activePolicy.data.id,
				employmentId: employment.data.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(policyAssignment.ok).toBe(true);
		const overlappingPolicyAssignment = await assignTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-successor-overlap-${suffix}`,
				policyId: activePolicy.data.id,
				employmentId: employment.data.id,
				effectiveFrom: "2025-06-01",
			},
			ready,
		);
		expect(overlappingPolicyAssignment.ok).toBe(false);
		if (!overlappingPolicyAssignment.ok) {
			expect(humanResourcesCodeFromResult(overlappingPolicyAssignment)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}
		const successor = await supersedeTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-successor-supersede-${suffix}`,
				idempotencyKey: `idem-policy-successor-supersede-${suffix}`,
				policyId: activePolicy.data.id,
				expectedVersion: activePolicy.data.version,
				name: "Policy v2",
				effectiveFrom: "2025-08-01",
				minimumRestMinutes: 720,
				automaticBreakAfterMinutes: 300,
				automaticBreakMinutes: 45,
				approvalSteps: ["line_manager", "hr"],
			},
			ready,
		);
		expect(successor.ok).toBe(true);
		if (!successor.ok) return;
		expect(successor.data.superseded).toMatchObject({
			id: activePolicy.data.id,
			status: "superseded",
			effectiveTo: "2025-07-31",
		});
		expect(successor.data.successor).toMatchObject({
			status: "active",
			supersedesPolicyId: activePolicy.data.id,
			effectiveFrom: "2025-08-01",
		});
		const historicalPolicy = await resolveTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-successor-historical-${suffix}`,
				employmentId: employment.data.id,
				asOf: "2025-07-31",
			},
			ready,
		);
		expect(historicalPolicy.ok).toBe(true);
		if (!historicalPolicy.ok) return;
		expect(historicalPolicy.data?.id).toBe(activePolicy.data.id);
		const futurePolicy = await resolveTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-successor-future-${suffix}`,
				employmentId: employment.data.id,
				asOf: "2025-08-01",
			},
			ready,
		);
		expect(futurePolicy.ok).toBe(true);
		if (!futurePolicy.ok) return;
		expect(futurePolicy.data?.id).toBe(successor.data.successor.id);
		const unrelatedPolicy = await createTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-successor-unrelated-${suffix}`,
				idempotencyKey: `idem-policy-successor-unrelated-${suffix}`,
				code: policy.data.code,
				name: "Unrelated same-code policy",
				effectiveFrom: "2025-09-01",
				minimumRestMinutes: 480,
				automaticBreakMinutes: 0,
				approvalSteps: ["payroll"],
			},
			ready,
		);
		expect(unrelatedPolicy.ok).toBe(true);
		if (!unrelatedPolicy.ok) return;
		const activeUnrelatedPolicy = await activateTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-successor-unrelated-activate-${suffix}`,
				policyId: unrelatedPolicy.data.id,
				expectedVersion: unrelatedPolicy.data.version,
			},
			ready,
		);
		expect(activeUnrelatedPolicy.ok).toBe(true);
		const isolatedPolicy = await resolveTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-successor-isolated-${suffix}`,
				employmentId: employment.data.id,
				asOf: "2025-10-01",
			},
			ready,
		);
		expect(isolatedPolicy.ok).toBe(true);
		if (!isolatedPolicy.ok) return;
		expect(isolatedPolicy.data?.id).toBe(successor.data.successor.id);
	});

	it("automatic break waiver and ordered approval parity", async () => {
		const ready = createHrParityHarness(adapter);
		const HR_ACTOR = `user-hr-time-hr-${suffix}`;
		const policyManager = `user-hr-time-policy-manager-${suffix}`;
		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-approval-employee-${suffix}`,
				idempotencyKey: `idem-policy-approval-employee-${suffix}`,
				employeeNumber: `EPA-${suffix}`,
				legalName: `Policy Approval Worker ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;
		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-approval-employment-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;
		const policy = await createTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-approval-create-${suffix}`,
				idempotencyKey: `idem-policy-approval-create-${suffix}`,
				code: `POLICY-APPROVAL-${suffix}`,
				name: "Approval Policy",
				effectiveFrom: "2025-01-01",
				minimumRestMinutes: 660,
				automaticBreakAfterMinutes: 300,
				automaticBreakMinutes: 60,
				approvalSteps: ["line_manager", "hr"],
			},
			ready,
		);
		expect(policy.ok).toBe(true);
		if (!policy.ok) return;
		const activePolicy = await activateTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-approval-activate-${suffix}`,
				policyId: policy.data.id,
				expectedVersion: policy.data.version,
			},
			ready,
		);
		expect(activePolicy.ok).toBe(true);
		if (!activePolicy.ok) return;
		const policyAssignment = await assignTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-approval-assign-${suffix}`,
				policyId: activePolicy.data.id,
				employmentId: employment.data.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(policyAssignment.ok).toBe(true);
		const managerAuthority = await assignTimeApprovalAuthority(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-approval-manager-${suffix}`,
				targetActorUserId: policyManager,
				authority: "line_manager",
				effectiveFrom: "2020-01-01",
			},
			ready,
		);
		expect(managerAuthority.ok).toBe(true);
		if (!managerAuthority.ok) return;
		const overlappingManagerAuthority = await assignTimeApprovalAuthority(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-approval-manager-overlap-${suffix}`,
				targetActorUserId: policyManager,
				authority: "line_manager",
				effectiveFrom: "2021-01-01",
			},
			ready,
		);
		expect(overlappingManagerAuthority.ok).toBe(false);
		if (!overlappingManagerAuthority.ok) {
			expect(humanResourcesCodeFromResult(overlappingManagerAuthority)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}
		const hrAuthority = await assignTimeApprovalAuthority(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-approval-hr-${suffix}`,
				targetActorUserId: HR_ACTOR,
				authority: "hr",
				effectiveFrom: "2020-01-01",
			},
			ready,
		);
		expect(hrAuthority.ok).toBe(true);
		if (!hrAuthority.ok) return;
		const clockIn = await recordClockIn(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-approval-clock-in-${suffix}`,
				idempotencyKey: `idem-policy-approval-clock-in-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				occurredAt: "2025-07-15T09:00:00.000Z",
				sourceTimezone: "UTC",
				localWorkDate: "2025-07-15",
			},
			ready,
		);
		expect(clockIn.ok).toBe(true);
		const clockOut = await recordClockOut(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-approval-clock-out-${suffix}`,
				idempotencyKey: `idem-policy-approval-clock-out-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				occurredAt: "2025-07-15T17:00:00.000Z",
				sourceTimezone: "UTC",
				localWorkDate: "2025-07-15",
			},
			ready,
		);
		expect(clockOut.ok).toBe(true);
		const session = await resolveAttendanceSession(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-approval-session-${suffix}`,
				idempotencyKey: `idem-policy-approval-session-${suffix}`,
				employeeId: employee.data.id,
				localWorkDate: "2025-07-15",
				timezone: "UTC",
			},
			ready,
		);
		expect(session.ok).toBe(true);
		if (!session.ok) return;
		expect(session.data).toMatchObject({
			grossMinutes: 480,
			breakMinutes: 60,
			workedMinutes: 420,
		});
		const unauthorizedWaiver = await approveAttendanceBreakWaiver(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-approval-waiver-unauthorized-${suffix}`,
				sessionId: session.data.id,
				authority: "line_manager",
				reason: "Actor has no approval grant",
				evidenceReference: `evidence://waiver/unauthorized/${suffix}`,
				expectedVersion: session.data.version,
			},
			ready,
		);
		expect(unauthorizedWaiver.ok).toBe(false);
		const policyDisallowedWaiver = await approveAttendanceBreakWaiver(
			{
				organizationId: ORG,
				actorUserId: HR_ACTOR,
				correlationId: `corr-policy-approval-waiver-disallowed-${suffix}`,
				sessionId: session.data.id,
				authority: "payroll",
				reason: "Authority is outside the policy",
				evidenceReference: `evidence://waiver/disallowed/${suffix}`,
				expectedVersion: session.data.version,
			},
			ready,
		);
		expect(policyDisallowedWaiver.ok).toBe(false);
		const crossOrganizationWaiver = await approveAttendanceBreakWaiver(
			{
				organizationId: `${ORG}-other`,
				actorUserId: policyManager,
				correlationId: `corr-policy-approval-waiver-cross-org-${suffix}`,
				sessionId: session.data.id,
				authority: "line_manager",
				reason: "Cross-organization reference",
				evidenceReference: `evidence://waiver/cross-org/${suffix}`,
				expectedVersion: session.data.version,
			},
			ready,
		);
		expect(crossOrganizationWaiver.ok).toBe(false);
		const staleWaiver = await approveAttendanceBreakWaiver(
			{
				organizationId: ORG,
				actorUserId: policyManager,
				correlationId: `corr-policy-approval-waiver-stale-${suffix}`,
				sessionId: session.data.id,
				authority: "line_manager",
				reason: "Stale attendance-session version",
				evidenceReference: `evidence://waiver/stale/${suffix}`,
				expectedVersion: session.data.version + 1,
			},
			ready,
		);
		expect(staleWaiver.ok).toBe(false);
		if (!staleWaiver.ok) {
			expect(humanResourcesCodeFromResult(staleWaiver)).toBe(
				HUMAN_RESOURCES_ERROR_STALE_VERSION,
			);
		}
		const waiver = await approveAttendanceBreakWaiver(
			{
				organizationId: ORG,
				actorUserId: policyManager,
				correlationId: `corr-policy-approval-waiver-${suffix}`,
				sessionId: session.data.id,
				authority: "line_manager",
				reason: "Operational break evidence accepted",
				evidenceReference: `evidence://waiver/${suffix}`,
				expectedVersion: session.data.version,
			},
			ready,
		);
		expect(waiver.ok).toBe(true);
		if (!waiver.ok) return;
		expect(waiver.data).toMatchObject({
			policyId: activePolicy.data.id,
			authority: "line_manager",
			automaticBreakMinutes: 60,
			recordedBreakMinutes: 0,
		});
		const duplicateWaiver = await approveAttendanceBreakWaiver(
			{
				organizationId: ORG,
				actorUserId: policyManager,
				correlationId: `corr-policy-approval-waiver-duplicate-${suffix}`,
				sessionId: session.data.id,
				authority: "line_manager",
				reason: "Duplicate waiver attempt",
				evidenceReference: `evidence://waiver/duplicate/${suffix}`,
				expectedVersion: session.data.version,
			},
			ready,
		);
		expect(duplicateWaiver.ok).toBe(false);
		if (!duplicateWaiver.ok) {
			expect(humanResourcesCodeFromResult(duplicateWaiver)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}
		const waiverDecisions = await listAttendanceBreakWaiverDecisions(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-approval-waiver-list-${suffix}`,
				sessionId: session.data.id,
			},
			ready,
		);
		expect(waiverDecisions.ok).toBe(true);
		if (!waiverDecisions.ok) return;
		expect(waiverDecisions.data).toHaveLength(1);

		const timesheet = await createTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-approval-timesheet-${suffix}`,
				idempotencyKey: `idem-policy-approval-timesheet-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				periodStart: "2025-07-01",
				periodEnd: "2025-07-31",
			},
			ready,
		);
		expect(timesheet.ok).toBe(true);
		if (!timesheet.ok) return;
		const submitted = await submitTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-approval-submit-${suffix}`,
				timesheetId: timesheet.data.id,
				expectedVersion: timesheet.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) return;
		const outOfOrderApproval = await approveTimesheet(
			{
				organizationId: ORG,
				actorUserId: HR_ACTOR,
				correlationId: `corr-policy-approval-out-of-order-${suffix}`,
				timesheetId: submitted.data.id,
				authority: "hr",
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(outOfOrderApproval.ok).toBe(false);
		const auditCountBeforeOutboxFailure = ready.ports.audit.calls.length;
		const appendOutbox = ready.ports.outbox.append;
		ready.ports.outbox.append = async () =>
			fail("INTERNAL_ERROR", "Injected approval-step outbox failure");
		const failedApproval = await approveTimesheet(
			{
				organizationId: ORG,
				actorUserId: policyManager,
				correlationId: `corr-policy-approval-step-failure-${suffix}`,
				timesheetId: submitted.data.id,
				authority: "line_manager",
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		ready.ports.outbox.append = appendOutbox;
		expect(failedApproval.ok).toBe(false);
		const afterFailedApproval = await getTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-approval-after-failure-${suffix}`,
				timesheetId: submitted.data.id,
			},
			ready,
		);
		expect(afterFailedApproval.ok).toBe(true);
		if (!afterFailedApproval.ok) return;
		expect(afterFailedApproval.data).toMatchObject({
			status: "submitted",
			completedApprovalSteps: 0,
			version: submitted.data.version,
		});
		const compensatedDecisions = await listTimesheetApprovalDecisions(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-approval-decisions-after-failure-${suffix}`,
				timesheetId: submitted.data.id,
				submissionReference: submitted.data.submissionReference ?? undefined,
			},
			ready,
		);
		expect(compensatedDecisions.ok).toBe(true);
		if (!compensatedDecisions.ok) return;
		expect(compensatedDecisions.data).toHaveLength(0);
		const compensationAudits = ready.ports.audit.calls.slice(
			auditCountBeforeOutboxFailure,
		);
		expect(
			compensationAudits.map(({ action, entity, entityId }) => ({
				action,
				entity,
				entityId,
			})),
		).toEqual([
			{
				action: "CREATE",
				entity: "hr_timesheet_approval_decision",
				entityId: compensationAudits[0]?.entityId,
			},
			{
				action: "DELETE",
				entity: "hr_timesheet_approval_decision",
				entityId: compensationAudits[0]?.entityId,
			},
		]);
		const managerApproval = await approveTimesheet(
			{
				organizationId: ORG,
				actorUserId: policyManager,
				correlationId: `corr-policy-approval-step-manager-${suffix}`,
				timesheetId: submitted.data.id,
				authority: "line_manager",
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(managerApproval.ok).toBe(true);
		if (!managerApproval.ok) return;
		expect(managerApproval.data.status).toBe("submitted");
		expect(managerApproval.data.completedApprovalSteps).toBe(1);
		const firstSubmissionReference = managerApproval.data.submissionReference;
		expect(firstSubmissionReference).not.toBeNull();
		if (firstSubmissionReference === null) return;
		const returnedAfterPartialApproval = await returnTimesheet(
			{
				organizationId: ORG,
				actorUserId: HR_ACTOR,
				correlationId: `corr-policy-approval-return-${suffix}`,
				timesheetId: managerApproval.data.id,
				approverNotes: "Return after the first approval step",
				expectedVersion: managerApproval.data.version,
			},
			ready,
		);
		expect(returnedAfterPartialApproval.ok).toBe(true);
		if (!returnedAfterPartialApproval.ok) return;
		const reopenedAfterPartialApproval = await reopenTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-approval-reopen-${suffix}`,
				timesheetId: returnedAfterPartialApproval.data.id,
				expectedVersion: returnedAfterPartialApproval.data.version,
			},
			ready,
		);
		expect(reopenedAfterPartialApproval.ok).toBe(true);
		if (!reopenedAfterPartialApproval.ok) return;
		const resubmittedAfterPartialApproval = await submitTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-approval-resubmit-${suffix}`,
				timesheetId: reopenedAfterPartialApproval.data.id,
				expectedVersion: reopenedAfterPartialApproval.data.version,
			},
			ready,
		);
		expect(resubmittedAfterPartialApproval.ok).toBe(true);
		if (!resubmittedAfterPartialApproval.ok) return;
		expect(resubmittedAfterPartialApproval.data.submissionReference).not.toBe(
			firstSubmissionReference,
		);
		expect(resubmittedAfterPartialApproval.data.completedApprovalSteps).toBe(0);
		expect(resubmittedAfterPartialApproval.data.requiredApprovalSteps).toEqual([
			"line_manager",
			"hr",
		]);
		const managerReapproval = await approveTimesheet(
			{
				organizationId: ORG,
				actorUserId: policyManager,
				correlationId: `corr-policy-approval-step-manager-resubmit-${suffix}`,
				timesheetId: resubmittedAfterPartialApproval.data.id,
				authority: "line_manager",
				expectedVersion: resubmittedAfterPartialApproval.data.version,
			},
			ready,
		);
		expect(managerReapproval.ok).toBe(true);
		if (!managerReapproval.ok) return;
		const hrApproval = await approveTimesheet(
			{
				organizationId: ORG,
				actorUserId: HR_ACTOR,
				correlationId: `corr-policy-approval-step-hr-${suffix}`,
				timesheetId: managerReapproval.data.id,
				authority: "hr",
				expectedVersion: managerReapproval.data.version,
			},
			ready,
		);
		expect(hrApproval.ok).toBe(true);
		if (!hrApproval.ok) return;
		expect(hrApproval.data.status).toBe("approved");
		const endedManagerAuthority = await endTimeApprovalAuthorityAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-approval-manager-end-${suffix}`,
				assignmentId: managerAuthority.data.id,
				effectiveTo: "2026-07-22",
				expectedVersion: managerAuthority.data.version,
			},
			ready,
		);
		expect(endedManagerAuthority.ok).toBe(true);
		const approvalDecisions = await listTimesheetApprovalDecisions(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-policy-approval-decisions-${suffix}`,
				timesheetId: hrApproval.data.id,
			},
			ready,
		);
		expect(approvalDecisions.ok).toBe(true);
		if (!approvalDecisions.ok) return;
		expect(
			approvalDecisions.data.map((decision) => ({
				authority: decision.authority,
				authorityAssignmentId: decision.authorityAssignmentId,
				submissionReference: decision.submissionReference,
			})),
		).toEqual([
			{
				authority: "line_manager",
				authorityAssignmentId: managerAuthority.data.id,
				submissionReference: firstSubmissionReference,
			},
			{
				authority: "line_manager",
				authorityAssignmentId: managerAuthority.data.id,
				submissionReference: hrApproval.data.submissionReference,
			},
			{
				authority: "hr",
				authorityAssignmentId: hrAuthority.data.id,
				submissionReference: hrApproval.data.submissionReference,
			},
		]);
		expect(
			ready.ports.outbox.calls
				.filter(
					(call) =>
						call.payload.entityId === hrApproval.data.id &&
						(call.type ===
							HUMAN_RESOURCES_TIME_TIMESHEET_APPROVAL_STEP_RECORDED_EVENT ||
							call.type === HUMAN_RESOURCES_TIMESHEET_APPROVED_EVENT),
				)
				.map((call) => call.type),
		).toEqual([
			HUMAN_RESOURCES_TIME_TIMESHEET_APPROVAL_STEP_RECORDED_EVENT,
			HUMAN_RESOURCES_TIME_TIMESHEET_APPROVAL_STEP_RECORDED_EVENT,
			HUMAN_RESOURCES_TIMESHEET_APPROVED_EVENT,
		]);
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

	it("resolves an overnight multi-break session with a differing assignment timezone", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-session-matrix-employee-${suffix}`,
				idempotencyKey: `idem-session-matrix-employee-${suffix}`,
				employeeNumber: `SM-${suffix}`,
				legalName: `Session Matrix ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;
		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-session-matrix-employment-${suffix}`,
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
				correlationId: `corr-session-matrix-calendar-${suffix}`,
				idempotencyKey: `idem-session-matrix-calendar-${suffix}`,
				code: `SM-CAL-${suffix}`,
				name: "Singapore calendar",
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
		const calendarAssignment = await assignEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-session-matrix-calendar-assignment-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				calendarId: calendar.data.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(calendarAssignment.ok).toBe(true);
		if (!calendarAssignment.ok) return;

		const shift = await createShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-session-matrix-shift-${suffix}`,
				idempotencyKey: `idem-session-matrix-shift-${suffix}`,
				code: `SM-NIGHT-${suffix}`,
				name: "Overnight multi-break shift",
				shiftKind: "fixed",
				startLocal: "22:00",
				endLocal: "06:00",
				expectedMinutes: 480,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(shift.ok).toBe(true);
		if (!shift.ok) return;
		expect(shift.data.isOvernight).toBe(true);
		const firstScheduledBreak = await addShiftBreak(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-session-matrix-break-one-${suffix}`,
				shiftId: shift.data.id,
				breakOrder: 1,
				durationMinutes: 30,
				startOffsetMinutes: 120,
				label: "First rest",
			},
			ready,
		);
		expect(firstScheduledBreak.ok).toBe(true);
		if (!firstScheduledBreak.ok) return;
		const secondScheduledBreak = await addShiftBreak(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-session-matrix-break-two-${suffix}`,
				shiftId: shift.data.id,
				breakOrder: 2,
				durationMinutes: 15,
				startOffsetMinutes: 300,
				label: "Second rest",
			},
			ready,
		);
		expect(secondScheduledBreak.ok).toBe(true);
		if (!secondScheduledBreak.ok) return;
		const activeShift = await activateShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-session-matrix-shift-activate-${suffix}`,
				shiftId: shift.data.id,
				expectedVersion: shift.data.version,
			},
			ready,
		);
		expect(activeShift.ok).toBe(true);
		if (!activeShift.ok) return;
		const assignment = await assignShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-session-matrix-assignment-${suffix}`,
				idempotencyKey: `idem-session-matrix-assignment-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				shiftId: activeShift.data.id,
				scheduledDate: "2025-08-12",
				startsAt: "2025-08-13T05:00:00.000Z",
				endsAt: "2025-08-13T13:00:00.000Z",
				timezone: "America/Los_Angeles",
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) return;
		const published = await publishShiftAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-session-matrix-publish-${suffix}`,
				assignmentId: assignment.data.id,
				expectedVersion: assignment.data.version,
			},
			ready,
		);
		expect(published.ok).toBe(true);
		if (!published.ok) return;
		expect(calendar.data.timezone).toBe("Asia/Singapore");
		expect(published.data.timezone).toBe("America/Los_Angeles");
		const scheduled = await getScheduledShiftForEmployeeDate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-session-matrix-scheduled-${suffix}`,
				employeeId: employee.data.id,
				scheduledDate: "2025-08-12",
			},
			ready,
		);
		expect(scheduled.ok).toBe(true);
		if (!scheduled.ok || scheduled.data === null) return;
		expect(scheduled.data.id).toBe(published.data.id);
		expect(scheduled.data.timezone).toBe("America/Los_Angeles");

		const eventBase = {
			organizationId: ORG,
			actorUserId: ACTOR,
			employeeId: employee.data.id,
			employmentId: employment.data.id,
			shiftAssignmentId: published.data.id,
			sourceTimezone: "America/Los_Angeles",
			localWorkDate: "2025-08-12",
		};
		const events = [
			await recordClockIn(
				{
					...eventBase,
					correlationId: `corr-session-matrix-in-${suffix}`,
					idempotencyKey: `idem-session-matrix-in-${suffix}`,
					occurredAt: "2025-08-13T05:00:00.000Z",
				},
				ready,
			),
			await recordBreakStart(
				{
					...eventBase,
					correlationId: `corr-session-matrix-break-start-one-${suffix}`,
					idempotencyKey: `idem-session-matrix-break-start-one-${suffix}`,
					occurredAt: "2025-08-13T07:00:00.000Z",
				},
				ready,
			),
			await recordBreakEnd(
				{
					...eventBase,
					correlationId: `corr-session-matrix-break-end-one-${suffix}`,
					idempotencyKey: `idem-session-matrix-break-end-one-${suffix}`,
					occurredAt: "2025-08-13T07:20:00.000Z",
				},
				ready,
			),
			await recordBreakStart(
				{
					...eventBase,
					correlationId: `corr-session-matrix-break-start-two-${suffix}`,
					idempotencyKey: `idem-session-matrix-break-start-two-${suffix}`,
					occurredAt: "2025-08-13T10:00:00.000Z",
				},
				ready,
			),
			await recordBreakEnd(
				{
					...eventBase,
					correlationId: `corr-session-matrix-break-end-two-${suffix}`,
					idempotencyKey: `idem-session-matrix-break-end-two-${suffix}`,
					occurredAt: "2025-08-13T10:10:00.000Z",
				},
				ready,
			),
			await recordClockOut(
				{
					...eventBase,
					correlationId: `corr-session-matrix-out-${suffix}`,
					idempotencyKey: `idem-session-matrix-out-${suffix}`,
					occurredAt: "2025-08-13T13:00:00.000Z",
				},
				ready,
			),
		];
		expect(events.every((event) => event.ok)).toBe(true);
		const session = await resolveAttendanceSession(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-session-matrix-resolve-${suffix}`,
				idempotencyKey: `idem-session-matrix-resolve-${suffix}`,
				employeeId: employee.data.id,
				localWorkDate: "2025-08-12",
				timezone: "America/Los_Angeles",
			},
			ready,
		);
		expect(session.ok).toBe(true);
		if (!session.ok) return;
		expect(session.data).toMatchObject({
			resolutionStatus: "resolved",
			breakMinutes: 30,
			workedMinutes: 450,
			timezone: "America/Los_Angeles",
		});
		expect(session.data.firstClockInAt?.toISOString()).toBe(
			"2025-08-13T05:00:00.000Z",
		);
		expect(session.data.finalClockOutAt?.toISOString()).toBe(
			"2025-08-13T13:00:00.000Z",
		);
		const unresolved = await listUnresolvedAttendanceExceptions(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: `corr-session-matrix-exceptions-${suffix}`,
				employeeId: employee.data.id,
			},
			ready,
		);
		expect(unresolved.ok).toBe(true);
		if (!unresolved.ok) return;
		const sessionTypes = unresolved.data
			.filter((exception) => exception.sessionId === session.data.id)
			.map((exception) => exception.exceptionType);
		for (const unexpected of [
			"late_arrival",
			"early_departure",
			"missing_clock_in",
			"missing_clock_out",
			"unplanned_attendance",
			"schedule_mismatch",
			"excessive_break",
		] as const satisfies readonly AttendanceExceptionType[]) {
			expect(sessionTypes).not.toContain(unexpected);
		}
	});

	it("resolves elapsed attendance minutes across an IANA daylight-saving transition", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-dst-employee-${suffix}`,
				idempotencyKey: `idem-dst-employee-${suffix}`,
				employeeNumber: `DST-${suffix}`,
				legalName: `DST Contract Worker ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;
		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-dst-employment-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const eventBase = {
			organizationId: ORG,
			actorUserId: ACTOR,
			employeeId: employee.data.id,
			employmentId: employment.data.id,
			sourceTimezone: "America/New_York",
			localWorkDate: "2025-03-09",
		};
		const clockIn = await recordClockIn(
			{
				...eventBase,
				correlationId: `corr-dst-clock-in-${suffix}`,
				idempotencyKey: `idem-dst-clock-in-${suffix}`,
				occurredAt: "2025-03-09T06:30:00.000Z",
			},
			ready,
		);
		expect(clockIn.ok).toBe(true);
		if (!clockIn.ok) return;
		const clockOut = await recordClockOut(
			{
				...eventBase,
				correlationId: `corr-dst-clock-out-${suffix}`,
				idempotencyKey: `idem-dst-clock-out-${suffix}`,
				occurredAt: "2025-03-09T07:30:00.000Z",
			},
			ready,
		);
		expect(clockOut.ok).toBe(true);
		if (!clockOut.ok) return;
		expect(clockIn.data.sourceTimezone).toBe("America/New_York");
		expect(clockOut.data.sourceTimezone).toBe("America/New_York");

		const resolved = await resolveAttendanceSession(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-dst-resolve-${suffix}`,
				idempotencyKey: `idem-dst-resolve-${suffix}`,
				employeeId: employee.data.id,
				localWorkDate: "2025-03-09",
				timezone: "America/New_York",
			},
			ready,
		);
		expect(resolved.ok).toBe(true);
		if (!resolved.ok) return;
		expect(resolved.data).toMatchObject({
			localWorkDate: "2025-03-09",
			timezone: "America/New_York",
			resolutionStatus: "resolved",
			breakMinutes: 0,
			workedMinutes: 60,
		});
		expect(resolved.data.firstClockInAt?.toISOString()).toBe(
			"2025-03-09T06:30:00.000Z",
		);
		expect(resolved.data.finalClockOutAt?.toISOString()).toBe(
			"2025-03-09T07:30:00.000Z",
		);
	});

	it("importAttendanceEvents source_reference idempotency parity", async () => {
		const ready = createHrParityHarness(adapter);
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
		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-imp-employment-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

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
						employmentId: employment.data.id,
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
						employmentId: employment.data.id,
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
		const ready = createHrParityHarness(adapter);
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

	it("timesheet draft edit/remove → return → reopen → approve → lock → handoff parity", async () => {
		const ready = createHrParityHarness(adapter);
		const lifecycleManager = `user-hr-time-lifecycle-manager-${suffix}`;
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
		if (!entry.ok) return;

		const foreignEntryMutation = await updateTimesheetEntry(
			{
				organizationId: `${ORG}-other`,
				actorUserId: ACTOR,
				correlationId: `corr-p07-ts-entry-cross-org-${suffix}`,
				entryId: entry.data.id,
				recordedMinutes: 1,
				approvedMinutes: 1,
				expectedVersion: entry.data.version,
			},
			ready,
		);
		expect(foreignEntryMutation.ok).toBe(false);
		if (!foreignEntryMutation.ok) {
			expect(humanResourcesCodeFromResult(foreignEntryMutation)).toBe(
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		const entriesAfterForeignMutation = await listTimesheetEntries(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-ts-entry-after-cross-org-${suffix}`,
				timesheetId: timesheet.data.id,
			},
			ready,
		);
		expect(entriesAfterForeignMutation.ok).toBe(true);
		if (!entriesAfterForeignMutation.ok) return;
		expect(entriesAfterForeignMutation.data).toEqual([entry.data]);

		const editedEntry = await updateTimesheetEntry(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-ts-entry-edit-${suffix}`,
				entryId: entry.data.id,
				recordedMinutes: 450,
				approvedMinutes: 450,
				expectedVersion: entry.data.version,
			},
			ready,
		);
		expect(editedEntry.ok).toBe(true);
		if (!editedEntry.ok) return;
		expect(editedEntry.data).toMatchObject({
			recordedMinutes: 450,
			approvedMinutes: 450,
			version: entry.data.version + 1,
		});

		const removableEntry = await addTimesheetEntry(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-ts-entry-removable-${suffix}`,
				timesheetId: timesheet.data.id,
				employeeId: employee.data.id,
				workDate: "2025-07-28",
				timezone: "Asia/Singapore",
				sourceType: "manual",
				sourceReference: `removable-${suffix}`,
				timeType: "regular",
				recordedMinutes: 30,
				approvedMinutes: 30,
			},
			ready,
		);
		expect(removableEntry.ok).toBe(true);
		if (!removableEntry.ok) return;

		const removedEntry = await removeTimesheetEntry(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-ts-entry-remove-${suffix}`,
				entryId: removableEntry.data.id,
				expectedVersion: removableEntry.data.version,
			},
			ready,
		);
		expect(removedEntry.ok).toBe(true);

		const entriesAfterRemoval = await listTimesheetEntries(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-ts-entries-after-remove-${suffix}`,
				timesheetId: timesheet.data.id,
			},
			ready,
		);
		expect(entriesAfterRemoval.ok).toBe(true);
		if (!entriesAfterRemoval.ok) return;
		expect(entriesAfterRemoval.data).toHaveLength(1);
		expect(entriesAfterRemoval.data[0]).toMatchObject({
			id: editedEntry.data.id,
			recordedMinutes: 450,
			approvedMinutes: 450,
			version: editedEntry.data.version,
		});

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

		const draftHandoff = await getApprovedTimeHandoff(
			{
				organizationId: ORG,
				actorUserId: lifecycleManager,
				correlationId: `corr-p07-ts-handoff-draft-${suffix}`,
				timesheetId: current.data.id,
			},
			ready,
		);
		expect(draftHandoff.ok).toBe(true);
		if (!draftHandoff.ok) return;
		expect(draftHandoff.data).toBeNull();

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
		expect(submitted.data.version).toBe(current.data.version + 1);

		const submittedHandoff = await getApprovedTimeHandoff(
			{
				organizationId: ORG,
				actorUserId: lifecycleManager,
				correlationId: `corr-p07-ts-handoff-submitted-${suffix}`,
				timesheetId: submitted.data.id,
			},
			ready,
		);
		expect(submittedHandoff.ok).toBe(true);
		if (!submittedHandoff.ok) return;
		expect(submittedHandoff.data).toBeNull();

		const returned = await returnTimesheet(
			{
				organizationId: ORG,
				actorUserId: lifecycleManager,
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
		expect(returned.data.version).toBe(submitted.data.version + 1);

		const returnedHandoff = await getApprovedTimeHandoff(
			{
				organizationId: ORG,
				actorUserId: lifecycleManager,
				correlationId: `corr-p07-ts-handoff-returned-${suffix}`,
				timesheetId: returned.data.id,
			},
			ready,
		);
		expect(returnedHandoff.ok).toBe(true);
		if (!returnedHandoff.ok) return;
		expect(returnedHandoff.data).toBeNull();

		const reopened = await reopenTimesheet(
			{
				organizationId: ORG,
				actorUserId: lifecycleManager,
				correlationId: `corr-p07-ts-reopen-${suffix}`,
				timesheetId: returned.data.id,
				expectedVersion: returned.data.version,
			},
			ready,
		);
		expect(reopened.ok).toBe(true);
		if (!reopened.ok) return;
		expect(reopened.data.status).toBe("draft");
		expect(reopened.data.version).toBe(returned.data.version + 1);

		const reopenedHandoff = await getApprovedTimeHandoff(
			{
				organizationId: ORG,
				actorUserId: lifecycleManager,
				correlationId: `corr-p07-ts-handoff-reopened-${suffix}`,
				timesheetId: reopened.data.id,
			},
			ready,
		);
		expect(reopenedHandoff.ok).toBe(true);
		if (!reopenedHandoff.ok) return;
		expect(reopenedHandoff.data).toBeNull();

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
		expect(resubmitted.data.version).toBe(reopened.data.version + 1);

		const resubmittedHandoff = await getApprovedTimeHandoff(
			{
				organizationId: ORG,
				actorUserId: lifecycleManager,
				correlationId: `corr-p07-ts-handoff-resubmitted-${suffix}`,
				timesheetId: resubmitted.data.id,
			},
			ready,
		);
		expect(resubmittedHandoff.ok).toBe(true);
		if (!resubmittedHandoff.ok) return;
		expect(resubmittedHandoff.data).toBeNull();

		const authority = await assignTimeApprovalAuthority(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-authority-${suffix}`,
				targetActorUserId: lifecycleManager,
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
				actorUserId: lifecycleManager,
				correlationId: `corr-p07-ts-approve-${suffix}`,
				authority: "line_manager",
				timesheetId: resubmitted.data.id,
				expectedVersion: resubmitted.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;
		expect(approved.data.status).toBe("approved");
		expect(approved.data.version).toBe(resubmitted.data.version + 1);

		const handoff = await getApprovedTimeHandoff(
			{
				organizationId: ORG,
				actorUserId: lifecycleManager,
				correlationId: `corr-p07-ts-handoff-${suffix}`,
				timesheetId: approved.data.id,
			},
			ready,
		);
		expect(handoff.ok).toBe(true);
		if (!handoff.ok || handoff.data === null) return;
		expect(handoff.data.regularMinutes).toBe(450);
		expect(handoff.data.timesheetVersion).toBe(approved.data.version);

		const staleLock = await lockTimesheet(
			{
				organizationId: ORG,
				actorUserId: lifecycleManager,
				correlationId: `corr-p07-ts-lock-stale-${suffix}`,
				timesheetId: approved.data.id,
				expectedVersion: approved.data.version - 1,
			},
			ready,
		);
		expect(staleLock.ok).toBe(false);
		if (!staleLock.ok) {
			expect(humanResourcesCodeFromResult(staleLock)).toBe(
				HUMAN_RESOURCES_ERROR_STALE_VERSION,
			);
		}

		const locked = await lockTimesheet(
			{
				organizationId: ORG,
				actorUserId: lifecycleManager,
				correlationId: `corr-p07-ts-lock-${suffix}`,
				timesheetId: approved.data.id,
				expectedVersion: approved.data.version,
			},
			ready,
		);
		expect(locked.ok).toBe(true);
		if (!locked.ok) return;
		expect(locked.data.status).toBe("locked");
		expect(locked.data.version).toBe(approved.data.version + 1);
		expect(locked.data.lockedAt).toBeInstanceOf(Date);
		expect(locked.data.approvedAt?.toISOString()).toBe(
			approved.data.approvedAt?.toISOString(),
		);

		const lockedUpdate = await updateTimesheetEntry(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-ts-locked-update-${suffix}`,
				entryId: editedEntry.data.id,
				recordedMinutes: 480,
				expectedVersion: editedEntry.data.version,
			},
			ready,
		);
		expect(lockedUpdate.ok).toBe(false);
		if (!lockedUpdate.ok) {
			expect(humanResourcesCodeFromResult(lockedUpdate)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		}

		const lockedRemove = await removeTimesheetEntry(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-ts-locked-remove-${suffix}`,
				entryId: editedEntry.data.id,
				expectedVersion: editedEntry.data.version,
			},
			ready,
		);
		expect(lockedRemove.ok).toBe(false);
		if (!lockedRemove.ok) {
			expect(humanResourcesCodeFromResult(lockedRemove)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		}

		const lockedAdd = await addTimesheetEntry(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-ts-locked-add-${suffix}`,
				timesheetId: locked.data.id,
				employeeId: employee.data.id,
				workDate: "2025-07-28",
				timezone: "Asia/Singapore",
				sourceType: "manual",
				timeType: "regular",
				recordedMinutes: 30,
				approvedMinutes: 30,
			},
			ready,
		);
		expect(lockedAdd.ok).toBe(false);
		if (!lockedAdd.ok) {
			expect(humanResourcesCodeFromResult(lockedAdd)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		}

		const lockedRegeneration = await generateTimesheetEntries(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-ts-locked-generate-${suffix}`,
				timesheetId: locked.data.id,
				expectedVersion: locked.data.version,
			},
			ready,
		);
		expect(lockedRegeneration.ok).toBe(false);
		if (!lockedRegeneration.ok) {
			expect(humanResourcesCodeFromResult(lockedRegeneration)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		}

		const lockedReopen = await reopenTimesheet(
			{
				organizationId: ORG,
				actorUserId: lifecycleManager,
				correlationId: `corr-p07-ts-locked-reopen-${suffix}`,
				timesheetId: locked.data.id,
				expectedVersion: locked.data.version,
			},
			ready,
		);
		expect(lockedReopen.ok).toBe(false);
		if (!lockedReopen.ok) {
			expect(humanResourcesCodeFromResult(lockedReopen)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		}

		const lockedSubmit = await submitTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-ts-locked-submit-${suffix}`,
				timesheetId: locked.data.id,
				expectedVersion: locked.data.version,
			},
			ready,
		);
		expect(lockedSubmit.ok).toBe(false);
		if (!lockedSubmit.ok) {
			expect(humanResourcesCodeFromResult(lockedSubmit)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		}

		const lockedReturn = await returnTimesheet(
			{
				organizationId: ORG,
				actorUserId: lifecycleManager,
				correlationId: `corr-p07-ts-locked-return-${suffix}`,
				timesheetId: locked.data.id,
				expectedVersion: locked.data.version,
			},
			ready,
		);
		expect(lockedReturn.ok).toBe(false);
		if (!lockedReturn.ok) {
			expect(humanResourcesCodeFromResult(lockedReturn)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		}

		const repeatedLock = await lockTimesheet(
			{
				organizationId: ORG,
				actorUserId: lifecycleManager,
				correlationId: `corr-p07-ts-locked-lock-${suffix}`,
				timesheetId: locked.data.id,
				expectedVersion: locked.data.version,
			},
			ready,
		);
		expect(repeatedLock.ok).toBe(false);
		if (!repeatedLock.ok) {
			expect(humanResourcesCodeFromResult(repeatedLock)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		}

		const lockedSupersede = await supersedeTimesheet(
			{
				organizationId: ORG,
				actorUserId: lifecycleManager,
				correlationId: `corr-p07-ts-locked-supersede-${suffix}`,
				idempotencyKey: `idem-p07-ts-locked-supersede-${suffix}`,
				timesheetId: locked.data.id,
				expectedVersion: locked.data.version,
			},
			ready,
		);
		expect(lockedSupersede.ok).toBe(false);
		if (!lockedSupersede.ok) {
			expect(humanResourcesCodeFromResult(lockedSupersede)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		}

		const lockedEntries = await listTimesheetEntries(
			{
				organizationId: ORG,
				actorUserId: lifecycleManager,
				correlationId: `corr-p07-ts-locked-entries-${suffix}`,
				timesheetId: locked.data.id,
			},
			ready,
		);
		expect(lockedEntries.ok).toBe(true);
		if (!lockedEntries.ok) return;
		expect(lockedEntries.data).toHaveLength(1);
		expect(lockedEntries.data[0]).toMatchObject({
			id: editedEntry.data.id,
			recordedMinutes: 450,
			approvedMinutes: 450,
			version: editedEntry.data.version,
		});

		const lockedCurrent = await getTimesheet(
			{
				organizationId: ORG,
				actorUserId: lifecycleManager,
				correlationId: `corr-p07-ts-locked-current-${suffix}`,
				timesheetId: locked.data.id,
			},
			ready,
		);
		expect(lockedCurrent.ok).toBe(true);
		if (!lockedCurrent.ok || lockedCurrent.data === null) return;
		expect(lockedCurrent.data).toMatchObject({
			status: "locked",
			totalRecordedMinutes: 450,
			totalApprovedMinutes: 450,
			version: locked.data.version,
		});

		const lockedHandoff = await getApprovedTimeHandoff(
			{
				organizationId: ORG,
				actorUserId: lifecycleManager,
				correlationId: `corr-p07-ts-locked-handoff-${suffix}`,
				timesheetId: locked.data.id,
			},
			ready,
		);
		expect(lockedHandoff.ok).toBe(true);
		if (!lockedHandoff.ok || lockedHandoff.data === null) return;
		expect(lockedHandoff.data).toEqual({
			...handoff.data,
			timesheetVersion: locked.data.version,
		});
	});

	it("supersedes an approved timesheet into a distinct correction draft without mutating original facts", async () => {
		const ready = createHrParityHarness(adapter);
		const correctionManager = `user-hr-time-correction-manager-${suffix}`;

		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-approved-correction-employee-${suffix}`,
				idempotencyKey: `idem-approved-correction-employee-${suffix}`,
				employeeNumber: `CORRECTION-${suffix}`,
				legalName: `Correction Worker ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-approved-correction-employment-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const original = await createTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-approved-correction-timesheet-${suffix}`,
				idempotencyKey: `idem-approved-correction-timesheet-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				periodStart: "2025-08-25",
				periodEnd: "2025-08-25",
			},
			ready,
		);
		expect(original.ok).toBe(true);
		if (!original.ok) return;

		const originalEntry = await addTimesheetEntry(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-approved-correction-entry-${suffix}`,
				timesheetId: original.data.id,
				employeeId: employee.data.id,
				workDate: "2025-08-25",
				timezone: "Asia/Singapore",
				sourceType: "manual",
				sourceReference: `original-correction-fact-${suffix}`,
				timeType: "regular",
				recordedMinutes: 480,
				approvedMinutes: 480,
			},
			ready,
		);
		expect(originalEntry.ok).toBe(true);
		if (!originalEntry.ok) return;

		const currentOriginal = await getTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-approved-correction-current-${suffix}`,
				timesheetId: original.data.id,
			},
			ready,
		);
		expect(currentOriginal.ok).toBe(true);
		if (!currentOriginal.ok || currentOriginal.data === null) return;

		const submitted = await submitTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-approved-correction-submit-${suffix}`,
				timesheetId: currentOriginal.data.id,
				expectedVersion: currentOriginal.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) return;

		const authority = await assignTimeApprovalAuthority(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-approved-correction-authority-${suffix}`,
				targetActorUserId: correctionManager,
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
				actorUserId: correctionManager,
				correlationId: `corr-approved-correction-approve-${suffix}`,
				authority: "line_manager",
				timesheetId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;

		const approvedHandoff = await getApprovedTimeHandoff(
			{
				organizationId: ORG,
				actorUserId: correctionManager,
				correlationId: `corr-approved-correction-handoff-${suffix}`,
				timesheetId: approved.data.id,
			},
			ready,
		);
		expect(approvedHandoff.ok).toBe(true);
		if (!approvedHandoff.ok || approvedHandoff.data === null) return;
		expect(approvedHandoff.data.regularMinutes).toBe(480);

		const replacement = await supersedeTimesheet(
			{
				organizationId: ORG,
				actorUserId: correctionManager,
				correlationId: `corr-approved-correction-supersede-${suffix}`,
				idempotencyKey: `idem-approved-correction-supersede-${suffix}`,
				timesheetId: approved.data.id,
				expectedVersion: approved.data.version,
			},
			ready,
		);
		expect(replacement.ok).toBe(true);
		if (!replacement.ok) return;
		expect(replacement.data).toMatchObject({
			organizationId: ORG,
			employeeId: employee.data.id,
			employmentId: employment.data.id,
			periodStart: approved.data.periodStart,
			periodEnd: approved.data.periodEnd,
			status: "draft",
			totalRecordedMinutes: 0,
			totalApprovedMinutes: 0,
			version: 1,
		});
		expect(replacement.data.id).not.toBe(approved.data.id);

		const supersededOriginal = await getTimesheet(
			{
				organizationId: ORG,
				actorUserId: correctionManager,
				correlationId: `corr-approved-correction-original-after-${suffix}`,
				timesheetId: approved.data.id,
			},
			ready,
		);
		expect(supersededOriginal.ok).toBe(true);
		if (!supersededOriginal.ok || supersededOriginal.data === null) return;
		expect(supersededOriginal.data).toMatchObject({
			status: "superseded",
			totalRecordedMinutes: 480,
			totalApprovedMinutes: 480,
			version: approved.data.version + 1,
			approvedAt: approved.data.approvedAt,
			approvedBy: approved.data.approvedBy,
		});

		const repeatedSupersession = await supersedeTimesheet(
			{
				organizationId: ORG,
				actorUserId: correctionManager,
				correlationId: `corr-approved-correction-supersede-repeat-${suffix}`,
				idempotencyKey: `idem-approved-correction-supersede-repeat-${suffix}`,
				timesheetId: supersededOriginal.data.id,
				expectedVersion: supersededOriginal.data.version,
			},
			ready,
		);
		expect(repeatedSupersession.ok).toBe(false);
		if (!repeatedSupersession.ok) {
			expect(humanResourcesCodeFromResult(repeatedSupersession)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		}

		const supersededHandoff = await getApprovedTimeHandoff(
			{
				organizationId: ORG,
				actorUserId: correctionManager,
				correlationId: `corr-approved-correction-handoff-after-${suffix}`,
				timesheetId: approved.data.id,
			},
			ready,
		);
		expect(supersededHandoff.ok).toBe(true);
		if (!supersededHandoff.ok) return;
		expect(supersededHandoff.data).toBeNull();

		const originalMutation = await updateTimesheetEntry(
			{
				organizationId: ORG,
				actorUserId: correctionManager,
				correlationId: `corr-approved-correction-original-mutation-${suffix}`,
				entryId: originalEntry.data.id,
				recordedMinutes: 450,
				approvedMinutes: 450,
				expectedVersion: originalEntry.data.version,
			},
			ready,
		);
		expect(originalMutation.ok).toBe(false);
		if (!originalMutation.ok) {
			expect(humanResourcesCodeFromResult(originalMutation)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		}

		const originalEntries = await listTimesheetEntries(
			{
				organizationId: ORG,
				actorUserId: correctionManager,
				correlationId: `corr-approved-correction-original-entries-${suffix}`,
				timesheetId: approved.data.id,
			},
			ready,
		);
		expect(originalEntries.ok).toBe(true);
		if (!originalEntries.ok) return;
		expect(originalEntries.data).toHaveLength(1);
		expect(originalEntries.data[0]).toMatchObject({
			id: originalEntry.data.id,
			recordedMinutes: 480,
			approvedMinutes: 480,
			version: originalEntry.data.version,
		});

		const replacementEntries = await listTimesheetEntries(
			{
				organizationId: ORG,
				actorUserId: correctionManager,
				correlationId: `corr-approved-correction-replacement-entries-${suffix}`,
				timesheetId: replacement.data.id,
			},
			ready,
		);
		expect(replacementEntries.ok).toBe(true);
		if (!replacementEntries.ok) return;
		expect(replacementEntries.data).toEqual([]);
	});

	it("preserves append-only attendance correction provenance and compensates failed publication", async () => {
		const ready = createHrParityHarness(adapter);
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
		expect(clockIn.data.capturedOccurredAt?.toISOString()).toBe(
			"2025-07-29T01:00:00.000Z",
		);
		expect(clockIn.data.capturedNotes).toBeNull();

		const beforeAdjustments = await listAttendanceAdjustments(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: `corr-p07-corr-list-before-${suffix}`,
				eventId: clockIn.data.id,
			},
			ready,
		);
		expect(beforeAdjustments.ok).toBe(true);
		if (!beforeAdjustments.ok) return;
		expect(beforeAdjustments.data).toEqual([]);

		const corrected = await correctAttendanceEvent(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: `corr-p07-corr-${suffix}`,
				eventId: clockIn.data.id,
				occurredAt: "2025-07-29T01:10:00.000Z",
				notes: "first corrected timestamp",
				adjustmentReason: "parity correction",
				evidenceReference: `badge-log:first-${suffix}`,
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
		expect(corrected.data.notes).toBe("first corrected timestamp");

		const correctedAgain = await correctAttendanceEvent(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-corr-second-${suffix}`,
				eventId: clockIn.data.id,
				occurredAt: "2025-07-29T01:05:00.000Z",
				notes: "second corrected timestamp",
				adjustmentReason: "supervisor confirmed five-minute variance",
				evidenceReference: `badge-log:second-${suffix}`,
				expectedVersion: corrected.data.version,
			},
			ready,
		);
		expect(correctedAgain.ok).toBe(true);
		if (!correctedAgain.ok) return;
		expect(correctedAgain.data).toMatchObject({
			id: clockIn.data.id,
			notes: "second corrected timestamp",
			version: corrected.data.version + 1,
		});
		expect(correctedAgain.data.occurredAt.toISOString()).toBe(
			"2025-07-29T01:05:00.000Z",
		);

		const adjustments = await listAttendanceAdjustments(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: `corr-p07-corr-list-${suffix}`,
				eventId: clockIn.data.id,
			},
			ready,
		);
		expect(adjustments.ok).toBe(true);
		if (!adjustments.ok) return;
		expect(adjustments.data).toMatchObject([
			{
				organizationId: ORG,
				eventId: clockIn.data.id,
				sequence: clockIn.data.version,
				eventVersionBefore: clockIn.data.version,
				eventVersionAfter: corrected.data.version,
				previousOccurredAt: clockIn.data.occurredAt,
				newOccurredAt: corrected.data.occurredAt,
				previousNotes: null,
				newNotes: "first corrected timestamp",
				adjustmentReason: "parity correction",
				evidenceReference: `badge-log:first-${suffix}`,
				actorUserId: MANAGER,
				correlationId: `corr-p07-corr-${suffix}`,
			},
			{
				organizationId: ORG,
				eventId: clockIn.data.id,
				sequence: corrected.data.version,
				eventVersionBefore: corrected.data.version,
				eventVersionAfter: correctedAgain.data.version,
				previousOccurredAt: corrected.data.occurredAt,
				newOccurredAt: correctedAgain.data.occurredAt,
				previousNotes: "first corrected timestamp",
				newNotes: "second corrected timestamp",
				adjustmentReason: "supervisor confirmed five-minute variance",
				evidenceReference: `badge-log:second-${suffix}`,
				actorUserId: ACTOR,
				correlationId: `corr-p07-corr-second-${suffix}`,
			},
		]);
		expect(
			adjustments.data.every(
				(adjustment) =>
					adjustment.id.length > 0 && adjustment.createdAt instanceof Date,
			),
		).toBe(true);
		expect(
			new Set(adjustments.data.map((adjustment) => adjustment.id)).size,
		).toBe(2);

		const auditFailurePorts = createMemoryMutationPorts({
			auditFailAfter: 0,
		});
		const auditFailedCorrection = await correctAttendanceEvent(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: `corr-p07-corr-audit-failure-${suffix}`,
				eventId: clockIn.data.id,
				occurredAt: "2025-07-29T01:12:00.000Z",
				notes: "audit failure must roll back",
				adjustmentReason: "audit failure exercise",
				evidenceReference: `badge-log:audit-failure-${suffix}`,
				expectedVersion: correctedAgain.data.version,
			},
			{
				...ready,
				ports: auditFailurePorts,
			},
		);
		expect(auditFailedCorrection.ok).toBe(false);
		expect(auditFailurePorts.audit.calls).toHaveLength(1);
		expect(auditFailurePorts.outbox.calls).toHaveLength(0);

		const publicationFailurePorts = createMemoryMutationPorts({
			outboxFailAfter: 0,
		});
		const failedCorrection = await correctAttendanceEvent(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: `corr-p07-corr-publication-failure-${suffix}`,
				eventId: clockIn.data.id,
				occurredAt: "2025-07-29T01:15:00.000Z",
				notes: "must roll back",
				adjustmentReason: "publication failure exercise",
				evidenceReference: `badge-log:publication-failure-${suffix}`,
				expectedVersion: correctedAgain.data.version,
			},
			{
				...ready,
				ports: publicationFailurePorts,
			},
		);
		expect(failedCorrection.ok).toBe(false);
		expect(publicationFailurePorts.audit.calls).toHaveLength(2);
		expect(publicationFailurePorts.audit.calls[0]).toMatchObject({
			entity: "hr_attendance_event",
			entityId: clockIn.data.id,
			action: "UPDATE",
		});
		expect(publicationFailurePorts.audit.calls[1]).toMatchObject({
			entity: "hr_attendance_adjustment",
			action: "DELETE",
		});
		expect(publicationFailurePorts.outbox.calls).toHaveLength(1);

		let signalDeferredPublication: () => void = () => undefined;
		const deferredPublication = new Promise<void>((resolve) => {
			signalDeferredPublication = resolve;
		});
		let releaseDeferredPublication: () => void = () => undefined;
		const deferredPublicationRelease = new Promise<void>((resolve) => {
			releaseDeferredPublication = resolve;
		});
		const deferredFailurePorts = createMemoryMutationPorts();
		deferredFailurePorts.outbox.append = async (input) => {
			deferredFailurePorts.outbox.calls.push(input);
			signalDeferredPublication();
			await deferredPublicationRelease;
			return fail("INTERNAL_ERROR", "deferred outbox failure");
		};

		const deferredFailedCorrection = correctAttendanceEvent(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: `corr-p07-corr-deferred-failure-${suffix}`,
				eventId: clockIn.data.id,
				occurredAt: "2025-07-29T01:18:00.000Z",
				notes: "deferred failure must remain invisible",
				adjustmentReason: "deferred publication failure exercise",
				evidenceReference: `badge-log:deferred-failure-${suffix}`,
				expectedVersion: correctedAgain.data.version,
			},
			{
				...ready,
				ports: deferredFailurePorts,
			},
		);
		await deferredPublication;

		const visibleDuringDeferredFailure = await getAttendanceEvent(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: `corr-p07-corr-visible-during-failure-${suffix}`,
				eventId: clockIn.data.id,
			},
			ready,
		);
		expect(visibleDuringDeferredFailure.ok).toBe(true);
		if (
			!visibleDuringDeferredFailure.ok ||
			visibleDuringDeferredFailure.data === null
		) {
			return;
		}
		expect(visibleDuringDeferredFailure.data).toMatchObject({
			notes: "second corrected timestamp",
			version: correctedAgain.data.version,
		});

		const correctionAfterRollback = correctAttendanceEvent(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-corr-after-rollback-${suffix}`,
				eventId: clockIn.data.id,
				occurredAt: "2025-07-29T01:08:00.000Z",
				notes: "correction committed after rollback",
				adjustmentReason: "confirmed after concurrent publication failure",
				evidenceReference: `badge-log:after-rollback-${suffix}`,
				expectedVersion: correctedAgain.data.version,
			},
			ready,
		);
		releaseDeferredPublication();

		const [deferredFailureResult, correctionAfterRollbackResult] =
			await Promise.all([deferredFailedCorrection, correctionAfterRollback]);
		expect(deferredFailureResult.ok).toBe(false);
		expect(correctionAfterRollbackResult.ok).toBe(true);
		if (!correctionAfterRollbackResult.ok) return;
		expect(correctionAfterRollbackResult.data).toMatchObject({
			notes: "correction committed after rollback",
			version: correctedAgain.data.version + 1,
		});
		expect(deferredFailurePorts.audit.calls).toHaveLength(2);
		expect(deferredFailurePorts.outbox.calls).toHaveLength(1);

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
		expect(fetched.data).toMatchObject({
			id: clockIn.data.id,
			capturedNotes: null,
			notes: "correction committed after rollback",
			version: correctionAfterRollbackResult.data.version,
		});
		expect(fetched.data.capturedOccurredAt?.toISOString()).toBe(
			"2025-07-29T01:00:00.000Z",
		);
		expect(fetched.data.occurredAt.toISOString()).toBe(
			"2025-07-29T01:08:00.000Z",
		);

		const afterFailedCorrection = await listAttendanceAdjustments(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: `corr-p07-corr-list-after-failure-${suffix}`,
				eventId: clockIn.data.id,
			},
			ready,
		);
		expect(afterFailedCorrection.ok).toBe(true);
		if (!afterFailedCorrection.ok) return;
		expect(afterFailedCorrection.data).toHaveLength(3);
		expect(afterFailedCorrection.data.slice(0, 2)).toEqual(adjustments.data);
		expect(afterFailedCorrection.data[2]).toMatchObject({
			eventId: clockIn.data.id,
			sequence: correctedAgain.data.version,
			eventVersionBefore: correctedAgain.data.version,
			eventVersionAfter: correctionAfterRollbackResult.data.version,
			previousOccurredAt: correctedAgain.data.occurredAt,
			newOccurredAt: correctionAfterRollbackResult.data.occurredAt,
			previousNotes: "second corrected timestamp",
			newNotes: "correction committed after rollback",
			adjustmentReason: "confirmed after concurrent publication failure",
			evidenceReference: `badge-log:after-rollback-${suffix}`,
			actorUserId: ACTOR,
			correlationId: `corr-p07-corr-after-rollback-${suffix}`,
		});
		expect(
			afterFailedCorrection.data.some(
				(adjustment) =>
					adjustment.adjustmentReason ===
					"deferred publication failure exercise",
			),
		).toBe(false);

		const crossOrganizationCorrection = await correctAttendanceEvent(
			{
				organizationId: `${ORG}-other`,
				actorUserId: MANAGER,
				correlationId: `corr-p07-corr-cross-org-${suffix}`,
				eventId: clockIn.data.id,
				occurredAt: "2025-07-29T01:20:00.000Z",
				adjustmentReason: "must not cross organization",
				expectedVersion: correctionAfterRollbackResult.data.version,
			},
			ready,
		);
		expect(crossOrganizationCorrection.ok).toBe(false);
		if (!crossOrganizationCorrection.ok) {
			expect(humanResourcesCodeFromResult(crossOrganizationCorrection)).toBe(
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}

		const crossOrganizationAdjustments = await listAttendanceAdjustments(
			{
				organizationId: `${ORG}-other`,
				actorUserId: MANAGER,
				correlationId: `corr-p07-corr-list-cross-org-${suffix}`,
				eventId: clockIn.data.id,
			},
			ready,
		);
		expect(crossOrganizationAdjustments.ok).toBe(true);
		if (!crossOrganizationAdjustments.ok) return;
		expect(crossOrganizationAdjustments.data).toEqual([]);

		const deniedAdjustments = await listAttendanceAdjustments(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: `corr-p07-corr-list-denied-${suffix}`,
				eventId: clockIn.data.id,
			},
			{
				...ready,
				authorization: createGrantingHumanResourcesAuthorization([]),
			},
		);
		expect(deniedAdjustments.ok).toBe(false);
		if (!deniedAdjustments.ok) {
			expect(humanResourcesCodeFromResult(deniedAdjustments)).toBe(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			);
		}
	});

	it("covers overnight, flexible, split, controlled schedule amendment, and manual attendance parity", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-variants-employee-${suffix}`,
				idempotencyKey: `idem-p07-variants-employee-${suffix}`,
				employeeNumber: `VAR-${suffix}`,
				legalName: `Shift Variant Worker ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;
		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-variants-employment-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const overnight = await createShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-overnight-shift-${suffix}`,
				idempotencyKey: `idem-p07-overnight-shift-${suffix}`,
				code: `OVERNIGHT-${suffix}`,
				name: "Overnight shift",
				shiftKind: "fixed",
				startLocal: "22:00",
				endLocal: "06:00",
				expectedMinutes: 480,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(overnight.ok).toBe(true);
		if (!overnight.ok) return;
		expect(overnight.data).toMatchObject({
			shiftKind: "fixed",
			isOvernight: true,
		});

		const flexible = await createShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-flexible-shift-${suffix}`,
				idempotencyKey: `idem-p07-flexible-shift-${suffix}`,
				code: `FLEXIBLE-${suffix}`,
				name: "Flexible shift",
				shiftKind: "flexible",
				startLocal: "08:00",
				endLocal: "18:00",
				expectedMinutes: 480,
				earliestClockInLocal: "07:00",
				latestClockOutLocal: "19:00",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(flexible.ok).toBe(true);
		if (!flexible.ok) return;
		expect(flexible.data).toMatchObject({
			shiftKind: "flexible",
			earliestClockInLocal: "07:00",
			latestClockOutLocal: "19:00",
			isOvernight: false,
		});
		const activeFlexible = await activateShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-flexible-activate-${suffix}`,
				shiftId: flexible.data.id,
				expectedVersion: flexible.data.version,
			},
			ready,
		);
		expect(activeFlexible.ok).toBe(true);
		if (!activeFlexible.ok) return;

		const split = await createShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-split-shift-${suffix}`,
				idempotencyKey: `idem-p07-split-shift-${suffix}`,
				code: `SPLIT-${suffix}`,
				name: "Split shift",
				shiftKind: "split",
				startLocal: "06:00",
				endLocal: "18:00",
				expectedMinutes: 600,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(split.ok).toBe(true);
		if (!split.ok) return;
		for (const shiftBreak of [
			{
				breakOrder: 1,
				durationMinutes: 30,
				startOffsetMinutes: 240,
				label: "mid-morning",
			},
			{
				breakOrder: 2,
				durationMinutes: 60,
				startOffsetMinutes: 420,
				label: "meal",
			},
		] as const) {
			const added = await addShiftBreak(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-p07-split-break-${shiftBreak.breakOrder}-${suffix}`,
					shiftId: split.data.id,
					...shiftBreak,
				},
				ready,
			);
			expect(added.ok).toBe(true);
		}
		const splitBreaks = await listShiftBreaks(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-split-break-list-${suffix}`,
				shiftId: split.data.id,
			},
			ready,
		);
		expect(splitBreaks.ok).toBe(true);
		if (!splitBreaks.ok) return;
		expect(
			splitBreaks.data.map((shiftBreak) => ({
				breakOrder: shiftBreak.breakOrder,
				durationMinutes: shiftBreak.durationMinutes,
			})),
		).toEqual([
			{ breakOrder: 1, durationMinutes: 30 },
			{ breakOrder: 2, durationMinutes: 60 },
		]);
		const activeSplit = await activateShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-split-activate-${suffix}`,
				shiftId: split.data.id,
				expectedVersion: split.data.version,
			},
			ready,
		);
		expect(activeSplit.ok).toBe(true);
		if (!activeSplit.ok) return;
		const splitAssignment = await assignShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-split-assignment-${suffix}`,
				idempotencyKey: `idem-p07-split-assignment-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				shiftId: activeSplit.data.id,
				scheduledDate: "2025-08-01",
				startsAt: "2025-08-01T06:00:00.000Z",
				endsAt: "2025-08-01T18:00:00.000Z",
				timezone: "UTC",
				segments: [
					{
						segmentOrder: 1,
						startsAt: "2025-08-01T06:00:00.000Z",
						endsAt: "2025-08-01T10:00:00.000Z",
					},
					{
						segmentOrder: 2,
						startsAt: "2025-08-01T14:00:00.000Z",
						endsAt: "2025-08-01T18:00:00.000Z",
					},
				],
			},
			ready,
		);
		expect(splitAssignment.ok).toBe(true);
		if (!splitAssignment.ok) return;
		const splitSegments = await listShiftAssignmentSegments(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-split-segments-${suffix}`,
				assignmentId: splitAssignment.data.id,
			},
			ready,
		);
		expect(splitSegments.ok).toBe(true);
		if (!splitSegments.ok) return;
		expect(
			splitSegments.data.map((segment) => [
				segment.segmentOrder,
				segment.startsAt.toISOString(),
				segment.endsAt.toISOString(),
			]),
		).toEqual([
			[1, "2025-08-01T06:00:00.000Z", "2025-08-01T10:00:00.000Z"],
			[2, "2025-08-01T14:00:00.000Z", "2025-08-01T18:00:00.000Z"],
		]);

		const planned = await assignShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-amend-assignment-${suffix}`,
				idempotencyKey: `idem-p07-amend-assignment-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				shiftId: activeFlexible.data.id,
				scheduledDate: "2025-08-02",
				startsAt: "2025-08-02T08:00:00.000Z",
				endsAt: "2025-08-02T16:00:00.000Z",
				timezone: "UTC",
			},
			ready,
		);
		expect(planned.ok).toBe(true);
		if (!planned.ok) return;
		const published = await publishShiftAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-amend-publish-${suffix}`,
				assignmentId: planned.data.id,
				expectedVersion: planned.data.version,
			},
			ready,
		);
		expect(published.ok).toBe(true);
		if (!published.ok) return;
		const changed = await changeShiftAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-amend-change-${suffix}`,
				assignmentId: published.data.id,
				startsAt: "2025-08-02T09:00:00.000Z",
				endsAt: "2025-08-02T17:00:00.000Z",
				expectedVersion: published.data.version,
			},
			ready,
		);
		expect(changed.ok).toBe(true);
		if (!changed.ok) return;
		expect(changed.data.publicationStatus).toBe("changed");
		expect(changed.data.startsAt.toISOString()).toBe(
			"2025-08-02T09:00:00.000Z",
		);

		const foreignAssignmentMutation = await changeShiftAssignment(
			{
				organizationId: `${ORG}-other`,
				actorUserId: ACTOR,
				correlationId: `corr-p07-amend-cross-org-${suffix}`,
				assignmentId: changed.data.id,
				startsAt: "2025-08-02T10:00:00.000Z",
				endsAt: "2025-08-02T18:00:00.000Z",
				expectedVersion: changed.data.version,
			},
			ready,
		);
		expect(foreignAssignmentMutation.ok).toBe(false);
		if (!foreignAssignmentMutation.ok) {
			expect(humanResourcesCodeFromResult(foreignAssignmentMutation)).toBe(
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		const assignmentAfterForeignMutation =
			await getScheduledShiftForEmployeeDate(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-p07-amend-after-cross-org-${suffix}`,
					employeeId: employee.data.id,
					scheduledDate: "2025-08-02",
				},
				ready,
			);
		expect(assignmentAfterForeignMutation.ok).toBe(true);
		if (
			!assignmentAfterForeignMutation.ok ||
			assignmentAfterForeignMutation.data === null
		) {
			return;
		}
		expect(assignmentAfterForeignMutation.data).toEqual(changed.data);

		const manual = await recordManualAttendance(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-manual-attendance-${suffix}`,
				idempotencyKey: `idem-p07-manual-attendance-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				shiftAssignmentId: changed.data.id,
				eventType: "clock_in",
				occurredAt: "2025-08-02T09:00:00.000Z",
				sourceTimezone: "UTC",
				localWorkDate: "2025-08-02",
				sourceReference: `manual-sheet-${suffix}`,
				notes: "manager-authorized manual capture",
			},
			ready,
		);
		expect(manual.ok).toBe(true);
		if (!manual.ok) return;
		expect(manual.data).toMatchObject({
			shiftAssignmentId: changed.data.id,
			source: "manual",
			sourceReference: `manual-sheet-${suffix}`,
			notes: "manager-authorized manual capture",
		});

		const changedAfterAttendance = await changeShiftAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p07-amend-after-attendance-${suffix}`,
				assignmentId: changed.data.id,
				startsAt: "2025-08-02T10:00:00.000Z",
				endsAt: "2025-08-02T18:00:00.000Z",
				expectedVersion: changed.data.version,
			},
			ready,
		);
		expect(changedAfterAttendance.ok).toBe(false);
		if (!changedAfterAttendance.ok) {
			expect(humanResourcesCodeFromResult(changedAfterAttendance)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}
	});

	it("converges partial attendance import failures and replay identically", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p05-partial-employee-${suffix}`,
				idempotencyKey: `idem-p05-partial-employee-${suffix}`,
				employeeNumber: `IMPORT-${suffix}`,
				legalName: `Import Parity Worker ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;
		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p05-partial-employment-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;
		const unknownEmployeeId =
			"00000000-0000-4000-8000-000000000099" as typeof employee.data.id;

		const seedBatch = await importAttendanceEvents(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p05-partial-seed-${suffix}`,
				idempotencyKey: `idem-p05-partial-seed-${suffix}`,
				batchId: `batch-p05-partial-seed-${suffix}`,
				sourceKey: "terminal-parity",
				events: [
					{
						employeeId: employee.data.id,
						employmentId: employment.data.id,
						eventType: "clock_in",
						occurredAt: "2025-08-03T01:00:00.000Z",
						sourceTimezone: "UTC",
						localWorkDate: "2025-08-03",
						sourceReference: `seed-clock-in-${suffix}`,
					},
					{
						employeeId: employee.data.id,
						employmentId: employment.data.id,
						eventType: "clock_out",
						occurredAt: "2025-08-03T09:00:00.000Z",
						sourceTimezone: "UTC",
						localWorkDate: "2025-08-03",
						sourceReference: `seed-clock-out-${suffix}`,
					},
				],
			},
			ready,
		);
		expect(seedBatch.ok).toBe(true);
		if (!seedBatch.ok) return;
		expect(seedBatch.data).toMatchObject({
			status: "completed",
			totals: { accepted: 2, skipped: 0, rejected: 0 },
		});

		const partialInput = {
			organizationId: ORG,
			actorUserId: ACTOR,
			idempotencyKey: `idem-p05-partial-batch-${suffix}`,
			batchId: `batch-p05-partial-${suffix}`,
			sourceKey: "terminal-parity",
			events: [
				{
					employeeId: employee.data.id,
					employmentId: employment.data.id,
					eventType: "clock_in" as const,
					occurredAt: "2025-08-03T01:00:00.000Z",
					sourceTimezone: "UTC",
					localWorkDate: "2025-08-03",
					sourceReference: `seed-clock-in-${suffix}`,
				},
				{
					employeeId: employee.data.id,
					employmentId: employment.data.id,
					eventType: "clock_in" as const,
					occurredAt: "2025-08-04T01:00:00.000Z",
					sourceTimezone: "UTC",
					localWorkDate: "2025-08-04",
					sourceReference: `accepted-clock-in-${suffix}`,
				},
				{
					employeeId: unknownEmployeeId,
					eventType: "clock_in" as const,
					occurredAt: "2025-08-04T02:00:00.000Z",
					sourceTimezone: "UTC",
					localWorkDate: "2025-08-04",
					sourceReference: `unknown-employee-${suffix}`,
				},
				{
					employeeId: employee.data.id,
					employmentId: employment.data.id,
					eventType: "clock_out" as const,
					occurredAt: "2025-08-04T09:00:00.000Z",
					sourceTimezone: "Not/AZone",
					localWorkDate: "2025-08-04",
					sourceReference: `invalid-timezone-${suffix}`,
				},
			],
		};
		const partial = await importAttendanceEvents(
			{
				...partialInput,
				correlationId: `corr-p05-partial-batch-${suffix}`,
			},
			ready,
		);
		expect(partial.ok).toBe(true);
		if (!partial.ok) return;
		expect(partial.data).toMatchObject({
			status: "partial",
			totals: { accepted: 1, skipped: 1, rejected: 2 },
		});
		expect(partial.data.skipped).toMatchObject([
			{
				rowIndex: 0,
				sourceReference: namespacedImportSourceReference(
					"terminal-parity",
					`seed-clock-in-${suffix}`,
				),
				reason: "already_imported",
			},
		]);
		expect(partial.data.skipped[0]?.eventId).toBeTruthy();
		expect(
			partial.data.rejected.map((row) => row.errorCode).toSorted(),
		).toEqual(["INVALID_TIMEZONE", "UNKNOWN_EMPLOYEE"]);

		const replay = await importAttendanceEvents(
			{
				...partialInput,
				correlationId: `corr-p05-partial-replay-${suffix}`,
			},
			ready,
		);
		expect(replay.ok).toBe(true);
		if (!replay.ok) return;
		expect(replay.data).toEqual(partial.data);

		const conflictingSourceReference = await importAttendanceEvents(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p05-partial-conflict-${suffix}`,
				idempotencyKey: `idem-p05-partial-conflict-${suffix}`,
				batchId: `batch-p05-partial-conflict-${suffix}`,
				sourceKey: "terminal-parity",
				events: [
					{
						employeeId: employee.data.id,
						employmentId: employment.data.id,
						eventType: "clock_out",
						occurredAt: "2025-08-03T10:00:00.000Z",
						sourceTimezone: "UTC",
						localWorkDate: "2025-08-03",
						sourceReference: `seed-clock-in-${suffix}`,
					},
				],
			},
			ready,
		);
		expect(conflictingSourceReference.ok).toBe(true);
		if (!conflictingSourceReference.ok) return;
		expect(conflictingSourceReference.data).toMatchObject({
			status: "failed",
			totals: { accepted: 0, skipped: 0, rejected: 1 },
			rejected: [{ errorCode: "SOURCE_REFERENCE_CONFLICT" }],
		});

		const persisted = await listAttendanceEvents(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-p05-partial-list-${suffix}`,
				employeeId: employee.data.id,
				fromDate: "2025-08-03",
				toDate: "2025-08-04",
			},
			ready,
		);
		expect(persisted.ok).toBe(true);
		if (!persisted.ok) return;
		expect(persisted.data).toHaveLength(3);
		expect(
			persisted.data.map((event) => event.sourceReference).toSorted(),
		).toEqual(
			[
				namespacedImportSourceReference(
					"terminal-parity",
					`seed-clock-in-${suffix}`,
				),
				namespacedImportSourceReference(
					"terminal-parity",
					`seed-clock-out-${suffix}`,
				),
				namespacedImportSourceReference(
					"terminal-parity",
					`accepted-clock-in-${suffix}`,
				),
			].toSorted(),
		);
	});

	it("rejects overlapping shift assignment parity", async () => {
		const ready = createHrParityHarness(adapter);
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

	it("enforces idempotency, isolation, stale-version, and self-approval boundaries", async () => {
		const ready = createHrParityHarness(adapter);
		const securityManager = `user-hr-time-security-manager-${suffix}`;
		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-security-employee-${suffix}`,
				idempotencyKey: `idem-security-employee-${suffix}`,
				employeeNumber: `SEC-${suffix}`,
				legalName: `Security Contract ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;
		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-security-employment-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const calendarInput = {
			organizationId: ORG,
			actorUserId: ACTOR,
			idempotencyKey: `idem-security-calendar-${suffix}`,
			code: `SEC-CAL-${suffix}`,
			name: "Security contract calendar",
			timezone: "UTC",
			calendarVersion: "v1",
			workWeek: STANDARD_WEEK,
			standardHoursPerDay: "8.00",
			effectiveFrom: "2025-01-01",
		};
		const calendar = await createWorkCalendar(
			{
				...calendarInput,
				correlationId: `corr-security-calendar-${suffix}`,
			},
			ready,
		);
		expect(calendar.ok).toBe(true);
		if (!calendar.ok) return;
		const calendarReplay = await createWorkCalendar(
			{
				...calendarInput,
				correlationId: `corr-security-calendar-replay-${suffix}`,
			},
			ready,
		);
		expect(calendarReplay.ok).toBe(true);
		if (!calendarReplay.ok) return;
		expect(calendarReplay.data.id).toBe(calendar.data.id);
		const calendarFingerprintConflict = await createWorkCalendar(
			{
				...calendarInput,
				correlationId: `corr-security-calendar-conflict-${suffix}`,
				code: `SEC-CAL-CONFLICT-${suffix}`,
				name: "Different fingerprint",
			},
			ready,
		);
		expect(calendarFingerprintConflict.ok).toBe(false);
		if (!calendarFingerprintConflict.ok) {
			expect(humanResourcesCodeFromResult(calendarFingerprintConflict)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}
		const crossOrganizationCalendar = await getWorkCalendar(
			{
				organizationId: `${ORG}-other`,
				actorUserId: ACTOR,
				correlationId: `corr-security-calendar-cross-org-${suffix}`,
				calendarId: calendar.data.id,
			},
			ready,
		);
		expect(crossOrganizationCalendar.ok).toBe(true);
		if (!crossOrganizationCalendar.ok) return;
		expect(crossOrganizationCalendar.data).toBeNull();

		const timesheet = await createTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-security-timesheet-${suffix}`,
				idempotencyKey: `idem-security-timesheet-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				periodStart: "2025-08-04",
				periodEnd: "2025-08-10",
			},
			ready,
		);
		expect(timesheet.ok).toBe(true);
		if (!timesheet.ok) return;
		const entry = await addTimesheetEntry(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-security-entry-${suffix}`,
				timesheetId: timesheet.data.id,
				employeeId: employee.data.id,
				workDate: "2025-08-04",
				timezone: "UTC",
				sourceType: "manual",
				timeType: "regular",
				recordedMinutes: 480,
				approvedMinutes: 480,
			},
			ready,
		);
		expect(entry.ok).toBe(true);
		if (!entry.ok) return;
		const current = await getTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-security-timesheet-current-${suffix}`,
				timesheetId: timesheet.data.id,
			},
			ready,
		);
		expect(current.ok).toBe(true);
		if (!current.ok || current.data === null) return;
		const staleSubmit = await submitTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-security-timesheet-stale-${suffix}`,
				timesheetId: current.data.id,
				expectedVersion: current.data.version - 1,
			},
			ready,
		);
		expect(staleSubmit.ok).toBe(false);
		if (!staleSubmit.ok) {
			expect(humanResourcesCodeFromResult(staleSubmit)).toBe(
				HUMAN_RESOURCES_ERROR_STALE_VERSION,
			);
		}
		const submitted = await submitTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-security-timesheet-submit-${suffix}`,
				timesheetId: current.data.id,
				expectedVersion: current.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) return;
		const crossOrganizationTimesheet = await getTimesheet(
			{
				organizationId: `${ORG}-other`,
				actorUserId: ACTOR,
				correlationId: `corr-security-timesheet-cross-org-${suffix}`,
				timesheetId: submitted.data.id,
			},
			ready,
		);
		expect(crossOrganizationTimesheet.ok).toBe(true);
		if (!crossOrganizationTimesheet.ok) return;
		expect(crossOrganizationTimesheet.data).toBeNull();

		const selfAuthority = await assignTimeApprovalAuthority(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-security-self-authority-${suffix}`,
				targetActorUserId: ACTOR,
				authority: "line_manager",
				effectiveFrom: "2020-01-01",
			},
			ready,
		);
		expect(selfAuthority.ok).toBe(true);
		if (!selfAuthority.ok) return;
		const managerAuthority = await assignTimeApprovalAuthority(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-security-manager-authority-${suffix}`,
				targetActorUserId: securityManager,
				authority: "line_manager",
				effectiveFrom: "2020-01-01",
			},
			ready,
		);
		expect(managerAuthority.ok).toBe(true);
		if (!managerAuthority.ok) return;
		const selfApproval = await approveTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-security-self-approval-${suffix}`,
				authority: "line_manager",
				timesheetId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(selfApproval.ok).toBe(false);
		if (!selfApproval.ok) {
			expect(humanResourcesCodeFromResult(selfApproval)).toBe(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			);
		}
		const managerApproval = await approveTimesheet(
			{
				organizationId: ORG,
				actorUserId: securityManager,
				correlationId: `corr-security-manager-approval-${suffix}`,
				authority: "line_manager",
				timesheetId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(managerApproval.ok).toBe(true);
		if (!managerApproval.ok) return;
		expect(managerApproval.data.status).toBe("approved");
	});

	it("keeps overtime requested, approved, actual, and payroll minutes distinct", async () => {
		const ready = createHrParityHarness(adapter);
		const overtimeManager = `user-hr-time-overtime-manager-${suffix}`;
		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-overtime-employee-${suffix}`,
				idempotencyKey: `idem-overtime-employee-${suffix}`,
				employeeNumber: `OT-${suffix}`,
				legalName: `Overtime Contract ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;
		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-overtime-employment-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;
		const requested = await createOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-overtime-request-${suffix}`,
				idempotencyKey: `idem-overtime-request-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				overtimeType: "weekday_overtime",
				requestedStartsAt: "2025-08-11T10:00:00.000Z",
				requestedEndsAt: "2025-08-11T12:00:00.000Z",
				requestedMinutes: 120,
				reason: "Quarter-end workload",
			},
			ready,
		);
		expect(requested.ok).toBe(true);
		if (!requested.ok) return;
		expect(requested.data.requestedMinutes).toBe(120);
		expect(requested.data.approvedMaximumMinutes).toBeNull();
		expect(requested.data.actualMinutes).toBeNull();
		expect(requested.data.payrollApprovedMinutes).toBeNull();

		const approved = await approveOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: overtimeManager,
				correlationId: `corr-overtime-approve-${suffix}`,
				requestId: requested.data.id,
				approvedMaximumMinutes: 90,
				expectedVersion: requested.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;
		expect(approved.data.requestedMinutes).toBe(120);
		expect(approved.data.approvedMaximumMinutes).toBe(90);

		const foreignActualMutation = await recordOvertimeActual(
			{
				organizationId: `${ORG}-other`,
				actorUserId: ACTOR,
				correlationId: `corr-overtime-actual-cross-org-${suffix}`,
				requestId: approved.data.id,
				actualMinutes: 1,
				expectedVersion: approved.data.version,
			},
			ready,
		);
		expect(foreignActualMutation.ok).toBe(false);
		if (!foreignActualMutation.ok) {
			expect(humanResourcesCodeFromResult(foreignActualMutation)).toBe(
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		const overtimeAfterForeignMutation = await getOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-overtime-after-cross-org-${suffix}`,
				requestId: approved.data.id,
			},
			ready,
		);
		expect(overtimeAfterForeignMutation.ok).toBe(true);
		if (
			!overtimeAfterForeignMutation.ok ||
			overtimeAfterForeignMutation.data === null
		) {
			return;
		}
		expect(overtimeAfterForeignMutation.data).toEqual(approved.data);

		const worked = await recordOvertimeActual(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-overtime-actual-${suffix}`,
				requestId: approved.data.id,
				actualMinutes: 75,
				expectedVersion: approved.data.version,
			},
			ready,
		);
		expect(worked.ok).toBe(true);
		if (!worked.ok) return;
		expect(worked.data.requestedMinutes).toBe(120);
		expect(worked.data.approvedMaximumMinutes).toBe(90);
		expect(worked.data.actualMinutes).toBe(75);

		const verified = await verifyOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: overtimeManager,
				correlationId: `corr-overtime-verify-${suffix}`,
				requestId: worked.data.id,
				payrollApprovedMinutes: 60,
				expectedVersion: worked.data.version,
			},
			ready,
		);
		expect(verified.ok).toBe(true);
		if (!verified.ok) return;
		expect(verified.data).toMatchObject({
			requestedMinutes: 120,
			approvedMaximumMinutes: 90,
			actualMinutes: 75,
			payrollApprovedMinutes: 60,
			status: "verified",
		});
		expect(
			new Set([
				verified.data.requestedMinutes,
				verified.data.approvedMaximumMinutes,
				verified.data.actualMinutes,
				verified.data.payrollApprovedMinutes,
			]).size,
		).toBe(4);
	});

	it("detects every canonical attendance exception through the shared adapter contract", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-exception-matrix-employee-${suffix}`,
				idempotencyKey: `idem-exception-matrix-employee-${suffix}`,
				employeeNumber: `EX-${suffix}`,
				legalName: `Exception Matrix ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;
		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-exception-matrix-employment-${suffix}`,
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
				correlationId: `corr-exception-matrix-calendar-${suffix}`,
				idempotencyKey: `idem-exception-matrix-calendar-${suffix}`,
				code: `EX-CAL-${suffix}`,
				name: "Exception matrix calendar",
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
		const calendarAssignment = await assignEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-exception-matrix-calendar-assignment-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				calendarId: calendar.data.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(calendarAssignment.ok).toBe(true);
		if (!calendarAssignment.ok) return;

		const policy = await createTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-exception-matrix-policy-${suffix}`,
				idempotencyKey: `idem-exception-matrix-policy-${suffix}`,
				code: `EX-POL-${suffix}`,
				name: "Exception matrix policy",
				effectiveFrom: "2025-01-01",
				minimumRestMinutes: 660,
				approvalSteps: ["line_manager"],
			},
			ready,
		);
		expect(policy.ok).toBe(true);
		if (!policy.ok) return;
		const activePolicy = await activateTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-exception-matrix-policy-activate-${suffix}`,
				policyId: policy.data.id,
				expectedVersion: policy.data.version,
			},
			ready,
		);
		expect(activePolicy.ok).toBe(true);
		if (!activePolicy.ok) return;
		const policyAssignment = await assignTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-exception-matrix-policy-assignment-${suffix}`,
				policyId: activePolicy.data.id,
				employmentId: employment.data.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(policyAssignment.ok).toBe(true);
		if (!policyAssignment.ok) return;

		const createPublishedAssignment = async (input: {
			tag: string;
			scheduledDate: string;
			startsAt: string;
			endsAt: string;
		}) => {
			const shift = await createShift(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-exception-${input.tag}-shift-${suffix}`,
					idempotencyKey: `idem-exception-${input.tag}-shift-${suffix}`,
					code: `EX-${input.tag}-${suffix}`,
					name: `Exception ${input.tag}`,
					shiftKind: "fixed",
					startLocal: "09:00",
					endLocal: "17:00",
					expectedMinutes: 480,
					overtimeEligible: true,
					locationKey: "hq",
					effectiveFrom: "2025-01-01",
				},
				ready,
			);
			expect(shift.ok).toBe(true);
			if (!shift.ok) throw new Error(`Failed to create ${input.tag} shift`);
			const active = await activateShift(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-exception-${input.tag}-activate-${suffix}`,
					shiftId: shift.data.id,
					expectedVersion: shift.data.version,
				},
				ready,
			);
			expect(active.ok).toBe(true);
			if (!active.ok) throw new Error(`Failed to activate ${input.tag} shift`);
			const assignment = await assignShift(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-exception-${input.tag}-assign-${suffix}`,
					idempotencyKey: `idem-exception-${input.tag}-assign-${suffix}`,
					employeeId: employee.data.id,
					employmentId: employment.data.id,
					shiftId: active.data.id,
					scheduledDate: input.scheduledDate,
					startsAt: input.startsAt,
					endsAt: input.endsAt,
					locationKey: "hq",
					timezone: "UTC",
				},
				ready,
			);
			expect(assignment.ok).toBe(true);
			if (!assignment.ok) {
				throw new Error(`Failed to create ${input.tag} assignment`);
			}
			const published = await publishShiftAssignment(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-exception-${input.tag}-publish-${suffix}`,
					assignmentId: assignment.data.id,
					expectedVersion: assignment.data.version,
				},
				ready,
			);
			expect(published.ok).toBe(true);
			if (!published.ok) {
				throw new Error(`Failed to publish ${input.tag} assignment`);
			}
			return published.data;
		};

		const groupedAssignment = await createPublishedAssignment({
			tag: "grouped",
			scheduledDate: "2025-07-08",
			startsAt: "2025-07-08T01:00:00.000Z",
			endsAt: "2025-07-08T09:00:00.000Z",
		});
		const groupedBase = {
			organizationId: ORG,
			actorUserId: ACTOR,
			employeeId: employee.data.id,
			employmentId: employment.data.id,
			shiftAssignmentId: groupedAssignment.id,
			sourceTimezone: "UTC",
			localWorkDate: "2025-07-08",
			locationKey: "field-site",
		};
		const groupedEvents = [
			await recordClockIn(
				{
					...groupedBase,
					correlationId: `corr-exception-grouped-in-${suffix}`,
					idempotencyKey: `idem-exception-grouped-in-${suffix}`,
					occurredAt: "2025-07-08T01:00:00.000Z",
				},
				ready,
			),
			await recordClockIn(
				{
					...groupedBase,
					correlationId: `corr-exception-grouped-in-duplicate-${suffix}`,
					idempotencyKey: `idem-exception-grouped-in-duplicate-${suffix}`,
					occurredAt: "2025-07-08T01:05:00.000Z",
				},
				ready,
			),
			await recordBreakStart(
				{
					...groupedBase,
					correlationId: `corr-exception-grouped-break-start-${suffix}`,
					idempotencyKey: `idem-exception-grouped-break-start-${suffix}`,
					occurredAt: "2025-07-08T04:00:00.000Z",
				},
				ready,
			),
			await recordBreakEnd(
				{
					...groupedBase,
					correlationId: `corr-exception-grouped-break-end-${suffix}`,
					idempotencyKey: `idem-exception-grouped-break-end-${suffix}`,
					occurredAt: "2025-07-08T05:00:00.000Z",
				},
				ready,
			),
			await recordClockOut(
				{
					...groupedBase,
					correlationId: `corr-exception-grouped-out-${suffix}`,
					idempotencyKey: `idem-exception-grouped-out-${suffix}`,
					occurredAt: "2025-07-08T11:00:00.000Z",
				},
				ready,
			),
		];
		expect(groupedEvents.every((result) => result.ok)).toBe(true);
		const groupedSession = await resolveAttendanceSession(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-exception-grouped-session-${suffix}`,
				idempotencyKey: `idem-exception-grouped-session-${suffix}`,
				employeeId: employee.data.id,
				localWorkDate: "2025-07-08",
				timezone: "UTC",
			},
			ready,
		);
		expect(groupedSession.ok).toBe(true);
		if (!groupedSession.ok) return;

		const earlyAssignment = await createPublishedAssignment({
			tag: "early",
			scheduledDate: "2025-07-09",
			startsAt: "2025-07-09T01:00:00.000Z",
			endsAt: "2025-07-09T09:00:00.000Z",
		});
		const onlyClockOut = await recordClockOut(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-exception-early-out-${suffix}`,
				idempotencyKey: `idem-exception-early-out-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				shiftAssignmentId: earlyAssignment.id,
				occurredAt: "2025-07-09T08:00:00.000Z",
				sourceTimezone: "UTC",
				localWorkDate: "2025-07-09",
			},
			ready,
		);
		expect(onlyClockOut.ok).toBe(true);
		const earlySession = await resolveAttendanceSession(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-exception-early-session-${suffix}`,
				idempotencyKey: `idem-exception-early-session-${suffix}`,
				employeeId: employee.data.id,
				localWorkDate: "2025-07-09",
				timezone: "UTC",
			},
			ready,
		);
		expect(earlySession.ok).toBe(true);
		if (!earlySession.ok) return;

		const lateAssignment = await createPublishedAssignment({
			tag: "late",
			scheduledDate: "2025-07-10",
			startsAt: "2025-07-10T01:00:00.000Z",
			endsAt: "2025-07-10T09:00:00.000Z",
		});
		const onlyClockIn = await recordClockIn(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-exception-late-in-${suffix}`,
				idempotencyKey: `idem-exception-late-in-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				shiftAssignmentId: lateAssignment.id,
				occurredAt: "2025-07-10T01:20:00.000Z",
				sourceTimezone: "UTC",
				localWorkDate: "2025-07-10",
			},
			ready,
		);
		expect(onlyClockIn.ok).toBe(true);
		const lateSession = await resolveAttendanceSession(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-exception-late-session-${suffix}`,
				idempotencyKey: `idem-exception-late-session-${suffix}`,
				employeeId: employee.data.id,
				localWorkDate: "2025-07-10",
				timezone: "UTC",
			},
			ready,
		);
		expect(lateSession.ok).toBe(true);
		if (!lateSession.ok) return;

		await createPublishedAssignment({
			tag: "scheduled",
			scheduledDate: "2025-07-11",
			startsAt: "2025-07-11T01:00:00.000Z",
			endsAt: "2025-07-11T09:00:00.000Z",
		});
		const otherAssignment = await createPublishedAssignment({
			tag: "other",
			scheduledDate: "2025-07-12",
			startsAt: "2025-07-12T01:00:00.000Z",
			endsAt: "2025-07-12T09:00:00.000Z",
		});
		const mismatchEvents = [
			await recordClockIn(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-exception-mismatch-in-${suffix}`,
					idempotencyKey: `idem-exception-mismatch-in-${suffix}`,
					employeeId: employee.data.id,
					employmentId: employment.data.id,
					shiftAssignmentId: otherAssignment.id,
					occurredAt: "2025-07-11T01:00:00.000Z",
					sourceTimezone: "UTC",
					localWorkDate: "2025-07-11",
				},
				ready,
			),
			await recordClockOut(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-exception-mismatch-out-${suffix}`,
					idempotencyKey: `idem-exception-mismatch-out-${suffix}`,
					employeeId: employee.data.id,
					employmentId: employment.data.id,
					shiftAssignmentId: otherAssignment.id,
					occurredAt: "2025-07-11T09:00:00.000Z",
					sourceTimezone: "UTC",
					localWorkDate: "2025-07-11",
				},
				ready,
			),
		];
		expect(mismatchEvents.every((result) => result.ok)).toBe(true);
		const mismatchSession = await resolveAttendanceSession(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-exception-mismatch-session-${suffix}`,
				idempotencyKey: `idem-exception-mismatch-session-${suffix}`,
				employeeId: employee.data.id,
				localWorkDate: "2025-07-11",
				timezone: "UTC",
			},
			ready,
		);
		expect(mismatchSession.ok).toBe(true);
		if (!mismatchSession.ok) return;

		const unplannedEvents = [
			await recordClockIn(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-exception-unplanned-in-${suffix}`,
					idempotencyKey: `idem-exception-unplanned-in-${suffix}`,
					employeeId: employee.data.id,
					employmentId: employment.data.id,
					occurredAt: "2025-07-13T01:00:00.000Z",
					sourceTimezone: "UTC",
					localWorkDate: "2025-07-13",
				},
				ready,
			),
			await recordClockOut(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-exception-unplanned-out-${suffix}`,
					idempotencyKey: `idem-exception-unplanned-out-${suffix}`,
					employeeId: employee.data.id,
					employmentId: employment.data.id,
					occurredAt: "2025-07-13T09:00:00.000Z",
					sourceTimezone: "UTC",
					localWorkDate: "2025-07-13",
				},
				ready,
			),
		];
		expect(unplannedEvents.every((result) => result.ok)).toBe(true);
		const unplannedSession = await resolveAttendanceSession(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-exception-unplanned-session-${suffix}`,
				idempotencyKey: `idem-exception-unplanned-session-${suffix}`,
				employeeId: employee.data.id,
				localWorkDate: "2025-07-13",
				timezone: "UTC",
			},
			ready,
		);
		expect(unplannedSession.ok).toBe(true);
		if (!unplannedSession.ok) return;

		const shortRestClockIn = await recordClockIn(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-exception-rest-in-${suffix}`,
				idempotencyKey: `idem-exception-rest-in-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				occurredAt: "2025-07-13T15:00:00.000Z",
				sourceTimezone: "UTC",
				localWorkDate: "2025-07-14",
			},
			ready,
		);
		expect(shortRestClockIn.ok).toBe(true);
		const shortRestSession = await resolveAttendanceSession(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-exception-rest-session-${suffix}`,
				idempotencyKey: `idem-exception-rest-session-${suffix}`,
				employeeId: employee.data.id,
				localWorkDate: "2025-07-14",
				timezone: "UTC",
			},
			ready,
		);
		expect(shortRestSession.ok).toBe(true);
		if (!shortRestSession.ok) return;

		const absenceTimesheet = await createTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-exception-absence-timesheet-${suffix}`,
				idempotencyKey: `idem-exception-absence-timesheet-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				periodStart: "2025-07-07",
				periodEnd: "2025-07-07",
			},
			ready,
		);
		expect(absenceTimesheet.ok).toBe(true);
		if (!absenceTimesheet.ok) return;
		const lookup = createStoreWorkCalendarLookup({ store: ready.store });
		const generated = await generateTimesheetEntries(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-exception-absence-generate-${suffix}`,
				timesheetId: absenceTimesheet.data.id,
				expectedVersion: absenceTimesheet.data.version,
			},
			{
				...ready,
				workCalendar: createProductionWorkCalendar({ lookup }),
			},
		);
		expect(generated.ok).toBe(true);

		const beforeRedetection = await listUnresolvedAttendanceExceptions(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: `corr-exception-matrix-list-before-${suffix}`,
				employeeId: employee.data.id,
			},
			ready,
		);
		expect(beforeRedetection.ok).toBe(true);
		if (!beforeRedetection.ok) return;
		const groupedCountBefore = beforeRedetection.data.filter(
			(exception) =>
				exception.sessionId === groupedSession.data.id &&
				parseExceptionDetectionRemarks(exception.remarks)?.detectionSource ===
					ATTENDANCE_SESSION_DETECTION_SOURCE,
		).length;
		expect(groupedCountBefore).toBe(4);

		const groupedRedetection = await resolveAttendanceSession(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-exception-grouped-redetect-${suffix}`,
				idempotencyKey: `idem-exception-grouped-redetect-${suffix}`,
				employeeId: employee.data.id,
				localWorkDate: "2025-07-08",
				timezone: "UTC",
			},
			ready,
		);
		expect(groupedRedetection.ok).toBe(true);
		if (!groupedRedetection.ok) return;

		const unresolved = await listUnresolvedAttendanceExceptions(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: `corr-exception-matrix-list-after-${suffix}`,
				employeeId: employee.data.id,
			},
			ready,
		);
		expect(unresolved.ok).toBe(true);
		if (!unresolved.ok) return;
		const groupedCountAfter = unresolved.data.filter(
			(exception) =>
				exception.sessionId === groupedSession.data.id &&
				parseExceptionDetectionRemarks(exception.remarks)?.detectionSource ===
					ATTENDANCE_SESSION_DETECTION_SOURCE,
		).length;
		expect(groupedCountAfter).toBe(groupedCountBefore);

		const typesForSession = (sessionId: string) =>
			unresolved.data
				.filter(
					(exception) =>
						exception.sessionId === sessionId &&
						parseExceptionDetectionRemarks(exception.remarks)
							?.detectionSource === ATTENDANCE_SESSION_DETECTION_SOURCE,
				)
				.map((exception) => exception.exceptionType);
		expect(typesForSession(groupedSession.data.id)).toEqual(
			expect.arrayContaining([
				"overlapping_attendance",
				"excessive_break",
				"location_mismatch",
				"overtime_candidate",
			]),
		);
		expect(typesForSession(earlySession.data.id)).toEqual(
			expect.arrayContaining(["missing_clock_in", "early_departure"]),
		);
		expect(typesForSession(lateSession.data.id)).toEqual(
			expect.arrayContaining(["late_arrival", "missing_clock_out"]),
		);
		expect(typesForSession(mismatchSession.data.id)).toContain(
			"schedule_mismatch",
		);
		expect(typesForSession(unplannedSession.data.id)).toContain(
			"unplanned_attendance",
		);
		expect(typesForSession(shortRestSession.data.id)).toContain(
			"insufficient_rest",
		);

		expect(ATTENDANCE_EXCEPTION_INVENTORY_IS_EXHAUSTIVE).toBe(true);
		for (const exceptionType of ALL_ATTENDANCE_EXCEPTION_TYPES) {
			const matching = unresolved.data.filter(
				(exception) => exception.exceptionType === exceptionType,
			);
			expect(matching.length).toBeGreaterThan(0);
			expect(
				matching.every(
					(exception) =>
						exception.severity === ATTENDANCE_EXCEPTION_SEVERITY[exceptionType],
				),
			).toBe(true);
		}
		const detected = new Set(
			unresolved.data
				.filter((exception) => exception.remarks !== null)
				.map((exception) => exception.exceptionType),
		);
		expect([...detected].sort()).toEqual(
			[...ALL_ATTENDANCE_EXCEPTION_TYPES].sort(),
		);
	});

	it("employment omission resolves one historical employment as of the work date", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-employment-as-of-employee-${suffix}`,
				idempotencyKey: `idem-employment-as-of-employee-${suffix}`,
				employeeNumber: `EAO-${suffix}`,
				legalName: `Employment As Of ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;
		const historical = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-employment-as-of-historical-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
				endsOn: "2025-06-30",
			},
			ready,
		);
		expect(historical.ok).toBe(true);
		if (!historical.ok) return;
		const terminated = await amendEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-employment-as-of-terminate-${suffix}`,
				employmentId: historical.data.id,
				status: "terminated",
				expectedVersion: historical.data.version,
			},
			ready,
		);
		expect(terminated.ok).toBe(true);
		if (!terminated.ok) return;
		const current = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-employment-as-of-current-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-07-02",
			},
			ready,
		);
		expect(current.ok).toBe(true);
		if (!current.ok) return;

		const historicalBoundary = await recordClockIn(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-employment-as-of-historical-boundary-${suffix}`,
				idempotencyKey: `idem-employment-as-of-historical-boundary-${suffix}`,
				employeeId: employee.data.id,
				occurredAt: "2025-06-30T09:00:00.000Z",
				sourceTimezone: "UTC",
				localWorkDate: "2025-06-30",
			},
			ready,
		);
		expect(historicalBoundary.ok).toBe(true);
		if (!historicalBoundary.ok) return;
		expect(historicalBoundary.data.employmentId).toBe(terminated.data.id);

		const gap = await recordClockIn(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-employment-as-of-gap-${suffix}`,
				idempotencyKey: `idem-employment-as-of-gap-${suffix}`,
				employeeId: employee.data.id,
				occurredAt: "2025-07-01T09:00:00.000Z",
				sourceTimezone: "UTC",
				localWorkDate: "2025-07-01",
			},
			ready,
		);
		expect(gap.ok).toBe(false);

		const currentBoundary = await recordClockIn(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-employment-as-of-current-boundary-${suffix}`,
				idempotencyKey: `idem-employment-as-of-current-boundary-${suffix}`,
				employeeId: employee.data.id,
				occurredAt: "2025-07-02T09:00:00.000Z",
				sourceTimezone: "UTC",
				localWorkDate: "2025-07-02",
			},
			ready,
		);
		expect(currentBoundary.ok).toBe(true);
		if (!currentBoundary.ok) return;
		expect(currentBoundary.data.employmentId).toBe(current.data.id);

		const overlappingEmployee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-employment-as-of-overlap-employee-${suffix}`,
				idempotencyKey: `idem-employment-as-of-overlap-employee-${suffix}`,
				employeeNumber: `EAO-OVERLAP-${suffix}`,
				legalName: `Employment Overlap ${suffix}`,
			},
			ready,
		);
		expect(overlappingEmployee.ok).toBe(true);
		if (!overlappingEmployee.ok) return;
		const overlappingHistorical = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-employment-as-of-overlap-historical-${suffix}`,
				employeeId: overlappingEmployee.data.id,
				startsOn: "2025-01-01",
				endsOn: "2025-12-31",
			},
			ready,
		);
		expect(overlappingHistorical.ok).toBe(true);
		if (!overlappingHistorical.ok) return;
		const overlappingCurrent = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-employment-as-of-overlap-current-${suffix}`,
				employeeId: overlappingEmployee.data.id,
				startsOn: "2025-07-01",
			},
			ready,
		);
		expect(overlappingCurrent.ok).toBe(true);
		if (!overlappingCurrent.ok) return;
		const ambiguous = await recordClockIn(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-employment-as-of-overlap-${suffix}`,
				idempotencyKey: `idem-employment-as-of-overlap-${suffix}`,
				employeeId: overlappingEmployee.data.id,
				occurredAt: "2025-07-15T09:00:00.000Z",
				sourceTimezone: "UTC",
				localWorkDate: "2025-07-15",
			},
			ready,
		);
		expect(ambiguous.ok).toBe(false);
		if (!ambiguous.ok) {
			expect(humanResourcesCodeFromResult(ambiguous)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}
	});

	it("suppresses leave-day absence, preserves control-day absence, and hands off paid leave parity", async () => {
		const ready = createHrParityHarness(adapter);
		const leaveManager = `user-hr-time-leave-manager-${suffix}`;
		const leaveDate = "2025-08-18";
		const controlDate = "2025-08-19";

		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-leave-employee-${suffix}`,
				idempotencyKey: `idem-leave-employee-${suffix}`,
				employeeNumber: `LEAVE-${suffix}`,
				legalName: `Leave Worker ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-leave-employment-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const actorMapped = await mapActorToEmployee(ready.store, {
			organizationId: ORG,
			userId: ACTOR,
			employeeId: employee.data.id,
			actorUserId: ACTOR,
			effectiveFrom: "2025-01-01",
		});
		expect(actorMapped.ok).toBe(true);
		if (!actorMapped.ok) return;

		const managerEmployee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-leave-manager-employee-${suffix}`,
				idempotencyKey: `idem-leave-manager-employee-${suffix}`,
				employeeNumber: `LEAVE-MANAGER-${suffix}`,
				legalName: `Leave Manager ${suffix}`,
			},
			ready,
		);
		expect(managerEmployee.ok).toBe(true);
		if (!managerEmployee.ok) return;

		const managerMapped = await mapActorToEmployee(ready.store, {
			organizationId: ORG,
			userId: leaveManager,
			employeeId: managerEmployee.data.id,
			actorUserId: ACTOR,
			effectiveFrom: "2025-01-01",
		});
		expect(managerMapped.ok).toBe(true);
		if (!managerMapped.ok) return;

		const reportingLine = await assignPrimaryReportingLine(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-leave-reporting-${suffix}`,
				employeeId: employee.data.id,
				managerEmployeeId: managerEmployee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(reportingLine.ok).toBe(true);
		if (!reportingLine.ok) return;

		const calendar = await createWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-leave-calendar-${suffix}`,
				idempotencyKey: `idem-leave-calendar-${suffix}`,
				code: `LEAVE-${suffix}`,
				name: "Leave parity calendar",
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

		const calendarAssignment = await assignEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-leave-calendar-assignment-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				calendarId: calendar.data.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(calendarAssignment.ok).toBe(true);
		if (!calendarAssignment.ok) return;

		const policy = await createLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-leave-policy-${suffix}`,
				code: `ANNUAL-${suffix}`,
				name: "Annual leave parity",
				leaveType: "annual",
				unit: "days",
				paid: true,
				allowsNegativeBalance: false,
				allowSelfApproval: false,
				effectiveFrom: "2025-01-01",
				allowedEmploymentStatuses: ["active"],
			},
			ready,
		);
		expect(policy.ok).toBe(true);
		if (!policy.ok) return;

		const publishedPolicy = await publishLeavePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-leave-policy-publish-${suffix}`,
				policyId: policy.data.id,
				expectedVersion: policy.data.version,
			},
			ready,
		);
		expect(publishedPolicy.ok).toBe(true);
		if (!publishedPolicy.ok) return;

		const entitlement = await grantLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-leave-entitlement-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				policyId: publishedPolicy.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				openingQuantity: "10",
				idempotencyKey: `idem-leave-entitlement-${suffix}`,
			},
			ready,
		);
		expect(entitlement.ok).toBe(true);
		if (!entitlement.ok) return;

		const draftLeave = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-leave-draft-${suffix}`,
				employeeId: employee.data.id,
				entitlementId: entitlement.data.id,
				startDate: leaveDate,
				endDate: leaveDate,
				requestedQuantity: "1",
				idempotencyKey: `idem-leave-request-${suffix}`,
			},
			ready,
		);
		expect(draftLeave.ok).toBe(true);
		if (!draftLeave.ok) return;

		const submittedLeave = await submitLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-leave-submit-${suffix}`,
				requestId: draftLeave.data.id,
				expectedVersion: draftLeave.data.version,
			},
			ready,
		);
		expect(submittedLeave.ok).toBe(true);
		if (!submittedLeave.ok) return;

		const approvedLeave = await approveLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: leaveManager,
				correlationId: `corr-leave-approve-${suffix}`,
				requestId: submittedLeave.data.id,
				expectedVersion: submittedLeave.data.version,
			},
			ready,
		);
		expect(approvedLeave.ok).toBe(true);
		if (!approvedLeave.ok) return;

		const timesheet = await createTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-leave-timesheet-${suffix}`,
				idempotencyKey: `idem-leave-timesheet-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				periodStart: leaveDate,
				periodEnd: controlDate,
			},
			ready,
		);
		expect(timesheet.ok).toBe(true);
		if (!timesheet.ok) return;

		const lookup = createStoreWorkCalendarLookup({ store: ready.store });
		const generationPorts = {
			...ready,
			workCalendar: createProductionWorkCalendar({ lookup }),
		};
		const generated = await generateTimesheetEntries(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-leave-generate-${suffix}`,
				timesheetId: timesheet.data.id,
				expectedVersion: timesheet.data.version,
			},
			generationPorts,
		);
		expect(generated.ok).toBe(true);
		if (!generated.ok) return;

		const leaveEntries = generated.data.entries.filter(
			(entry) => entry.sourceType === "leave",
		);
		expect(leaveEntries).toHaveLength(1);
		expect(leaveEntries[0]?.workDate).toBe(leaveDate);
		expect(leaveEntries[0]?.approvedMinutes).toBe(480);
		expect(leaveEntries[0]?.timeType).toBe("training");
		expect(leaveEntries[0]?.timezone).toBe("Asia/Singapore");

		const regenerated = await generateTimesheetEntries(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-leave-regenerate-${suffix}`,
				timesheetId: generated.data.timesheet.id,
				expectedVersion: generated.data.timesheet.version,
			},
			generationPorts,
		);
		expect(regenerated.ok).toBe(true);
		if (!regenerated.ok) return;
		expect(
			regenerated.data.entries.filter((entry) => entry.sourceType === "leave"),
		).toHaveLength(1);

		const unresolved = await listUnresolvedAttendanceExceptions(
			{
				organizationId: ORG,
				actorUserId: leaveManager,
				correlationId: `corr-leave-exceptions-${suffix}`,
				employeeId: employee.data.id,
			},
			ready,
		);
		expect(unresolved.ok).toBe(true);
		if (!unresolved.ok) return;

		const absenceExceptions = unresolved.data.filter(
			(exception) => exception.exceptionType === "absence",
		);
		expect(absenceExceptions).toHaveLength(1);
		const absenceRemarks = parseAbsenceDetectionRemarks(
			absenceExceptions[0]?.remarks ?? null,
		);
		expect(absenceRemarks).toEqual({
			workDate: controlDate,
			expectedMinutes: 480,
			detectionSource: TIMESHEET_GENERATION_ABSENCE_SOURCE,
			shiftAssignmentId: null,
			timesheetId: regenerated.data.timesheet.id,
		});

		const authority = await assignTimeApprovalAuthority(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-leave-authority-${suffix}`,
				targetActorUserId: leaveManager,
				authority: "line_manager",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(authority.ok).toBe(true);
		if (!authority.ok) return;

		const preApprovalHandoff = await getApprovedTimeHandoff(
			{
				organizationId: ORG,
				actorUserId: leaveManager,
				correlationId: `corr-leave-handoff-before-approval-${suffix}`,
				timesheetId: regenerated.data.timesheet.id,
			},
			ready,
		);
		expect(preApprovalHandoff.ok).toBe(true);
		if (!preApprovalHandoff.ok) return;
		expect(preApprovalHandoff.data).toBeNull();

		const submittedTimesheet = await submitTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-leave-timesheet-submit-${suffix}`,
				timesheetId: regenerated.data.timesheet.id,
				expectedVersion: regenerated.data.timesheet.version,
			},
			ready,
		);
		expect(submittedTimesheet.ok).toBe(true);
		if (!submittedTimesheet.ok) return;

		const approvedTimesheet = await approveTimesheet(
			{
				organizationId: ORG,
				actorUserId: leaveManager,
				correlationId: `corr-leave-timesheet-approve-${suffix}`,
				authority: "line_manager",
				timesheetId: submittedTimesheet.data.id,
				expectedVersion: submittedTimesheet.data.version,
			},
			ready,
		);
		expect(approvedTimesheet.ok).toBe(true);
		if (!approvedTimesheet.ok) return;

		const handoff = await getApprovedTimeHandoff(
			{
				organizationId: ORG,
				actorUserId: leaveManager,
				correlationId: `corr-leave-handoff-${suffix}`,
				timesheetId: approvedTimesheet.data.id,
			},
			ready,
		);
		expect(handoff.ok).toBe(true);
		if (!handoff.ok || handoff.data === null) return;
		expect(handoff.data.paidLeaveMinutes).toBe(480);
		expect(handoff.data.unpaidLeaveMinutes).toBe(0);
	});
}

describe("human-resources.time.parity (memory)", () => {
	defineTimeParitySuite("memory");
});

describe.runIf(runDrizzleParity)(
	"human-resources.time.parity (drizzle)",
	() => {
		defineTimeParitySuite("drizzle");
	},
);
