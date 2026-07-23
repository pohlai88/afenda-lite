/**
 * Time management memory suite (HR Time).
 */

import { describe, expect, it } from "vitest";

import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
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
import { HUMAN_RESOURCES_PERMISSION_CODES } from "../src/permissions";
import { createProductionWorkCalendar } from "../src/production-work-calendar";
import { createMemoryHumanResourcesStore } from "../src/testing";
import {
	approveAttendanceBreakWaiver,
	listAttendanceBreakWaiverDecisions,
} from "../src/time/attendance/break-waivers";
import {
	correctAttendanceEvent,
	getAttendanceEvent,
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
	SCHEDULE_PUBLISH_DETECTION_SOURCE,
} from "../src/time/attendance/exception-detection";
import {
	createAttendanceException,
	excuseAttendanceException,
	listUnresolvedAttendanceExceptions,
	reviewAttendanceException,
} from "../src/time/attendance/exceptions";
import { importAttendanceEvents } from "../src/time/attendance/import";
import { namespacedImportSourceReference } from "../src/time/attendance/import-keys";
import { resolveAttendanceSession } from "../src/time/attendance/sessions";
import { getDailyAttendanceSummary } from "../src/time/attendance/summary";
import {
	addCalendarDateOverride,
	assignEmploymentCalendar,
	createWorkCalendar,
	endWorkCalendarAssignment,
	getWorkCalendar,
	listWorkCalendarHolidays,
	removeCalendarDateOverride,
	resolveEmploymentCalendar,
	supersedeWorkCalendar,
} from "../src/time/calendar";
import { resolveWorkCalendarCivilDay } from "../src/time/calendar-resolution";
import { getApprovedTimeHandoff } from "../src/time/handoff/approved-time-handoff";
import type { AttendanceSourcePort } from "../src/time/handoff/ports";
import {
	approveOvertimeRequest,
	createOvertimeRequest,
	listPendingOvertimeApprovals,
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
	listLocationSchedule,
	listShiftAssignmentSegments,
	publishShiftAssignment,
} from "../src/time/scheduling";
import {
	activateShift,
	addShiftBreak,
	createShift,
	getShift,
	listShiftBreaks,
	supersedeShift,
	updateShift,
} from "../src/time/shift";
import {
	addTimesheetEntry,
	approveTimesheet,
	createTimesheet,
	generateTimesheetEntries,
	getTimesheet,
	getTimesheetForEmployeePeriod,
	getTimesheetTotals,
	listTimesheetApprovalDecisions,
	listTimesheetEntries,
	reopenTimesheet,
	returnTimesheet,
	submitTimesheet,
	updateTimesheetEntry,
} from "../src/time/timesheet";
import {
	parseAbsenceDetectionRemarks,
	TIMESHEET_GENERATION_ABSENCE_SOURCE,
} from "../src/time/timesheet-generation";
import type { AttendanceExceptionType } from "../src/types";
import { createTestHumanResourcesCommandOptions } from "./helpers/command-options";
import {
	createStoreBackedIdentityResolver,
	mapActorToEmployee,
} from "./helpers/identity-resolver";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { humanResourcesCodeFromResult } from "./helpers/result-details";
import { createStoreWorkCalendarLookup } from "./helpers/store-work-calendar-lookup";

const ORG = "org-hr-time-a";
const ORG_B = "org-hr-time-b";
const ACTOR = "user-hr-time-employee";
const MANAGER = "user-hr-time-manager";

const STANDARD_WEEK = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
	dayOfWeek: dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
	isWorkingDay: dayOfWeek >= 1 && dayOfWeek <= 5,
	standardStartTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "09:00" : null,
	standardEndTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "17:00" : null,
	standardMinutes: dayOfWeek >= 1 && dayOfWeek <= 5 ? 480 : null,
}));

function harness() {
	const store = createMemoryHumanResourcesStore();
	const ports = createMemoryMutationPorts();
	const authorization = createGrantingHumanResourcesAuthorization([
		...HUMAN_RESOURCES_PERMISSION_CODES,
	]);
	const identityResolver = createStoreBackedIdentityResolver(store);
	return {
		...createTestHumanResourcesCommandOptions({
			store,
			ports,
			authorization,
			identityResolver,
		}),
		store,
		ports,
	};
}

async function grantTimeApprovalAuthority(
	ready: ReturnType<typeof harness>,
	input: {
		organizationId: string;
		targetActorUserId: string;
		authority: "line_manager" | "department" | "hr" | "payroll";
		suffix: string;
	},
) {
	const assigned = await assignTimeApprovalAuthority(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-authority-${input.suffix}`,
			targetActorUserId: input.targetActorUserId,
			authority: input.authority,
			effectiveFrom: "2020-01-01",
		},
		ready,
	);
	expect(assigned.ok).toBe(true);
	if (!assigned.ok) throw new Error("approval authority seed failed");
	return assigned.data;
}

async function seedEmployeeEmployment(
	ready: ReturnType<typeof harness>,
	input: {
		organizationId: string;
		actorUserId: string;
		suffix: string;
	},
) {
	const employee = await createEmployee(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-emp-${input.suffix}`,
			idempotencyKey: `idem-emp-${input.suffix}`,
			employeeNumber: `E-${input.suffix}`,
			legalName: `Worker ${input.suffix}`,
		},
		ready,
	);
	expect(employee.ok).toBe(true);
	if (!employee.ok) throw new Error("employee seed failed");
	const employment = await createEmployment(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-employ-${input.suffix}`,
			employeeId: employee.data.id,
			startsOn: "2025-01-01",
		},
		ready,
	);
	expect(employment.ok).toBe(true);
	if (!employment.ok) throw new Error("employment seed failed");
	return { employee: employee.data, employment: employment.data };
}

async function seedPublishedDayShift(
	ready: ReturnType<typeof harness>,
	input: {
		suffix: string;
		employeeId: string;
		employmentId: string;
		scheduledDate: string;
		startsAt: string;
		endsAt: string;
		graceEarlyMinutes?: number;
		graceLateMinutes?: number;
		isOvernight?: boolean;
		startLocal?: string;
		endLocal?: string;
		shiftAssignmentIdOnEvents?: boolean;
	},
) {
	const shift = await createShift(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-p06-shift-${input.suffix}`,
			idempotencyKey: `idem-p06-shift-${input.suffix}`,
			code: `DAY-${input.suffix}`,
			name: `Day ${input.suffix}`,
			shiftKind: "fixed",
			startLocal: input.startLocal ?? "09:00",
			endLocal: input.endLocal ?? "17:00",
			expectedMinutes: 480,
			graceEarlyMinutes: input.graceEarlyMinutes ?? 0,
			graceLateMinutes: input.graceLateMinutes ?? 0,
			effectiveFrom: "2025-01-01",
		},
		ready,
	);
	expect(shift.ok).toBe(true);
	if (!shift.ok) throw new Error("shift seed failed");
	const activated = await activateShift(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-p06-shift-act-${input.suffix}`,
			shiftId: shift.data.id,
			expectedVersion: shift.data.version,
		},
		ready,
	);
	expect(activated.ok).toBe(true);
	if (!activated.ok) throw new Error("shift activate failed");
	const assignment = await assignShift(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-p06-assign-${input.suffix}`,
			idempotencyKey: `idem-p06-assign-${input.suffix}`,
			employeeId: input.employeeId,
			employmentId: input.employmentId,
			shiftId: shift.data.id,
			scheduledDate: input.scheduledDate,
			startsAt: input.startsAt,
			endsAt: input.endsAt,
			timezone: "Asia/Singapore",
		},
		ready,
	);
	expect(assignment.ok).toBe(true);
	if (!assignment.ok) throw new Error("assign failed");
	const published = await publishShiftAssignment(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-p06-pub-${input.suffix}`,
			assignmentId: assignment.data.id,
			expectedVersion: assignment.data.version,
		},
		ready,
	);
	expect(published.ok).toBe(true);
	if (!published.ok) throw new Error("publish failed");
	return { shift: shift.data, assignment: published.data };
}

function autoDetectedTypes(
	exceptions: readonly {
		exceptionType: AttendanceExceptionType;
		remarks: string | null;
	}[],
	source:
		| typeof ATTENDANCE_SESSION_DETECTION_SOURCE
		| typeof SCHEDULE_PUBLISH_DETECTION_SOURCE,
): AttendanceExceptionType[] {
	return exceptions
		.filter((exception) => {
			const remarks = parseExceptionDetectionRemarks(exception.remarks);
			return remarks?.detectionSource === source;
		})
		.map((exception) => exception.exceptionType);
}

describe("human-resources.time (memory)", () => {
	it("creates and resolves an employment calendar", async () => {
		const ready = harness();
		const { employee, employment } = await seedEmployeeEmployment(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: "cal-1",
		});

		const calendar = await createWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-cal-1",
				idempotencyKey: "idem-cal-1",
				code: "STD",
				name: "Standard",
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

		const assigned = await assignEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-cal-assign-1",
				employeeId: employee.id,
				employmentId: employment.id,
				calendarId: calendar.data.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(assigned.ok).toBe(true);
		if (!assigned.ok) return;

		const resolved = await resolveEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-cal-resolve-1",
				employeeId: employee.id,
				employmentId: employment.id,
				asOf: "2025-06-01",
			},
			ready,
		);
		expect(resolved.ok).toBe(true);
		if (!resolved.ok) return;
		expect(resolved.data?.calendarId).toBe(calendar.data.id);
	});

	it("detects overnight shifts and publishes schedule", async () => {
		const ready = harness();
		const { employee, employment } = await seedEmployeeEmployment(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: "shift-1",
		});

		const shift = await createShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-shift-1",
				idempotencyKey: "idem-shift-1",
				code: "NIGHT",
				name: "Night",
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

		const activated = await activateShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-shift-act-1",
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
				correlationId: "corr-assign-1",
				idempotencyKey: "idem-assign-1",
				employeeId: employee.id,
				employmentId: employment.id,
				shiftId: shift.data.id,
				scheduledDate: "2025-07-01",
				startsAt: "2025-07-01T14:00:00.000Z",
				endsAt: "2025-07-01T22:00:00.000Z",
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
				correlationId: "corr-publish-1",
				assignmentId: assignment.data.id,
				expectedVersion: assignment.data.version,
			},
			ready,
		);
		expect(published.ok).toBe(true);
		if (!published.ok) return;
		expect(published.data.publicationStatus).toBe("published");
	});

	it("clocks in/out, resolves session, and reviews exception", async () => {
		const ready = harness();
		const { employee, employment } = await seedEmployeeEmployment(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: "att-1",
		});

		const clockIn = await recordClockIn(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-cin-1",
				idempotencyKey: "idem-cin-1",
				employeeId: employee.id,
				employmentId: employment.id,
				occurredAt: "2025-07-01T01:00:00.000Z",
				sourceTimezone: "Asia/Singapore",
				localWorkDate: "2025-07-01",
			},
			ready,
		);
		expect(clockIn.ok).toBe(true);
		if (!clockIn.ok) return;

		const clockOut = await recordAttendanceEvent(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-cout-1",
				idempotencyKey: "idem-cout-1",
				employeeId: employee.id,
				employmentId: employment.id,
				eventType: "clock_out",
				occurredAt: "2025-07-01T09:00:00.000Z",
				sourceTimezone: "Asia/Singapore",
				localWorkDate: "2025-07-01",
			},
			ready,
		);
		expect(clockOut.ok).toBe(true);
		if (!clockOut.ok) return;

		const session = await resolveAttendanceSession(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-sess-1",
				idempotencyKey: "idem-sess-1",
				employeeId: employee.id,
				localWorkDate: "2025-07-01",
				timezone: "Asia/Singapore",
			},
			ready,
		);
		expect(session.ok).toBe(true);
		if (!session.ok) return;
		expect(session.data.workedMinutes).toBe(480);
		expect(session.data.resolutionStatus).toBe("resolved");

		const exception = await createAttendanceException(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-exc-create-1",
				employeeId: employee.id,
				sessionId: session.data.id,
				exceptionType: "late_arrival",
				severity: "warning",
				remarks: "late",
			},
			ready,
		);
		expect(exception.ok).toBe(true);
		if (!exception.ok) return;

		const reviewed = await reviewAttendanceException(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "corr-exc-rev-1",
				exceptionId: exception.data.id,
				expectedVersion: exception.data.version,
			},
			ready,
		);
		expect(reviewed.ok).toBe(true);
		if (!reviewed.ok) return;
		expect(reviewed.data.reviewStatus).toBe("in_review");

		const excused = await excuseAttendanceException(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "corr-exc-excuse-1",
				exceptionId: reviewed.data.id,
				resolution: "traffic",
				expectedVersion: reviewed.data.version,
			},
			ready,
		);
		expect(excused.ok).toBe(true);
		if (!excused.ok) return;
		expect(excused.data.reviewStatus).toBe("excused");
	});

	it("approves timesheet with distinct overtime handoff and bans self-approve", async () => {
		const ready = harness();
		const { employee, employment } = await seedEmployeeEmployment(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: "ts-1",
		});

		const timesheet = await createTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-ts-1",
				idempotencyKey: "idem-ts-1",
				employeeId: employee.id,
				employmentId: employment.id,
				periodStart: "2025-07-01",
				periodEnd: "2025-07-07",
			},
			ready,
		);
		expect(timesheet.ok).toBe(true);
		if (!timesheet.ok) return;

		const regular = await addTimesheetEntry(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-entry-reg",
				timesheetId: timesheet.data.id,
				employeeId: employee.id,
				workDate: "2025-07-01",
				timezone: "Asia/Singapore",
				sourceType: "manual",
				timeType: "regular",
				recordedMinutes: 480,
				approvedMinutes: 480,
			},
			ready,
		);
		expect(regular.ok).toBe(true);

		const otWeekday = await addTimesheetEntry(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-entry-ot1",
				timesheetId: timesheet.data.id,
				employeeId: employee.id,
				workDate: "2025-07-01",
				timezone: "Asia/Singapore",
				sourceType: "manual",
				sourceReference: "weekday_overtime",
				timeType: "overtime",
				recordedMinutes: 60,
				approvedMinutes: 60,
			},
			ready,
		);
		expect(otWeekday.ok).toBe(true);

		const otRest = await addTimesheetEntry(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-entry-ot2",
				timesheetId: timesheet.data.id,
				employeeId: employee.id,
				workDate: "2025-07-06",
				timezone: "Asia/Singapore",
				sourceType: "manual",
				sourceReference: "rest_day_overtime",
				timeType: "overtime",
				recordedMinutes: 120,
				approvedMinutes: 120,
			},
			ready,
		);
		expect(otRest.ok).toBe(true);

		const current = await getTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-ts-get",
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
				correlationId: "corr-ts-submit",
				timesheetId: current.data.id,
				expectedVersion: current.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) return;
		await grantTimeApprovalAuthority(ready, {
			organizationId: ORG,
			targetActorUserId: ACTOR,
			authority: "line_manager",
			suffix: "timesheet-self",
		});
		await grantTimeApprovalAuthority(ready, {
			organizationId: ORG,
			targetActorUserId: MANAGER,
			authority: "line_manager",
			suffix: "timesheet-manager",
		});

		const selfApprove = await approveTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-ts-self",
				authority: "line_manager",
				timesheetId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(selfApprove.ok).toBe(false);
		if (selfApprove.ok) return;
		expect(humanResourcesCodeFromResult(selfApprove)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);

		const approved = await approveTimesheet(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "corr-ts-approve",
				authority: "line_manager",
				timesheetId: submitted.data.id,
				expectedVersion: submitted.data.version,
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
				correlationId: "corr-handoff-1",
				timesheetId: approved.data.id,
			},
			ready,
		);
		expect(handoff.ok).toBe(true);
		if (!handoff.ok || handoff.data === null) return;
		expect(handoff.data.regularMinutes).toBe(480);
		expect(handoff.data.overtime).toEqual(
			expect.arrayContaining([
				{ type: "weekday_overtime", minutes: 60 },
				{ type: "rest_day_overtime", minutes: 120 },
			]),
		);
		expect(handoff.data.overtime).toHaveLength(2);
	});

	it("enforces cross-org isolation and create idempotency", async () => {
		const ready = harness();
		const seededA = await seedEmployeeEmployment(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: "iso-a",
		});
		const seededB = await seedEmployeeEmployment(ready, {
			organizationId: ORG_B,
			actorUserId: ACTOR,
			suffix: "iso-b",
		});

		const calendarA = await createWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-cal-iso-a",
				idempotencyKey: "idem-cal-iso",
				code: "ISO-A",
				name: "Iso A",
				timezone: "UTC",
				calendarVersion: "v1",
				workWeek: STANDARD_WEEK,
				standardHoursPerDay: "8",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(calendarA.ok).toBe(true);
		if (!calendarA.ok) return;

		const replay = await createWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-cal-iso-a2",
				idempotencyKey: "idem-cal-iso",
				code: "ISO-A",
				name: "Iso A",
				timezone: "UTC",
				calendarVersion: "v1",
				workWeek: STANDARD_WEEK,
				standardHoursPerDay: "8",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(replay.ok).toBe(true);
		if (!replay.ok) return;
		expect(replay.data.id).toBe(calendarA.data.id);

		const conflict = await createWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-cal-iso-conflict",
				idempotencyKey: "idem-cal-iso",
				code: "ISO-A2",
				name: "Different",
				timezone: "UTC",
				calendarVersion: "v2",
				workWeek: STANDARD_WEEK,
				standardHoursPerDay: "8",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(conflict.ok).toBe(false);
		if (conflict.ok) return;
		expect(humanResourcesCodeFromResult(conflict)).toBe(
			HUMAN_RESOURCES_ERROR_CONFLICT,
		);

		const fetchedCrossOrg = await ready.store.getWorkCalendar({
			organizationId: ORG_B,
			calendarId: calendarA.data.id,
		});
		expect(fetchedCrossOrg.ok).toBe(true);
		if (!fetchedCrossOrg.ok) return;
		expect(fetchedCrossOrg.data).toBeNull();

		void seededA;
		void seededB;
	});

	it("rejects non-IANA timezones at every Time command boundary", async () => {
		const result = await createWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-cal-invalid-timezone",
				idempotencyKey: "idem-cal-invalid-timezone",
				code: "INVALID-TZ",
				name: "Invalid timezone",
				timezone: "Mars/Olympus_Mons",
				calendarVersion: "v1",
				workWeek: STANDARD_WEEK,
				standardHoursPerDay: "8",
				effectiveFrom: "2025-01-01",
			},
			harness(),
		);

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(humanResourcesCodeFromResult(result)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);
	});

	it("links Time facts to the employee's active employment", async () => {
		const ready = harness();
		const first = await seedEmployeeEmployment(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: "time-employment-first",
		});
		const second = await seedEmployeeEmployment(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: "time-employment-second",
		});

		const mismatched = await recordClockIn(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-time-employment-mismatch",
				idempotencyKey: "idem-time-employment-mismatch",
				employeeId: first.employee.id,
				employmentId: second.employment.id,
				occurredAt: "2025-07-21T01:00:00.000Z",
				sourceTimezone: "Asia/Singapore",
				localWorkDate: "2025-07-21",
			},
			ready,
		);
		expect(mismatched.ok).toBe(false);
		if (mismatched.ok) return;
		expect(humanResourcesCodeFromResult(mismatched)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);

		const resolved = await recordClockIn(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-time-employment-resolved",
				idempotencyKey: "idem-time-employment-resolved",
				employeeId: first.employee.id,
				occurredAt: "2025-07-21T01:00:00.000Z",
				sourceTimezone: "Asia/Singapore",
				localWorkDate: "2025-07-21",
			},
			ready,
		);
		expect(resolved.ok).toBe(true);
		if (!resolved.ok) return;
		expect(resolved.data.employmentId).toBe(first.employment.id);
	});

	it("creates, activates, assigns, and resolves an effective Time policy", async () => {
		const ready = harness();
		const { employee, employment } = await seedEmployeeEmployment(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: "time-policy",
		});
		const created = await createTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-time-policy-create",
				idempotencyKey: "idem-time-policy-create",
				code: "STANDARD-MY",
				name: "Standard Malaysia Time",
				effectiveFrom: "2025-01-01",
				minimumRestMinutes: 660,
				automaticBreakAfterMinutes: 360,
				automaticBreakMinutes: 60,
				approvalSteps: ["line_manager", "payroll"],
			},
			ready,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;
		expect(created.data.status).toBe("draft");

		const activated = await activateTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-time-policy-activate",
				policyId: created.data.id,
				expectedVersion: created.data.version,
			},
			ready,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) return;
		expect(activated.data.status).toBe("active");

		const assignment = await assignTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-time-policy-assign",
				policyId: activated.data.id,
				employmentId: employment.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(assignment.ok).toBe(true);

		const resolved = await resolveTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-time-policy-resolve",
				employmentId: employment.id,
				asOf: "2025-07-01",
			},
			ready,
		);
		expect(resolved.ok).toBe(true);
		if (!resolved.ok || resolved.data === null) return;
		expect(resolved.data).toMatchObject({
			minimumRestMinutes: 660,
			automaticBreakAfterMinutes: 360,
			automaticBreakMinutes: 60,
			approvalSteps: ["line_manager", "payroll"],
		});

		const policyTimesheet = await createTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-time-policy-timesheet-create",
				idempotencyKey: "idem-time-policy-timesheet-create",
				employeeId: employee.id,
				employmentId: employment.id,
				periodStart: "2025-07-01",
				periodEnd: "2025-07-31",
			},
			ready,
		);
		expect(policyTimesheet.ok).toBe(true);
		if (!policyTimesheet.ok) return;
		const submittedTimesheet = await submitTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-time-policy-timesheet-submit",
				timesheetId: policyTimesheet.data.id,
				expectedVersion: policyTimesheet.data.version,
			},
			ready,
		);
		expect(submittedTimesheet.ok).toBe(true);
		if (!submittedTimesheet.ok) return;
		expect(submittedTimesheet.data).toMatchObject({
			approvalPolicyId: activated.data.id,
			requiredApprovalSteps: ["line_manager", "payroll"],
			completedApprovalSteps: 0,
		});
		await grantTimeApprovalAuthority(ready, {
			organizationId: ORG,
			targetActorUserId: MANAGER,
			authority: "line_manager",
			suffix: "policy-manager",
		});
		await grantTimeApprovalAuthority(ready, {
			organizationId: ORG,
			targetActorUserId: "user-hr-time-payroll",
			authority: "payroll",
			suffix: "policy-payroll",
		});

		const wrongAuthority = await approveTimesheet(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "corr-time-policy-timesheet-wrong-authority",
				timesheetId: submittedTimesheet.data.id,
				authority: "payroll",
				expectedVersion: submittedTimesheet.data.version,
			},
			ready,
		);
		expect(wrongAuthority.ok).toBe(false);

		const managerApproval = await approveTimesheet(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "corr-time-policy-timesheet-manager",
				timesheetId: submittedTimesheet.data.id,
				authority: "line_manager",
				expectedVersion: submittedTimesheet.data.version,
			},
			ready,
		);
		expect(managerApproval.ok).toBe(true);
		if (!managerApproval.ok) return;
		expect(managerApproval.data).toMatchObject({
			status: "submitted",
			completedApprovalSteps: 1,
		});

		const payrollApproval = await approveTimesheet(
			{
				organizationId: ORG,
				actorUserId: "user-hr-time-payroll",
				correlationId: "corr-time-policy-timesheet-payroll",
				timesheetId: managerApproval.data.id,
				authority: "payroll",
				expectedVersion: managerApproval.data.version,
			},
			ready,
		);
		expect(payrollApproval.ok).toBe(true);
		if (!payrollApproval.ok) return;
		expect(payrollApproval.data).toMatchObject({
			status: "approved",
			completedApprovalSteps: 2,
		});
		expect(payrollApproval.data.submissionReference).not.toBeNull();
		if (payrollApproval.data.submissionReference === null) return;

		const decisions = await listTimesheetApprovalDecisions(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-time-policy-timesheet-decisions",
				timesheetId: payrollApproval.data.id,
				submissionReference: payrollApproval.data.submissionReference,
			},
			ready,
		);
		expect(decisions.ok).toBe(true);
		if (!decisions.ok) return;
		expect(
			decisions.data.map(({ stepIndex, authority }) => ({
				stepIndex,
				authority,
			})),
		).toEqual([
			{ stepIndex: 0, authority: "line_manager" },
			{ stepIndex: 1, authority: "payroll" },
		]);

		for (const [workDate, suffix] of [
			["2025-07-01", "deducted"],
			["2025-07-02", "repeated"],
		] as const) {
			await recordClockIn(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-time-policy-${suffix}-in`,
					idempotencyKey: `idem-time-policy-${suffix}-in`,
					employeeId: employee.id,
					employmentId: employment.id,
					occurredAt: `${workDate}T01:00:00.000Z`,
					sourceTimezone: "UTC",
					localWorkDate: workDate,
				},
				ready,
			);
			await recordClockOut(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-time-policy-${suffix}-out`,
					idempotencyKey: `idem-time-policy-${suffix}-out`,
					employeeId: employee.id,
					employmentId: employment.id,
					occurredAt: `${workDate}T09:00:00.000Z`,
					sourceTimezone: "UTC",
					localWorkDate: workDate,
				},
				ready,
			);
			const session = await resolveAttendanceSession(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-time-policy-${suffix}-session`,
					idempotencyKey: `idem-time-policy-${suffix}-session`,
					employeeId: employee.id,
					localWorkDate: workDate,
					timezone: "UTC",
				},
				ready,
			);
			expect(session.ok).toBe(true);
			if (!session.ok) return;
			expect(session.data.grossMinutes).toBe(480);
			expect(session.data.breakMinutes).toBe(60);
			expect(session.data.workedMinutes).toBe(420);
			expect(session.data.provenance.automaticBreak).toMatchObject({
				policyId: activated.data.id,
				minutes: 60,
				applied: true,
			});
			if (suffix === "deducted") {
				const waiver = await approveAttendanceBreakWaiver(
					{
						organizationId: ORG,
						actorUserId: MANAGER,
						correlationId: "corr-time-policy-break-waiver",
						sessionId: session.data.id,
						authority: "line_manager",
						reason: "Approved operational break waiver",
						evidenceReference: "evidence://break-waiver/2025-07-01",
						expectedVersion: session.data.version,
					},
					ready,
				);
				expect(waiver.ok).toBe(true);
				if (!waiver.ok) return;
				expect(waiver.data).toMatchObject({
					policyId: activated.data.id,
					authority: "line_manager",
					automaticBreakMinutes: 60,
					recordedBreakMinutes: 0,
					sessionVersion: session.data.version,
				});
				const duplicate = await approveAttendanceBreakWaiver(
					{
						organizationId: ORG,
						actorUserId: MANAGER,
						correlationId: "corr-time-policy-break-waiver-duplicate",
						sessionId: session.data.id,
						authority: "line_manager",
						reason: "Duplicate",
						evidenceReference: "evidence://break-waiver/duplicate",
						expectedVersion: session.data.version,
					},
					ready,
				);
				expect(duplicate.ok).toBe(false);
				if (!duplicate.ok) {
					expect(humanResourcesCodeFromResult(duplicate)).toBe(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					);
				}
				const decisions = await listAttendanceBreakWaiverDecisions(
					{
						organizationId: ORG,
						actorUserId: ACTOR,
						correlationId: "corr-time-policy-break-waiver-list",
						sessionId: session.data.id,
					},
					ready,
				);
				expect(decisions.ok).toBe(true);
				if (!decisions.ok) return;
				expect(decisions.data).toHaveLength(1);
				expect(decisions.data[0]?.evidenceReference).toBe(
					"evidence://break-waiver/2025-07-01",
				);
			}
		}

		const supersession = await supersedeTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-time-policy-supersede",
				idempotencyKey: "idem-time-policy-supersede",
				policyId: activated.data.id,
				expectedVersion: activated.data.version,
				name: "Standard Malaysia Time v2",
				effectiveFrom: "2025-08-01",
				minimumRestMinutes: 720,
				automaticBreakAfterMinutes: 300,
				automaticBreakMinutes: 45,
				approvalSteps: ["line_manager", "hr", "payroll"],
			},
			ready,
		);
		expect(supersession.ok).toBe(true);
		if (!supersession.ok) return;
		expect(supersession.data.superseded).toMatchObject({
			id: activated.data.id,
			status: "superseded",
			effectiveTo: "2025-07-31",
		});
		expect(supersession.data.successor).toMatchObject({
			code: activated.data.code,
			status: "active",
			effectiveFrom: "2025-08-01",
			supersedesPolicyId: activated.data.id,
		});

		const historical = await resolveTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-time-policy-historical",
				employmentId: employment.id,
				asOf: "2025-07-31",
			},
			ready,
		);
		expect(historical.ok).toBe(true);
		if (!historical.ok || historical.data === null) return;
		expect(historical.data.id).toBe(activated.data.id);

		const future = await resolveTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-time-policy-future",
				employmentId: employment.id,
				asOf: "2025-08-01",
			},
			ready,
		);
		expect(future.ok).toBe(true);
		if (!future.ok || future.data === null) return;
		expect(future.data.id).toBe(supersession.data.successor.id);
	});

	it("rejects overlapping and expired approval authority assignments", async () => {
		const ready = harness();
		const { employee } = await seedEmployeeEmployment(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: "authority-expiry",
		});
		const authority = await grantTimeApprovalAuthority(ready, {
			organizationId: ORG,
			targetActorUserId: MANAGER,
			authority: "line_manager",
			suffix: "authority-expiry",
		});
		const overlap = await assignTimeApprovalAuthority(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-authority-overlap",
				targetActorUserId: MANAGER,
				authority: "line_manager",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(overlap.ok).toBe(false);
		if (!overlap.ok) {
			expect(humanResourcesCodeFromResult(overlap)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}
		const ended = await endTimeApprovalAuthorityAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-authority-end",
				assignmentId: authority.id,
				effectiveTo: "2025-12-31",
				expectedVersion: authority.version,
			},
			ready,
		);
		expect(ended.ok).toBe(true);
		if (!ended.ok) return;

		const timesheet = await createTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-authority-timesheet-create",
				idempotencyKey: "idem-authority-timesheet-create",
				employeeId: employee.id,
				periodStart: "2026-01-01",
				periodEnd: "2026-01-31",
			},
			ready,
		);
		expect(timesheet.ok).toBe(true);
		if (!timesheet.ok) return;
		const submitted = await submitTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-authority-timesheet-submit",
				timesheetId: timesheet.data.id,
				expectedVersion: timesheet.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) return;
		const denied = await approveTimesheet(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "corr-authority-timesheet-denied",
				timesheetId: submitted.data.id,
				authority: "line_manager",
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(denied.ok).toBe(false);
		if (!denied.ok) {
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			);
		}
	});

	it("supersedes effective-dated calendars and shifts without rewriting history", async () => {
		const ready = harness();
		const { employee, employment } = await seedEmployeeEmployment(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: "definition-successors",
		});
		const calendar = await createWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-calendar-successor-create",
				idempotencyKey: "idem-calendar-successor-create",
				code: "CAL-SUCCESSOR",
				name: "Calendar v1",
				timezone: "Asia/Kuala_Lumpur",
				calendarVersion: "v1",
				workWeek: STANDARD_WEEK,
				standardHoursPerDay: "8.00",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(calendar.ok).toBe(true);
		if (!calendar.ok) return;
		const holiday = await addCalendarDateOverride(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-calendar-successor-holiday",
				calendarId: calendar.data.id,
				holidayDate: "2025-12-24",
				overrideKind: "shortened_day",
				isWorkingDay: true,
				expectedMinutes: 240,
				label: "Christmas Eve",
			},
			ready,
		);
		expect(holiday.ok).toBe(true);
		const assignment = await assignEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-calendar-successor-assign",
				employeeId: employee.id,
				employmentId: employment.id,
				calendarId: calendar.data.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		const calendarSuccessor = await supersedeWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-calendar-successor",
				idempotencyKey: "idem-calendar-successor",
				calendarId: calendar.data.id,
				expectedVersion: calendar.data.version,
				name: "Calendar v2",
				calendarVersion: "v2",
				effectiveFrom: "2025-08-01",
				standardHoursPerDay: "7.50",
			},
			ready,
		);
		expect(calendarSuccessor.ok).toBe(true);
		if (!calendarSuccessor.ok) return;
		expect(calendarSuccessor.data.superseded).toMatchObject({
			id: calendar.data.id,
			status: "superseded",
			effectiveTo: "2025-07-31",
		});
		expect(calendarSuccessor.data.successor).toMatchObject({
			status: "active",
			effectiveFrom: "2025-08-01",
			supersedesCalendarId: calendar.data.id,
		});
		const historicalCalendar = await resolveEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-calendar-successor-historical",
				employeeId: employee.id,
				employmentId: employment.id,
				asOf: "2025-07-31",
			},
			ready,
		);
		expect(historicalCalendar.ok).toBe(true);
		if (!historicalCalendar.ok || historicalCalendar.data === null) return;
		expect(historicalCalendar.data.calendarId).toBe(calendar.data.id);
		const futureCalendar = await resolveEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-calendar-successor-future",
				employeeId: employee.id,
				employmentId: employment.id,
				asOf: "2025-08-01",
			},
			ready,
		);
		expect(futureCalendar.ok).toBe(true);
		if (!futureCalendar.ok || futureCalendar.data === null) return;
		expect(futureCalendar.data.calendarId).toBe(
			calendarSuccessor.data.successor.id,
		);
		const successorHolidays = await listWorkCalendarHolidays(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-calendar-successor-holidays",
				calendarId: calendarSuccessor.data.successor.id,
			},
			ready,
		);
		expect(successorHolidays.ok).toBe(true);
		if (!successorHolidays.ok) return;
		expect(successorHolidays.data).toHaveLength(1);
		expect(successorHolidays.data[0]?.holidayDate).toBe("2025-12-24");

		const shift = await createShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-shift-successor-create",
				idempotencyKey: "idem-shift-successor-create",
				code: "SHIFT-SUCCESSOR",
				name: "Day Shift v1",
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
				correlationId: "corr-shift-successor-break",
				shiftId: shift.data.id,
				durationMinutes: 60,
				startOffsetMinutes: 240,
				label: "Meal",
			},
			ready,
		);
		expect(shiftBreak.ok).toBe(true);
		const activated = await activateShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-shift-successor-activate",
				shiftId: shift.data.id,
				expectedVersion: shift.data.version,
			},
			ready,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) return;
		const activeUpdate = await updateShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-shift-successor-active-update",
				shiftId: activated.data.id,
				expectedVersion: activated.data.version,
				expectedMinutes: 450,
			},
			ready,
		);
		expect(activeUpdate.ok).toBe(false);
		const shiftSuccessor = await supersedeShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-shift-successor",
				idempotencyKey: "idem-shift-successor",
				shiftId: activated.data.id,
				expectedVersion: activated.data.version,
				name: "Day Shift v2",
				effectiveFrom: "2025-08-01",
				endLocal: "16:30",
				expectedMinutes: 450,
			},
			ready,
		);
		expect(shiftSuccessor.ok).toBe(true);
		if (!shiftSuccessor.ok) return;
		expect(shiftSuccessor.data.superseded).toMatchObject({
			id: activated.data.id,
			status: "superseded",
			effectiveTo: "2025-07-31",
		});
		expect(shiftSuccessor.data.successor).toMatchObject({
			status: "active",
			supersedesShiftId: activated.data.id,
			effectiveFrom: "2025-08-01",
		});
		const successorBreaks = await listShiftBreaks(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-shift-successor-breaks",
				shiftId: shiftSuccessor.data.successor.id,
			},
			ready,
		);
		expect(successorBreaks.ok).toBe(true);
		if (!successorBreaks.ok) return;
		expect(successorBreaks.data).toHaveLength(1);
		expect(successorBreaks.data[0]?.durationMinutes).toBe(60);
	});

	it("rolls back definition successors when audit persistence fails", async () => {
		const ready = harness();
		const calendar = await createWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-calendar-successor-rollback-create",
				idempotencyKey: "idem-calendar-successor-rollback-create",
				code: "CAL-ROLLBACK",
				name: "Calendar rollback v1",
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
		const calendarFailure = await supersedeWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-calendar-successor-rollback",
				idempotencyKey: "idem-calendar-successor-rollback",
				calendarId: calendar.data.id,
				expectedVersion: calendar.data.version,
				calendarVersion: "v2",
				effectiveFrom: "2025-08-01",
			},
			{
				...ready,
				ports: createMemoryMutationPorts({ auditFailAfter: 0 }),
			},
		);
		expect(calendarFailure.ok).toBe(false);
		const restoredCalendar = await getWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-calendar-successor-rollback-get",
				calendarId: calendar.data.id,
			},
			ready,
		);
		expect(restoredCalendar.ok).toBe(true);
		if (!restoredCalendar.ok || restoredCalendar.data === null) return;
		expect(restoredCalendar.data).toMatchObject({
			status: "active",
			effectiveTo: null,
			version: calendar.data.version,
		});

		const shift = await createShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-shift-successor-rollback-create",
				idempotencyKey: "idem-shift-successor-rollback-create",
				code: "SHIFT-ROLLBACK",
				name: "Shift rollback v1",
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
		const activeShift = await activateShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-shift-successor-rollback-activate",
				shiftId: shift.data.id,
				expectedVersion: shift.data.version,
			},
			ready,
		);
		expect(activeShift.ok).toBe(true);
		if (!activeShift.ok) return;
		const shiftFailure = await supersedeShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-shift-successor-rollback",
				idempotencyKey: "idem-shift-successor-rollback",
				shiftId: activeShift.data.id,
				expectedVersion: activeShift.data.version,
				effectiveFrom: "2025-08-01",
				expectedMinutes: 450,
			},
			{
				...ready,
				ports: createMemoryMutationPorts({ auditFailAfter: 0 }),
			},
		);
		expect(shiftFailure.ok).toBe(false);
		const restoredShift = await getShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-shift-successor-rollback-get",
				shiftId: activeShift.data.id,
			},
			ready,
		);
		expect(restoredShift.ok).toBe(true);
		if (!restoredShift.ok || restoredShift.data === null) return;
		expect(restoredShift.data).toMatchObject({
			status: "active",
			effectiveTo: null,
			version: activeShift.data.version,
		});
	});

	describe("calendar date overrides", () => {
		async function seedCalendarWithAssignment(suffix: string) {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix,
			});
			const calendar = await createWorkCalendar(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-ov-cal-${suffix}`,
					idempotencyKey: `idem-ov-cal-${suffix}`,
					code: `OV-${suffix}`,
					name: "Override Calendar",
					timezone: "UTC",
					calendarVersion: "v1",
					workWeek: STANDARD_WEEK,
					standardHoursPerDay: "8.00",
					effectiveFrom: "2025-01-01",
				},
				ready,
			);
			expect(calendar.ok).toBe(true);
			if (!calendar.ok) throw new Error("calendar seed failed");
			const assigned = await assignEmploymentCalendar(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-ov-assign-${suffix}`,
					employeeId: employee.id,
					employmentId: employment.id,
					calendarId: calendar.data.id,
					effectiveFrom: "2025-01-01",
				},
				ready,
			);
			expect(assigned.ok).toBe(true);
			if (!assigned.ok) throw new Error("assignment seed failed");
			return { ready, employee, employment, calendar: calendar.data };
		}

		async function resolveDay(
			ready: ReturnType<typeof harness>,
			employeeId: string,
			employmentId: string,
			date: string,
		) {
			const lookup = createStoreWorkCalendarLookup({ store: ready.store });
			const context = await lookup.resolveCalendarContext({
				organizationId: ORG,
				employeeId,
				employmentId,
				fromDate: date,
				toDate: date,
			});
			expect(context.ok).toBe(true);
			if (!context.ok) throw new Error("context resolve failed");
			return resolveWorkCalendarCivilDay(context.data, date);
		}

		it("resolves a normal working day from the week pattern", async () => {
			const { ready, employee, employment } =
				await seedCalendarWithAssignment("normal");
			// 2025-01-07 is Tuesday
			const day = await resolveDay(
				ready,
				employee.id,
				employment.id,
				"2025-01-07",
			);
			expect(day.isWorkingDay).toBe(true);
			expect(day.expectedMinutes).toBe(480);
			expect(day.overrideKind).toBeNull();
		});

		it("treats holiday override as non-working", async () => {
			const { ready, employee, employment, calendar } =
				await seedCalendarWithAssignment("holiday");
			const override = await addCalendarDateOverride(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-ov-holiday",
					calendarId: calendar.id,
					holidayDate: "2025-01-07",
					overrideKind: "holiday",
					label: "Public Holiday",
				},
				ready,
			);
			expect(override.ok).toBe(true);
			if (!override.ok) return;
			expect(override.data.overrideKind).toBe("holiday");
			expect(override.data.isWorkingDay).toBe(false);

			const day = await resolveDay(
				ready,
				employee.id,
				employment.id,
				"2025-01-07",
			);
			expect(day.isWorkingDay).toBe(false);
			expect(day.overrideKind).toBe("holiday");

			const listed = await listWorkCalendarHolidays(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-ov-list",
					calendarId: calendar.id,
					fromDate: "2025-01-07",
					toDate: "2025-01-07",
				},
				ready,
			);
			expect(listed.ok).toBe(true);
			if (!listed.ok) return;
			expect(listed.data).toHaveLength(1);
			expect(listed.data[0]?.overrideKind).toBe("holiday");

			const removed = await removeCalendarDateOverride(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-ov-remove",
					holidayId: override.data.id,
				},
				ready,
			);
			expect(removed.ok).toBe(true);

			const after = await resolveDay(
				ready,
				employee.id,
				employment.id,
				"2025-01-07",
			);
			expect(after.isWorkingDay).toBe(true);
			expect(after.overrideKind).toBeNull();
		});

		it("applies half-day override expected minutes", async () => {
			const { ready, employee, employment, calendar } =
				await seedCalendarWithAssignment("half");
			const override = await addCalendarDateOverride(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-ov-half",
					calendarId: calendar.id,
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
			expect(override.data.expectedMinutes).toBe(240);

			const day = await resolveDay(
				ready,
				employee.id,
				employment.id,
				"2025-01-07",
			);
			expect(day.isWorkingDay).toBe(true);
			expect(day.expectedMinutes).toBe(240);
			expect(day.overrideKind).toBe("half_day");

			const production = createProductionWorkCalendar({
				lookup: createStoreWorkCalendarLookup({ store: ready.store }),
			});
			const working = await production.isWorkingDay({
				organizationId: ORG,
				employeeId: employee.id,
				employmentId: employment.id,
				date: "2025-01-07",
			});
			expect(working.ok).toBe(true);
			if (!working.ok) return;
			expect(working.data).toBe(true);
		});

		it("treats replacement workday as working on a rest day", async () => {
			const { ready, employee, employment, calendar } =
				await seedCalendarWithAssignment("repl");
			// 2025-01-11 is Saturday
			const before = await resolveDay(
				ready,
				employee.id,
				employment.id,
				"2025-01-11",
			);
			expect(before.isWorkingDay).toBe(false);

			const override = await addCalendarDateOverride(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-ov-repl",
					calendarId: calendar.id,
					holidayDate: "2025-01-11",
					overrideKind: "replacement_workday",
					isWorkingDay: true,
					label: "Replacement Saturday",
				},
				ready,
			);
			expect(override.ok).toBe(true);
			if (!override.ok) return;

			const day = await resolveDay(
				ready,
				employee.id,
				employment.id,
				"2025-01-11",
			);
			expect(day.isWorkingDay).toBe(true);
			expect(day.overrideKind).toBe("replacement_workday");
			expect(day.expectedMinutes).toBe(480);
		});

		it("applies shortened_day override expected minutes", async () => {
			const { ready, employee, employment, calendar } =
				await seedCalendarWithAssignment("short");
			const override = await addCalendarDateOverride(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-ov-short",
					calendarId: calendar.id,
					holidayDate: "2025-01-07",
					overrideKind: "shortened_day",
					isWorkingDay: true,
					expectedMinutes: 360,
					label: "Shortened day",
				},
				ready,
			);
			expect(override.ok).toBe(true);
			if (!override.ok) return;
			expect(override.data.overrideKind).toBe("shortened_day");
			expect(override.data.expectedMinutes).toBe(360);

			const day = await resolveDay(
				ready,
				employee.id,
				employment.id,
				"2025-01-07",
			);
			expect(day.isWorkingDay).toBe(true);
			expect(day.expectedMinutes).toBe(360);
			expect(day.overrideKind).toBe("shortened_day");
		});
	});

	describe("HR-TIME-P0-02 command/query surface", () => {
		it("ends an employment calendar assignment", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p02-end-cal",
			});
			const calendar = await createWorkCalendar(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p02-cal",
					idempotencyKey: "idem-p02-cal",
					code: "P02",
					name: "P02",
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
			const assigned = await assignEmploymentCalendar(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p02-assign",
					employeeId: employee.id,
					employmentId: employment.id,
					calendarId: calendar.data.id,
					effectiveFrom: "2025-01-01",
				},
				ready,
			);
			expect(assigned.ok).toBe(true);
			if (!assigned.ok) return;
			const ended = await endWorkCalendarAssignment(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p02-end",
					assignmentId: assigned.data.id,
					effectiveTo: "2025-06-30",
					expectedVersion: assigned.data.version,
				},
				ready,
			);
			expect(ended.ok).toBe(true);
			if (!ended.ok) return;
			expect(ended.data.effectiveTo).toBe("2025-06-30");
			const afterEnd = await resolveEmploymentCalendar(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p02-resolve-after",
					employeeId: employee.id,
					employmentId: employment.id,
					asOf: "2025-07-01",
				},
				ready,
			);
			expect(afterEnd.ok).toBe(true);
			if (!afterEnd.ok) return;
			expect(afterEnd.data).toBeNull();
		});

		it("records clock-out and break events via named wrappers", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p02-clock",
			});
			const clockOut = await recordClockOut(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p02-cout",
					idempotencyKey: "idem-p02-cout",
					employeeId: employee.id,
					employmentId: employment.id,
					occurredAt: "2025-07-01T09:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-01",
				},
				ready,
			);
			expect(clockOut.ok).toBe(true);
			if (!clockOut.ok) return;
			expect(clockOut.data.eventType).toBe("clock_out");

			const breakStart = await recordBreakStart(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p02-bs",
					idempotencyKey: "idem-p02-bs",
					employeeId: employee.id,
					employmentId: employment.id,
					occurredAt: "2025-07-01T04:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-01",
				},
				ready,
			);
			expect(breakStart.ok).toBe(true);
			if (!breakStart.ok) return;
			expect(breakStart.data.eventType).toBe("break_start");

			const breakEnd = await recordBreakEnd(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p02-be",
					idempotencyKey: "idem-p02-be",
					employeeId: employee.id,
					employmentId: employment.id,
					occurredAt: "2025-07-01T05:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-01",
				},
				ready,
			);
			expect(breakEnd.ok).toBe(true);
			if (!breakEnd.ok) return;
			expect(breakEnd.data.eventType).toBe("break_end");
		});

		it("records manual attendance with source=manual", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p02-manual",
			});
			const manual = await recordManualAttendance(
				{
					organizationId: ORG,
					actorUserId: MANAGER,
					correlationId: "corr-p02-manual",
					idempotencyKey: "idem-p02-manual",
					employeeId: employee.id,
					employmentId: employment.id,
					eventType: "clock_in",
					occurredAt: "2025-07-01T01:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-01",
				},
				ready,
			);
			expect(manual.ok).toBe(true);
			if (!manual.ok) return;
			expect(manual.data.source).toBe("manual");
			expect(manual.data.eventType).toBe("clock_in");
		});

		it("creates attendance exception via public command", async () => {
			const ready = harness();
			const { employee } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p02-exc",
			});
			const created = await createAttendanceException(
				{
					organizationId: ORG,
					actorUserId: MANAGER,
					correlationId: "corr-p02-exc",
					employeeId: employee.id,
					exceptionType: "absence",
					severity: "critical",
					remarks: "no show",
				},
				ready,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) return;
			expect(created.data.reviewStatus).toBe("open");
		});

		it("queries scheduled shift and location schedule", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p02-sched",
			});
			const shift = await createShift(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p02-shift",
					idempotencyKey: "idem-p02-shift",
					code: "DAY",
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
					correlationId: "corr-p02-shift-act",
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
					correlationId: "corr-p02-assign-shift",
					idempotencyKey: "idem-p02-assign-shift",
					employeeId: employee.id,
					employmentId: employment.id,
					shiftId: shift.data.id,
					scheduledDate: "2025-07-02",
					startsAt: "2025-07-02T01:00:00.000Z",
					endsAt: "2025-07-02T09:00:00.000Z",
					timezone: "Asia/Singapore",
					locationKey: "WH-A",
				},
				ready,
			);
			expect(assignment.ok).toBe(true);
			if (!assignment.ok) return;
			const published = await publishShiftAssignment(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p02-pub",
					assignmentId: assignment.data.id,
					expectedVersion: assignment.data.version,
				},
				ready,
			);
			expect(published.ok).toBe(true);
			if (!published.ok) return;

			const scheduled = await getScheduledShiftForEmployeeDate(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p02-sched-q",
					employeeId: employee.id,
					scheduledDate: "2025-07-02",
				},
				ready,
			);
			expect(scheduled.ok).toBe(true);
			if (!scheduled.ok) return;
			expect(scheduled.data?.id).toBe(published.data.id);
			expect(scheduled.data?.publicationStatus).toBe("published");

			const location = await listLocationSchedule(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p02-loc",
					locationKey: "WH-A",
					fromDate: "2025-07-01",
					toDate: "2025-07-03",
				},
				ready,
			);
			expect(location.ok).toBe(true);
			if (!location.ok) return;
			expect(location.data).toHaveLength(1);
			expect(location.data[0]?.locationKey).toBe("WH-A");
		});

		it("lists unresolved exceptions and daily attendance summary", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p02-sum",
			});
			const clockIn = await recordClockIn(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p02-sum-cin",
					idempotencyKey: "idem-p02-sum-cin",
					employeeId: employee.id,
					employmentId: employment.id,
					occurredAt: "2025-07-03T01:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-03",
				},
				ready,
			);
			expect(clockIn.ok).toBe(true);
			if (!clockIn.ok) return;
			const clockOut = await recordClockOut(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p02-sum-cout",
					idempotencyKey: "idem-p02-sum-cout",
					employeeId: employee.id,
					employmentId: employment.id,
					occurredAt: "2025-07-03T09:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-03",
				},
				ready,
			);
			expect(clockOut.ok).toBe(true);
			if (!clockOut.ok) return;
			const session = await resolveAttendanceSession(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p02-sum-sess",
					idempotencyKey: "idem-p02-sum-sess",
					employeeId: employee.id,
					localWorkDate: "2025-07-03",
					timezone: "Asia/Singapore",
				},
				ready,
			);
			expect(session.ok).toBe(true);
			if (!session.ok) return;

			const openExc = await createAttendanceException(
				{
					organizationId: ORG,
					actorUserId: MANAGER,
					correlationId: "corr-p02-sum-exc",
					employeeId: employee.id,
					sessionId: session.data.id,
					exceptionType: "late_arrival",
					severity: "warning",
				},
				ready,
			);
			expect(openExc.ok).toBe(true);
			if (!openExc.ok) return;

			const unresolved = await listUnresolvedAttendanceExceptions(
				{
					organizationId: ORG,
					actorUserId: MANAGER,
					correlationId: "corr-p02-unresolved",
					employeeId: employee.id,
				},
				ready,
			);
			expect(unresolved.ok).toBe(true);
			if (!unresolved.ok) return;
			expect(unresolved.data.some((row) => row.id === openExc.data.id)).toBe(
				true,
			);

			const summary = await getDailyAttendanceSummary(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p02-summary",
					employeeId: employee.id,
					localWorkDate: "2025-07-03",
					timezone: "Asia/Singapore",
				},
				ready,
			);
			expect(summary.ok).toBe(true);
			if (!summary.ok) return;
			expect(summary.data.session?.id).toBe(session.data.id);
			expect(summary.data.events.length).toBeGreaterThanOrEqual(2);
			expect(summary.data.workedMinutes).toBe(480);
		});

		it("gets timesheet for employee period and totals", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p02-ts",
			});
			const timesheet = await createTimesheet(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p02-ts",
					idempotencyKey: "idem-p02-ts",
					employeeId: employee.id,
					employmentId: employment.id,
					periodStart: "2025-07-01",
					periodEnd: "2025-07-15",
				},
				ready,
			);
			expect(timesheet.ok).toBe(true);
			if (!timesheet.ok) return;
			const entry = await addTimesheetEntry(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p02-ts-entry",
					timesheetId: timesheet.data.id,
					employeeId: employee.id,
					workDate: "2025-07-01",
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

			const found = await getTimesheetForEmployeePeriod(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p02-ts-period",
					employeeId: employee.id,
					periodStart: "2025-07-01",
					periodEnd: "2025-07-15",
				},
				ready,
			);
			expect(found.ok).toBe(true);
			if (!found.ok) return;
			expect(found.data?.id).toBe(timesheet.data.id);

			const totals = await getTimesheetTotals(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p02-ts-totals",
					timesheetId: timesheet.data.id,
				},
				ready,
			);
			expect(totals.ok).toBe(true);
			if (!totals.ok) return;
			expect(totals.data?.entryCount).toBe(1);
			expect(totals.data?.totalApprovedMinutes).toBe(480);
		});

		it("lists pending overtime approvals", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p02-ot",
			});
			const requested = await createOvertimeRequest(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p02-ot",
					idempotencyKey: "idem-p02-ot",
					employeeId: employee.id,
					employmentId: employment.id,
					overtimeType: "weekday_overtime",
					requestedStartsAt: "2025-07-01T10:00:00.000Z",
					requestedEndsAt: "2025-07-01T12:00:00.000Z",
					requestedMinutes: 120,
					reason: "peak load",
				},
				ready,
			);
			expect(requested.ok).toBe(true);
			if (!requested.ok) return;
			expect(requested.data.status).toBe("requested");

			const pending = await listPendingOvertimeApprovals(
				{
					organizationId: ORG,
					actorUserId: MANAGER,
					correlationId: "corr-p02-ot-pending",
				},
				ready,
			);
			expect(pending.ok).toBe(true);
			if (!pending.ok) return;
			expect(pending.data.some((row) => row.id === requested.data.id)).toBe(
				true,
			);
			expect(pending.data.every((row) => row.status === "requested")).toBe(
				true,
			);
		});
	});

	describe("HR-TIME-P0-03 leave integration", () => {
		it("emits leave rows, suppresses absence on leave day, creates absence on control day, and fills handoff leave minutes", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p03-leave",
			});

			const actorMapped = await mapActorToEmployee(ready.store, {
				organizationId: ORG,
				userId: ACTOR,
				employeeId: employee.id,
				actorUserId: ACTOR,
				effectiveFrom: "2025-01-01",
			});
			expect(actorMapped.ok).toBe(true);
			if (!actorMapped.ok) return;

			const managerEmployee = await createEmployee(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p03-mgr",
					idempotencyKey: "idem-p03-mgr",
					employeeNumber: "E-p03-mgr",
					legalName: "P03 Manager",
				},
				ready,
			);
			expect(managerEmployee.ok).toBe(true);
			if (!managerEmployee.ok) return;

			const managerMapped = await mapActorToEmployee(ready.store, {
				organizationId: ORG,
				userId: MANAGER,
				employeeId: managerEmployee.data.id,
				actorUserId: ACTOR,
				effectiveFrom: "2025-01-01",
			});
			expect(managerMapped.ok).toBe(true);
			if (!managerMapped.ok) return;

			const reporting = await assignPrimaryReportingLine(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p03-line",
					employeeId: employee.id,
					managerEmployeeId: managerEmployee.data.id,
					startsOn: "2025-01-01",
				},
				ready,
			);
			expect(reporting.ok).toBe(true);
			if (!reporting.ok) return;

			const calendar = await createWorkCalendar(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p03-cal",
					idempotencyKey: "idem-p03-cal",
					code: "P03",
					name: "P03 Calendar",
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

			const assignedCalendar = await assignEmploymentCalendar(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p03-cal-assign",
					employeeId: employee.id,
					employmentId: employment.id,
					calendarId: calendar.data.id,
					effectiveFrom: "2025-01-01",
				},
				ready,
			);
			expect(assignedCalendar.ok).toBe(true);
			if (!assignedCalendar.ok) return;

			const shift = await createShift(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p03-shift",
					idempotencyKey: "idem-p03-shift",
					code: "DAY-P03",
					name: "Day P03",
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
					correlationId: "corr-p03-shift-act",
					shiftId: shift.data.id,
					expectedVersion: shift.data.version,
				},
				ready,
			);
			expect(activated.ok).toBe(true);
			if (!activated.ok) return;

			for (const [date, suffix] of [
				["2025-07-02", "leave-day"],
				["2025-07-03", "control-day"],
			] as const) {
				const assignment = await assignShift(
					{
						organizationId: ORG,
						actorUserId: ACTOR,
						correlationId: `corr-p03-assign-${suffix}`,
						idempotencyKey: `idem-p03-assign-${suffix}`,
						employeeId: employee.id,
						employmentId: employment.id,
						shiftId: shift.data.id,
						scheduledDate: date,
						startsAt: `${date}T01:00:00.000Z`,
						endsAt: `${date}T09:00:00.000Z`,
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
						correlationId: `corr-p03-pub-${suffix}`,
						assignmentId: assignment.data.id,
						expectedVersion: assignment.data.version,
					},
					ready,
				);
				expect(published.ok).toBe(true);
				if (!published.ok) return;
			}

			const policy = await createLeavePolicy(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p03-policy",
					code: "P03-ANNUAL",
					name: "P03 Annual",
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
					correlationId: "corr-p03-policy-pub",
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
					correlationId: "corr-p03-ent",
					employeeId: employee.id,
					employmentId: employment.id,
					policyId: publishedPolicy.data.id,
					periodStart: "2025-01-01",
					periodEnd: "2025-12-31",
					openingQuantity: "10",
					idempotencyKey: "idem-p03-ent",
				},
				ready,
			);
			expect(entitlement.ok).toBe(true);
			if (!entitlement.ok) return;

			const draftLeave = await createDraftLeaveRequest(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p03-leave-draft",
					employeeId: employee.id,
					entitlementId: entitlement.data.id,
					startDate: "2025-07-02",
					endDate: "2025-07-02",
					requestedQuantity: "1",
					idempotencyKey: "idem-p03-leave",
				},
				ready,
			);
			expect(draftLeave.ok).toBe(true);
			if (!draftLeave.ok) return;

			const submittedLeave = await submitLeaveRequest(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p03-leave-submit",
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
					actorUserId: MANAGER,
					correlationId: "corr-p03-leave-approve",
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
					correlationId: "corr-p03-ts",
					idempotencyKey: "idem-p03-ts",
					employeeId: employee.id,
					employmentId: employment.id,
					periodStart: "2025-07-02",
					periodEnd: "2025-07-03",
				},
				ready,
			);
			expect(timesheet.ok).toBe(true);
			if (!timesheet.ok) return;

			const generated = await generateTimesheetEntries(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p03-gen",
					timesheetId: timesheet.data.id,
					expectedVersion: timesheet.data.version,
				},
				ready,
			);
			expect(generated.ok).toBe(true);
			if (!generated.ok) return;

			const leaveEntries = generated.data.entries.filter(
				(entry) => entry.sourceType === "leave",
			);
			expect(leaveEntries).toHaveLength(1);
			expect(leaveEntries[0]?.workDate).toBe("2025-07-02");
			expect(leaveEntries[0]?.approvedMinutes).toBe(480);
			expect(leaveEntries[0]?.timeType).toBe("training");

			const regenerated = await generateTimesheetEntries(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p03-gen-2",
					timesheetId: generated.data.timesheet.id,
					expectedVersion: generated.data.timesheet.version,
				},
				ready,
			);
			expect(regenerated.ok).toBe(true);
			if (!regenerated.ok) return;
			const leaveAfterRegen = regenerated.data.entries.filter(
				(entry) => entry.sourceType === "leave",
			);
			expect(leaveAfterRegen).toHaveLength(1);

			const unresolved = await listUnresolvedAttendanceExceptions(
				{
					organizationId: ORG,
					actorUserId: MANAGER,
					correlationId: "corr-p03-exc",
					employeeId: employee.id,
				},
				ready,
			);
			expect(unresolved.ok).toBe(true);
			if (!unresolved.ok) return;

			const absenceDates = unresolved.data
				.filter((exception) => exception.exceptionType === "absence")
				.map((exception) => parseAbsenceDetectionRemarks(exception.remarks))
				.filter(
					(remarks) =>
						remarks !== null &&
						remarks.detectionSource === TIMESHEET_GENERATION_ABSENCE_SOURCE,
				)
				.flatMap((remarks) => (remarks === null ? [] : [remarks.workDate]));

			expect(absenceDates).toContain("2025-07-03");
			expect(absenceDates).not.toContain("2025-07-02");

			const listed = await listTimesheetEntries(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p03-entries",
					timesheetId: regenerated.data.timesheet.id,
				},
				ready,
			);
			expect(listed.ok).toBe(true);
			if (!listed.ok) return;

			const submitted = await submitTimesheet(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p03-submit",
					timesheetId: regenerated.data.timesheet.id,
					expectedVersion: regenerated.data.timesheet.version,
				},
				ready,
			);
			expect(submitted.ok).toBe(true);
			if (!submitted.ok) return;
			await grantTimeApprovalAuthority(ready, {
				organizationId: ORG,
				targetActorUserId: MANAGER,
				authority: "line_manager",
				suffix: "p03-manager",
			});

			const approved = await approveTimesheet(
				{
					organizationId: ORG,
					actorUserId: MANAGER,
					correlationId: "corr-p03-approve",
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
					actorUserId: MANAGER,
					correlationId: "corr-p03-handoff",
					timesheetId: approved.data.id,
				},
				ready,
			);
			expect(handoff.ok).toBe(true);
			if (!handoff.ok || handoff.data === null) return;
			expect(handoff.data.paidLeaveMinutes).toBe(480);
			expect(handoff.data.unpaidLeaveMinutes).toBe(0);
		});
	});

	describe("HR-TIME-P0-05 attendance import", () => {
		it("imports events, skips idempotent source_reference replay, and returns partial failures", async () => {
			const ready = harness();
			const seeded = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p05-a",
			});
			const employeeId = seeded.employee.id;
			const unknownEmployeeId =
				"00000000-0000-4000-8000-000000000099" as typeof employeeId;

			const first = await importAttendanceEvents(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p05-import-1",
					idempotencyKey: "idem-p05-batch-1",
					batchId: "batch-p05-1",
					sourceKey: "terminal-a",
					events: [
						{
							employeeId,
							eventType: "clock_in",
							occurredAt: "2025-07-10T01:00:00.000Z",
							sourceTimezone: "UTC",
							localWorkDate: "2025-07-10",
							sourceReference: "ext-cin-1",
						},
						{
							employeeId,
							eventType: "clock_out",
							occurredAt: "2025-07-10T09:00:00.000Z",
							sourceTimezone: "UTC",
							localWorkDate: "2025-07-10",
							sourceReference: "ext-cout-1",
						},
					],
				},
				ready,
			);
			expect(first.ok).toBe(true);
			if (!first.ok) return;
			expect(first.data.status).toBe("completed");
			expect(first.data.totals.accepted).toBe(2);
			expect(first.data.totals.skipped).toBe(0);
			expect(first.data.totals.rejected).toBe(0);

			const listed = await listAttendanceEvents(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p05-list-1",
					employeeId,
					fromDate: "2025-07-10",
					toDate: "2025-07-10",
				},
				ready,
			);
			expect(listed.ok).toBe(true);
			if (!listed.ok) return;
			expect(listed.data).toHaveLength(2);

			const replayBatch = await importAttendanceEvents(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p05-import-1b",
					idempotencyKey: "idem-p05-batch-1",
					batchId: "batch-p05-1",
					sourceKey: "terminal-a",
					events: [
						{
							employeeId,
							eventType: "clock_in",
							occurredAt: "2025-07-10T01:00:00.000Z",
							sourceTimezone: "UTC",
							localWorkDate: "2025-07-10",
							sourceReference: "ext-cin-1",
						},
						{
							employeeId,
							eventType: "clock_out",
							occurredAt: "2025-07-10T09:00:00.000Z",
							sourceTimezone: "UTC",
							localWorkDate: "2025-07-10",
							sourceReference: "ext-cout-1",
						},
					],
				},
				ready,
			);
			expect(replayBatch.ok).toBe(true);
			if (!replayBatch.ok) return;
			expect(replayBatch.data.importBatchId).toBe(first.data.importBatchId);
			expect(replayBatch.data.totals).toEqual(first.data.totals);

			const idempotentRows = await importAttendanceEvents(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p05-import-2",
					idempotencyKey: "idem-p05-batch-2",
					batchId: "batch-p05-2",
					sourceKey: "terminal-a",
					events: [
						{
							employeeId,
							eventType: "clock_in",
							occurredAt: "2025-07-10T01:00:00.000Z",
							sourceTimezone: "UTC",
							localWorkDate: "2025-07-10",
							sourceReference: "ext-cin-1",
						},
						{
							employeeId,
							eventType: "clock_in",
							occurredAt: "2025-07-11T01:00:00.000Z",
							sourceTimezone: "UTC",
							localWorkDate: "2025-07-11",
							sourceReference: "ext-cin-2",
						},
						{
							employeeId: unknownEmployeeId,
							eventType: "clock_in",
							occurredAt: "2025-07-11T02:00:00.000Z",
							sourceTimezone: "UTC",
							localWorkDate: "2025-07-11",
							sourceReference: "ext-bad-emp",
						},
						{
							employeeId,
							eventType: "clock_out",
							occurredAt: "2025-07-11T09:00:00.000Z",
							sourceTimezone: "Not/AZone",
							localWorkDate: "2025-07-11",
							sourceReference: "ext-bad-tz",
						},
					],
				},
				ready,
			);
			expect(idempotentRows.ok).toBe(true);
			if (!idempotentRows.ok) return;
			expect(idempotentRows.data.status).toBe("partial");
			expect(idempotentRows.data.totals.skipped).toBe(1);
			expect(idempotentRows.data.totals.accepted).toBe(1);
			expect(idempotentRows.data.totals.rejected).toBe(2);
			expect(idempotentRows.data.skipped[0]?.sourceReference).toBe(
				namespacedImportSourceReference("terminal-a", "ext-cin-1"),
			);
			expect(
				idempotentRows.data.rejected.map((row) => row.errorCode).toSorted(),
			).toEqual(["INVALID_TIMEZONE", "UNKNOWN_EMPLOYEE"]);

			const conflict = await importAttendanceEvents(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p05-import-3",
					idempotencyKey: "idem-p05-batch-3",
					batchId: "batch-p05-3",
					sourceKey: "terminal-a",
					events: [
						{
							employeeId,
							eventType: "clock_out",
							occurredAt: "2025-07-10T10:00:00.000Z",
							sourceTimezone: "UTC",
							localWorkDate: "2025-07-10",
							sourceReference: "ext-cin-1",
						},
					],
				},
				ready,
			);
			expect(conflict.ok).toBe(true);
			if (!conflict.ok) return;
			expect(conflict.data.status).toBe("failed");
			expect(conflict.data.totals.rejected).toBe(1);
			expect(conflict.data.rejected[0]?.errorCode).toBe(
				"SOURCE_REFERENCE_CONFLICT",
			);

			const listedAfter = await listAttendanceEvents(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p05-list-2",
					employeeId,
				},
				ready,
			);
			expect(listedAfter.ok).toBe(true);
			if (!listedAfter.ok) return;
			expect(listedAfter.data).toHaveLength(3);
		});

		it("imports via AttendanceSourcePort when events are omitted", async () => {
			const ready = harness();
			const seeded = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p05-port",
			});
			const attendanceSource: AttendanceSourcePort = {
				async fetchEvents() {
					return {
						ok: true,
						data: {
							events: [
								{
									employeeId: seeded.employee.id,
									eventType: "clock_in",
									occurredAt: "2025-07-12T01:00:00.000Z",
									sourceTimezone: "UTC",
									localWorkDate: "2025-07-12",
									sourceReference: "port-cin-1",
								},
							],
							nextCursor: "cursor-2",
						},
					};
				},
			};

			const imported = await importAttendanceEvents(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p05-port",
					idempotencyKey: "idem-p05-port",
					batchId: "batch-p05-port",
					sourceKey: "device-b",
				},
				{ ...ready, attendanceSource },
			);
			expect(imported.ok).toBe(true);
			if (!imported.ok) return;
			expect(imported.data.status).toBe("completed");
			expect(imported.data.totals.accepted).toBe(1);
			expect(imported.data.nextCursor).toBe("cursor-2");
		});
	});

	describe("HR-TIME-P0-06 exception detection", () => {
		it("auto-detects late_arrival on session resolve against published schedule", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p06-late",
			});
			const { assignment } = await seedPublishedDayShift(ready, {
				suffix: "late",
				employeeId: employee.id,
				employmentId: employment.id,
				scheduledDate: "2025-07-15",
				startsAt: "2025-07-15T01:00:00.000Z",
				endsAt: "2025-07-15T09:00:00.000Z",
			});

			const clockIn = await recordClockIn(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-late-cin",
					idempotencyKey: "idem-p06-late-cin",
					employeeId: employee.id,
					employmentId: employment.id,
					shiftAssignmentId: assignment.id,
					occurredAt: "2025-07-15T01:20:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-15",
				},
				ready,
			);
			expect(clockIn.ok).toBe(true);
			if (!clockIn.ok) return;
			const clockOut = await recordClockOut(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-late-cout",
					idempotencyKey: "idem-p06-late-cout",
					employeeId: employee.id,
					employmentId: employment.id,
					shiftAssignmentId: assignment.id,
					occurredAt: "2025-07-15T09:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-15",
				},
				ready,
			);
			expect(clockOut.ok).toBe(true);
			if (!clockOut.ok) return;

			const session = await resolveAttendanceSession(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-late-sess",
					idempotencyKey: "idem-p06-late-sess",
					employeeId: employee.id,
					localWorkDate: "2025-07-15",
					timezone: "Asia/Singapore",
				},
				ready,
			);
			expect(session.ok).toBe(true);
			if (!session.ok) return;
			expect(session.data.resolutionStatus).toBe("resolved");

			const unresolved = await listUnresolvedAttendanceExceptions(
				{
					organizationId: ORG,
					actorUserId: MANAGER,
					correlationId: "corr-p06-late-list",
					employeeId: employee.id,
				},
				ready,
			);
			expect(unresolved.ok).toBe(true);
			if (!unresolved.ok) return;
			expect(
				autoDetectedTypes(unresolved.data, ATTENDANCE_SESSION_DETECTION_SOURCE),
			).toContain("late_arrival");
		});

		it("auto-detects early_departure on session resolve", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p06-early",
			});
			const { assignment } = await seedPublishedDayShift(ready, {
				suffix: "early",
				employeeId: employee.id,
				employmentId: employment.id,
				scheduledDate: "2025-07-16",
				startsAt: "2025-07-16T01:00:00.000Z",
				endsAt: "2025-07-16T09:00:00.000Z",
			});

			await recordClockIn(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-early-cin",
					idempotencyKey: "idem-p06-early-cin",
					employeeId: employee.id,
					employmentId: employment.id,
					shiftAssignmentId: assignment.id,
					occurredAt: "2025-07-16T01:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-16",
				},
				ready,
			);
			await recordClockOut(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-early-cout",
					idempotencyKey: "idem-p06-early-cout",
					employeeId: employee.id,
					employmentId: employment.id,
					shiftAssignmentId: assignment.id,
					occurredAt: "2025-07-16T08:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-16",
				},
				ready,
			);

			const session = await resolveAttendanceSession(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-early-sess",
					idempotencyKey: "idem-p06-early-sess",
					employeeId: employee.id,
					localWorkDate: "2025-07-16",
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
					correlationId: "corr-p06-early-list",
					employeeId: employee.id,
				},
				ready,
			);
			expect(unresolved.ok).toBe(true);
			if (!unresolved.ok) return;
			expect(
				autoDetectedTypes(unresolved.data, ATTENDANCE_SESSION_DETECTION_SOURCE),
			).toContain("early_departure");
		});

		it("auto-detects missing_clock_out for incomplete session", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p06-mcout",
			});
			const { assignment } = await seedPublishedDayShift(ready, {
				suffix: "mcout",
				employeeId: employee.id,
				employmentId: employment.id,
				scheduledDate: "2025-07-17",
				startsAt: "2025-07-17T01:00:00.000Z",
				endsAt: "2025-07-17T09:00:00.000Z",
			});

			await recordClockIn(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-mcout-cin",
					idempotencyKey: "idem-p06-mcout-cin",
					employeeId: employee.id,
					employmentId: employment.id,
					shiftAssignmentId: assignment.id,
					occurredAt: "2025-07-17T01:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-17",
				},
				ready,
			);

			const session = await resolveAttendanceSession(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-mcout-sess",
					idempotencyKey: "idem-p06-mcout-sess",
					employeeId: employee.id,
					localWorkDate: "2025-07-17",
					timezone: "Asia/Singapore",
				},
				ready,
			);
			expect(session.ok).toBe(true);
			if (!session.ok) return;
			expect(session.data.resolutionStatus).toBe("needs_review");

			const unresolved = await listUnresolvedAttendanceExceptions(
				{
					organizationId: ORG,
					actorUserId: MANAGER,
					correlationId: "corr-p06-mcout-list",
					employeeId: employee.id,
				},
				ready,
			);
			expect(unresolved.ok).toBe(true);
			if (!unresolved.ok) return;
			expect(
				autoDetectedTypes(unresolved.data, ATTENDANCE_SESSION_DETECTION_SOURCE),
			).toContain("missing_clock_out");
		});

		it("auto-detects missing_clock_in when only clock-out exists", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p06-mcin",
			});
			const { assignment } = await seedPublishedDayShift(ready, {
				suffix: "mcin",
				employeeId: employee.id,
				employmentId: employment.id,
				scheduledDate: "2025-07-18",
				startsAt: "2025-07-18T01:00:00.000Z",
				endsAt: "2025-07-18T09:00:00.000Z",
			});

			await recordClockOut(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-mcin-cout",
					idempotencyKey: "idem-p06-mcin-cout",
					employeeId: employee.id,
					employmentId: employment.id,
					shiftAssignmentId: assignment.id,
					occurredAt: "2025-07-18T09:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-18",
				},
				ready,
			);

			const session = await resolveAttendanceSession(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-mcin-sess",
					idempotencyKey: "idem-p06-mcin-sess",
					employeeId: employee.id,
					localWorkDate: "2025-07-18",
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
					correlationId: "corr-p06-mcin-list",
					employeeId: employee.id,
				},
				ready,
			);
			expect(unresolved.ok).toBe(true);
			if (!unresolved.ok) return;
			expect(
				autoDetectedTypes(unresolved.data, ATTENDANCE_SESSION_DETECTION_SOURCE),
			).toContain("missing_clock_in");
		});

		it("auto-detects unplanned_attendance without published schedule", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p06-unpl",
			});

			await recordClockIn(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-unpl-cin",
					idempotencyKey: "idem-p06-unpl-cin",
					employeeId: employee.id,
					employmentId: employment.id,
					occurredAt: "2025-07-19T01:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-19",
				},
				ready,
			);
			await recordClockOut(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-unpl-cout",
					idempotencyKey: "idem-p06-unpl-cout",
					employeeId: employee.id,
					employmentId: employment.id,
					occurredAt: "2025-07-19T09:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-19",
				},
				ready,
			);

			const session = await resolveAttendanceSession(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-unpl-sess",
					idempotencyKey: "idem-p06-unpl-sess",
					employeeId: employee.id,
					localWorkDate: "2025-07-19",
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
					correlationId: "corr-p06-unpl-list",
					employeeId: employee.id,
				},
				ready,
			);
			expect(unresolved.ok).toBe(true);
			if (!unresolved.ok) return;
			expect(
				autoDetectedTypes(unresolved.data, ATTENDANCE_SESSION_DETECTION_SOURCE),
			).toContain("unplanned_attendance");
		});

		it("auto-detects schedule_mismatch when session links a different assignment", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p06-mm",
			});
			const { assignment: scheduled } = await seedPublishedDayShift(ready, {
				suffix: "mm-a",
				employeeId: employee.id,
				employmentId: employment.id,
				scheduledDate: "2025-07-20",
				startsAt: "2025-07-20T01:00:00.000Z",
				endsAt: "2025-07-20T09:00:00.000Z",
			});

			const otherShift = await createShift(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-mm-shift-b",
					idempotencyKey: "idem-p06-mm-shift-b",
					code: "OTHER-MM",
					name: "Other",
					shiftKind: "fixed",
					startLocal: "10:00",
					endLocal: "18:00",
					expectedMinutes: 480,
					effectiveFrom: "2025-01-01",
				},
				ready,
			);
			expect(otherShift.ok).toBe(true);
			if (!otherShift.ok) return;
			const activated = await activateShift(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-mm-act-b",
					shiftId: otherShift.data.id,
					expectedVersion: otherShift.data.version,
				},
				ready,
			);
			expect(activated.ok).toBe(true);
			if (!activated.ok) return;
			const otherAssignment = await assignShift(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-mm-assign-b",
					idempotencyKey: "idem-p06-mm-assign-b",
					employeeId: employee.id,
					employmentId: employment.id,
					shiftId: otherShift.data.id,
					scheduledDate: "2025-07-21",
					startsAt: "2025-07-21T02:00:00.000Z",
					endsAt: "2025-07-21T10:00:00.000Z",
					timezone: "Asia/Singapore",
				},
				ready,
			);
			expect(otherAssignment.ok).toBe(true);
			if (!otherAssignment.ok) return;

			await recordClockIn(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-mm-cin",
					idempotencyKey: "idem-p06-mm-cin",
					employeeId: employee.id,
					employmentId: employment.id,
					shiftAssignmentId: otherAssignment.data.id,
					occurredAt: "2025-07-20T01:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-20",
				},
				ready,
			);
			await recordClockOut(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-mm-cout",
					idempotencyKey: "idem-p06-mm-cout",
					employeeId: employee.id,
					employmentId: employment.id,
					shiftAssignmentId: otherAssignment.data.id,
					occurredAt: "2025-07-20T09:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-20",
				},
				ready,
			);

			const session = await resolveAttendanceSession(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-mm-sess",
					idempotencyKey: "idem-p06-mm-sess",
					employeeId: employee.id,
					localWorkDate: "2025-07-20",
					timezone: "Asia/Singapore",
				},
				ready,
			);
			expect(session.ok).toBe(true);
			if (!session.ok) return;
			expect(session.data.shiftAssignmentId).toBe(otherAssignment.data.id);
			expect(session.data.shiftAssignmentId).not.toBe(scheduled.id);

			const unresolved = await listUnresolvedAttendanceExceptions(
				{
					organizationId: ORG,
					actorUserId: MANAGER,
					correlationId: "corr-p06-mm-list",
					employeeId: employee.id,
				},
				ready,
			);
			expect(unresolved.ok).toBe(true);
			if (!unresolved.ok) return;
			expect(
				autoDetectedTypes(unresolved.data, ATTENDANCE_SESSION_DETECTION_SOURCE),
			).toContain("schedule_mismatch");
		});

		it("detects policy-driven insufficient rest between sessions", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p06-rest-policy",
			});
			const policy = await createTimePolicy(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-rest-policy-create",
					idempotencyKey: "idem-p06-rest-policy-create",
					code: "REST-P06",
					name: "Rest policy",
					effectiveFrom: "2025-01-01",
					minimumRestMinutes: 660,
					approvalSteps: ["line_manager"],
				},
				ready,
			);
			expect(policy.ok).toBe(true);
			if (!policy.ok) return;
			const activated = await activateTimePolicy(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-rest-policy-activate",
					policyId: policy.data.id,
					expectedVersion: policy.data.version,
				},
				ready,
			);
			expect(activated.ok).toBe(true);
			if (!activated.ok) return;
			const assigned = await assignTimePolicy(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-rest-policy-assign",
					policyId: activated.data.id,
					employmentId: employment.id,
					effectiveFrom: "2025-01-01",
				},
				ready,
			);
			expect(assigned.ok).toBe(true);

			await recordClockIn(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-rest-day1-in",
					idempotencyKey: "idem-p06-rest-day1-in",
					employeeId: employee.id,
					employmentId: employment.id,
					occurredAt: "2025-07-23T01:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-23",
				},
				ready,
			);
			await recordClockOut(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-rest-day1-out",
					idempotencyKey: "idem-p06-rest-day1-out",
					employeeId: employee.id,
					employmentId: employment.id,
					occurredAt: "2025-07-23T09:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-23",
				},
				ready,
			);
			await resolveAttendanceSession(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-rest-day1-session",
					idempotencyKey: "idem-p06-rest-day1-session",
					employeeId: employee.id,
					localWorkDate: "2025-07-23",
					timezone: "Asia/Singapore",
				},
				ready,
			);
			await recordClockIn(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-rest-day2-in",
					idempotencyKey: "idem-p06-rest-day2-in",
					employeeId: employee.id,
					employmentId: employment.id,
					occurredAt: "2025-07-23T15:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-24",
				},
				ready,
			);
			const current = await resolveAttendanceSession(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-rest-day2-session",
					idempotencyKey: "idem-p06-rest-day2-session",
					employeeId: employee.id,
					localWorkDate: "2025-07-24",
					timezone: "Asia/Singapore",
				},
				ready,
			);
			expect(current.ok).toBe(true);
			if (!current.ok) return;
			const unresolved = await listUnresolvedAttendanceExceptions(
				{
					organizationId: ORG,
					actorUserId: MANAGER,
					correlationId: "corr-p06-rest-list",
					employeeId: employee.id,
				},
				ready,
			);
			expect(unresolved.ok).toBe(true);
			if (!unresolved.ok) return;
			expect(
				autoDetectedTypes(unresolved.data, ATTENDANCE_SESSION_DETECTION_SOURCE),
			).toContain("insufficient_rest");
		});

		it("detects overlap, excessive break, location mismatch, and overtime candidates", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p06-complete-types",
			});
			const shift = await createShift(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-types-shift",
					idempotencyKey: "idem-p06-types-shift",
					code: "P06-TYPES",
					name: "Exception type coverage",
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
			if (!shift.ok) return;
			const activated = await activateShift(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-types-activate",
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
					correlationId: "corr-p06-types-assignment",
					idempotencyKey: "idem-p06-types-assignment",
					employeeId: employee.id,
					employmentId: employment.id,
					shiftId: activated.data.id,
					scheduledDate: "2025-07-23",
					startsAt: "2025-07-23T01:00:00.000Z",
					endsAt: "2025-07-23T09:00:00.000Z",
					locationKey: "hq",
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
					correlationId: "corr-p06-types-publish",
					assignmentId: assignment.data.id,
					expectedVersion: assignment.data.version,
				},
				ready,
			);
			expect(published.ok).toBe(true);
			if (!published.ok) return;

			const baseEvent = {
				organizationId: ORG,
				actorUserId: ACTOR,
				employeeId: employee.id,
				employmentId: employment.id,
				shiftAssignmentId: assignment.data.id,
				sourceTimezone: "Asia/Singapore",
				localWorkDate: "2025-07-23",
				locationKey: "field-site",
			};
			await recordClockIn(
				{
					...baseEvent,
					correlationId: "corr-p06-types-clock-in",
					idempotencyKey: "idem-p06-types-clock-in",
					occurredAt: "2025-07-23T01:00:00.000Z",
				},
				ready,
			);
			await recordClockIn(
				{
					...baseEvent,
					correlationId: "corr-p06-types-clock-in-duplicate",
					idempotencyKey: "idem-p06-types-clock-in-duplicate",
					occurredAt: "2025-07-23T01:05:00.000Z",
				},
				ready,
			);
			await recordBreakStart(
				{
					...baseEvent,
					correlationId: "corr-p06-types-break-start",
					idempotencyKey: "idem-p06-types-break-start",
					occurredAt: "2025-07-23T05:00:00.000Z",
				},
				ready,
			);
			await recordBreakEnd(
				{
					...baseEvent,
					correlationId: "corr-p06-types-break-end",
					idempotencyKey: "idem-p06-types-break-end",
					occurredAt: "2025-07-23T06:00:00.000Z",
				},
				ready,
			);
			await recordClockOut(
				{
					...baseEvent,
					correlationId: "corr-p06-types-clock-out",
					idempotencyKey: "idem-p06-types-clock-out",
					occurredAt: "2025-07-23T11:00:00.000Z",
				},
				ready,
			);

			const session = await resolveAttendanceSession(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-types-session",
					idempotencyKey: "idem-p06-types-session",
					employeeId: employee.id,
					localWorkDate: "2025-07-23",
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
					correlationId: "corr-p06-types-list",
					employeeId: employee.id,
				},
				ready,
			);
			expect(unresolved.ok).toBe(true);
			if (!unresolved.ok) return;
			const detected = autoDetectedTypes(
				unresolved.data,
				ATTENDANCE_SESSION_DETECTION_SOURCE,
			);
			expect(detected).toEqual(
				expect.arrayContaining([
					"overlapping_attendance",
					"excessive_break",
					"location_mismatch",
					"overtime_candidate",
				]),
			);
		});

		it("re-detects on schedule publish after pre-schedule attendance; re-resolve is idempotent", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p06-pub",
			});

			await recordClockIn(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-pub-cin",
					idempotencyKey: "idem-p06-pub-cin",
					employeeId: employee.id,
					employmentId: employment.id,
					occurredAt: "2025-07-22T01:20:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-22",
				},
				ready,
			);
			await recordClockOut(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-pub-cout",
					idempotencyKey: "idem-p06-pub-cout",
					employeeId: employee.id,
					employmentId: employment.id,
					occurredAt: "2025-07-22T09:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-22",
				},
				ready,
			);

			const session = await resolveAttendanceSession(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-pub-sess",
					idempotencyKey: "idem-p06-pub-sess",
					employeeId: employee.id,
					localWorkDate: "2025-07-22",
					timezone: "Asia/Singapore",
				},
				ready,
			);
			expect(session.ok).toBe(true);
			if (!session.ok) return;

			const beforePublish = await listUnresolvedAttendanceExceptions(
				{
					organizationId: ORG,
					actorUserId: MANAGER,
					correlationId: "corr-p06-pub-before",
					employeeId: employee.id,
				},
				ready,
			);
			expect(beforePublish.ok).toBe(true);
			if (!beforePublish.ok) return;
			expect(
				autoDetectedTypes(
					beforePublish.data,
					ATTENDANCE_SESSION_DETECTION_SOURCE,
				),
			).toContain("unplanned_attendance");

			const shift = await createShift(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-pub-shift",
					idempotencyKey: "idem-p06-pub-shift",
					code: "PUB-DAY",
					name: "Publish Day",
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
					correlationId: "corr-p06-pub-act",
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
					correlationId: "corr-p06-pub-assign",
					idempotencyKey: "idem-p06-pub-assign",
					employeeId: employee.id,
					employmentId: employment.id,
					shiftId: shift.data.id,
					scheduledDate: "2025-07-22",
					startsAt: "2025-07-22T01:00:00.000Z",
					endsAt: "2025-07-22T09:00:00.000Z",
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
					correlationId: "corr-p06-pub-publish",
					assignmentId: assignment.data.id,
					expectedVersion: assignment.data.version,
				},
				ready,
			);
			expect(published.ok).toBe(true);
			if (!published.ok) return;

			const afterPublish = await listUnresolvedAttendanceExceptions(
				{
					organizationId: ORG,
					actorUserId: MANAGER,
					correlationId: "corr-p06-pub-after",
					employeeId: employee.id,
				},
				ready,
			);
			expect(afterPublish.ok).toBe(true);
			if (!afterPublish.ok) return;
			expect(
				autoDetectedTypes(afterPublish.data, SCHEDULE_PUBLISH_DETECTION_SOURCE),
			).toContain("late_arrival");

			const lateCountBefore = afterPublish.data.filter(
				(exception) =>
					exception.exceptionType === "late_arrival" &&
					parseExceptionDetectionRemarks(exception.remarks)?.detectionSource ===
						SCHEDULE_PUBLISH_DETECTION_SOURCE,
			).length;

			const reresolve = await resolveAttendanceSession(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-pub-reresolve",
					idempotencyKey: "idem-p06-pub-reresolve",
					employeeId: employee.id,
					localWorkDate: "2025-07-22",
					timezone: "Asia/Singapore",
				},
				ready,
			);
			expect(reresolve.ok).toBe(true);
			if (!reresolve.ok) return;

			const afterReresolve = await listUnresolvedAttendanceExceptions(
				{
					organizationId: ORG,
					actorUserId: MANAGER,
					correlationId: "corr-p06-pub-after2",
					employeeId: employee.id,
				},
				ready,
			);
			expect(afterReresolve.ok).toBe(true);
			if (!afterReresolve.ok) return;
			const lateCountAfter = afterReresolve.data.filter(
				(exception) =>
					exception.exceptionType === "late_arrival" &&
					parseExceptionDetectionRemarks(exception.remarks)?.detectionSource ===
						SCHEDULE_PUBLISH_DETECTION_SOURCE,
			).length;
			expect(lateCountAfter).toBe(lateCountBefore);

			const sessionLateCount = afterReresolve.data.filter(
				(exception) =>
					exception.exceptionType === "late_arrival" &&
					parseExceptionDetectionRemarks(exception.remarks)?.detectionSource ===
						ATTENDANCE_SESSION_DETECTION_SOURCE,
			).length;
			expect(sessionLateCount).toBe(1);
		});

		it("resolves multiple breaks without spurious exceptions when on schedule", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p06-brk",
			});
			const { assignment } = await seedPublishedDayShift(ready, {
				suffix: "brk",
				employeeId: employee.id,
				employmentId: employment.id,
				scheduledDate: "2025-07-23",
				startsAt: "2025-07-23T01:00:00.000Z",
				endsAt: "2025-07-23T09:00:00.000Z",
			});

			await recordClockIn(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-brk-cin",
					idempotencyKey: "idem-p06-brk-cin",
					employeeId: employee.id,
					employmentId: employment.id,
					shiftAssignmentId: assignment.id,
					occurredAt: "2025-07-23T01:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-23",
				},
				ready,
			);
			await recordBreakStart(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-brk-bs1",
					idempotencyKey: "idem-p06-brk-bs1",
					employeeId: employee.id,
					employmentId: employment.id,
					shiftAssignmentId: assignment.id,
					occurredAt: "2025-07-23T04:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-23",
				},
				ready,
			);
			await recordBreakEnd(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-brk-be1",
					idempotencyKey: "idem-p06-brk-be1",
					employeeId: employee.id,
					employmentId: employment.id,
					shiftAssignmentId: assignment.id,
					occurredAt: "2025-07-23T04:30:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-23",
				},
				ready,
			);
			await recordBreakStart(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-brk-bs2",
					idempotencyKey: "idem-p06-brk-bs2",
					employeeId: employee.id,
					employmentId: employment.id,
					shiftAssignmentId: assignment.id,
					occurredAt: "2025-07-23T06:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-23",
				},
				ready,
			);
			await recordBreakEnd(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-brk-be2",
					idempotencyKey: "idem-p06-brk-be2",
					employeeId: employee.id,
					employmentId: employment.id,
					shiftAssignmentId: assignment.id,
					occurredAt: "2025-07-23T06:15:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-23",
				},
				ready,
			);
			await recordClockOut(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-brk-cout",
					idempotencyKey: "idem-p06-brk-cout",
					employeeId: employee.id,
					employmentId: employment.id,
					shiftAssignmentId: assignment.id,
					occurredAt: "2025-07-23T09:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-23",
				},
				ready,
			);

			const session = await resolveAttendanceSession(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-brk-sess",
					idempotencyKey: "idem-p06-brk-sess",
					employeeId: employee.id,
					localWorkDate: "2025-07-23",
					timezone: "Asia/Singapore",
				},
				ready,
			);
			expect(session.ok).toBe(true);
			if (!session.ok) return;
			expect(session.data.resolutionStatus).toBe("resolved");
			expect(session.data.breakMinutes).toBe(45);
			expect(session.data.workedMinutes).toBe(435);

			const unresolved = await listUnresolvedAttendanceExceptions(
				{
					organizationId: ORG,
					actorUserId: MANAGER,
					correlationId: "corr-p06-brk-list",
					employeeId: employee.id,
				},
				ready,
			);
			expect(unresolved.ok).toBe(true);
			if (!unresolved.ok) return;
			const auto = autoDetectedTypes(
				unresolved.data,
				ATTENDANCE_SESSION_DETECTION_SOURCE,
			);
			expect(auto).not.toContain("late_arrival");
			expect(auto).not.toContain("early_departure");
			expect(auto).not.toContain("missing_clock_in");
			expect(auto).not.toContain("missing_clock_out");
			expect(auto).not.toContain("unplanned_attendance");
			expect(auto).not.toContain("schedule_mismatch");
		});

		it("detects against overnight assignment startsAt/endsAt", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p06-ovn",
			});
			const { assignment } = await seedPublishedDayShift(ready, {
				suffix: "ovn",
				employeeId: employee.id,
				employmentId: employment.id,
				scheduledDate: "2025-07-24",
				startsAt: "2025-07-24T14:00:00.000Z",
				endsAt: "2025-07-24T22:00:00.000Z",
				startLocal: "22:00",
				endLocal: "06:00",
			});

			await recordClockIn(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-ovn-cin",
					idempotencyKey: "idem-p06-ovn-cin",
					employeeId: employee.id,
					employmentId: employment.id,
					shiftAssignmentId: assignment.id,
					occurredAt: "2025-07-24T14:30:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-24",
				},
				ready,
			);
			await recordClockOut(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-ovn-cout",
					idempotencyKey: "idem-p06-ovn-cout",
					employeeId: employee.id,
					employmentId: employment.id,
					shiftAssignmentId: assignment.id,
					occurredAt: "2025-07-24T22:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-24",
				},
				ready,
			);

			const session = await resolveAttendanceSession(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p06-ovn-sess",
					idempotencyKey: "idem-p06-ovn-sess",
					employeeId: employee.id,
					localWorkDate: "2025-07-24",
					timezone: "Asia/Singapore",
				},
				ready,
			);
			expect(session.ok).toBe(true);
			if (!session.ok) return;
			expect(session.data.workedMinutes).toBe(450);

			const unresolved = await listUnresolvedAttendanceExceptions(
				{
					organizationId: ORG,
					actorUserId: MANAGER,
					correlationId: "corr-p06-ovn-list",
					employeeId: employee.id,
				},
				ready,
			);
			expect(unresolved.ok).toBe(true);
			if (!unresolved.ok) return;
			expect(
				autoDetectedTypes(unresolved.data, ATTENDANCE_SESSION_DETECTION_SOURCE),
			).toContain("late_arrival");
		});
	});

	describe("HR-TIME-P0-07 §23 acceptance matrix", () => {
		it("creates and activates a standard day shift", async () => {
			const ready = harness();
			const shift = await createShift(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-day-shift",
					idempotencyKey: "idem-p07-day-shift",
					code: "DAY-P07",
					name: "Day P07",
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
			expect(shift.data.shiftKind).toBe("fixed");
			expect(shift.data.isOvernight).toBe(false);

			const activated = await activateShift(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-day-act",
					shiftId: shift.data.id,
					expectedVersion: shift.data.version,
				},
				ready,
			);
			expect(activated.ok).toBe(true);
			if (!activated.ok) return;
			expect(activated.data.status).toBe("active");
		});

		it("creates flexible shift with clock window bounds", async () => {
			const ready = harness();
			const shift = await createShift(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-flex-shift",
					idempotencyKey: "idem-p07-flex-shift",
					code: "FLEX-P07",
					name: "Flexible P07",
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
			expect(shift.ok).toBe(true);
			if (!shift.ok) return;
			expect(shift.data.shiftKind).toBe("flexible");
			expect(shift.data.earliestClockInLocal).toBe("07:00");
			expect(shift.data.latestClockOutLocal).toBe("19:00");

			const activated = await activateShift(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-flex-act",
					shiftId: shift.data.id,
					expectedVersion: shift.data.version,
				},
				ready,
			);
			expect(activated.ok).toBe(true);
			if (!activated.ok) return;
			expect(activated.data.status).toBe("active");
		});

		it("creates split shift with ordered breaks", async () => {
			const ready = harness();
			const shift = await createShift(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-split-shift",
					idempotencyKey: "idem-p07-split-shift",
					code: "SPLIT-P07",
					name: "Split P07",
					shiftKind: "split",
					startLocal: "06:00",
					endLocal: "18:00",
					expectedMinutes: 600,
					effectiveFrom: "2025-01-01",
				},
				ready,
			);
			expect(shift.ok).toBe(true);
			if (!shift.ok) return;
			expect(shift.data.shiftKind).toBe("split");

			const breakA = await addShiftBreak(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-split-br1",
					shiftId: shift.data.id,
					breakOrder: 1,
					durationMinutes: 30,
					startOffsetMinutes: 240,
					label: "mid-morning",
				},
				ready,
			);
			expect(breakA.ok).toBe(true);

			const breakB = await addShiftBreak(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-split-br2",
					shiftId: shift.data.id,
					breakOrder: 2,
					durationMinutes: 60,
					startOffsetMinutes: 420,
					label: "meal",
				},
				ready,
			);
			expect(breakB.ok).toBe(true);

			const listed = await listShiftBreaks(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-split-list",
					shiftId: shift.data.id,
				},
				ready,
			);
			expect(listed.ok).toBe(true);
			if (!listed.ok) return;
			expect(listed.data).toHaveLength(2);
			expect(listed.data.map((row) => row.breakOrder)).toEqual([1, 2]);
			expect(listed.data.map((row) => row.durationMinutes)).toEqual([30, 60]);

			const activated = await activateShift(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-split-activate",
					shiftId: shift.data.id,
					expectedVersion: shift.data.version,
				},
				ready,
			);
			expect(activated.ok).toBe(true);
			if (!activated.ok) return;
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p07-split-segments",
			});
			const assignment = await assignShift(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-split-assignment",
					idempotencyKey: "idem-p07-split-assignment",
					employeeId: employee.id,
					employmentId: employment.id,
					shiftId: activated.data.id,
					scheduledDate: "2025-07-14",
					startsAt: "2025-07-14T06:00:00.000Z",
					endsAt: "2025-07-14T18:00:00.000Z",
					timezone: "UTC",
					segments: [
						{
							segmentOrder: 1,
							startsAt: "2025-07-14T06:00:00.000Z",
							endsAt: "2025-07-14T10:00:00.000Z",
						},
						{
							segmentOrder: 2,
							startsAt: "2025-07-14T14:00:00.000Z",
							endsAt: "2025-07-14T18:00:00.000Z",
						},
					],
				},
				ready,
			);
			expect(assignment.ok).toBe(true);
			if (!assignment.ok) return;
			const segments = await listShiftAssignmentSegments(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-split-segment-list",
					assignmentId: assignment.data.id,
				},
				ready,
			);
			expect(segments.ok).toBe(true);
			if (!segments.ok) return;
			expect(segments.data.map((segment) => segment.segmentOrder)).toEqual([
				1, 2,
			]);
			expect(
				segments.data.map((segment) => [
					segment.startsAt.toISOString(),
					segment.endsAt.toISOString(),
				]),
			).toEqual([
				["2025-07-14T06:00:00.000Z", "2025-07-14T10:00:00.000Z"],
				["2025-07-14T14:00:00.000Z", "2025-07-14T18:00:00.000Z"],
			]);
		});

		it("rejects overlapping shift assignment", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p07-conflict",
			});
			const { assignment } = await seedPublishedDayShift(ready, {
				suffix: "p07-c1",
				employeeId: employee.id,
				employmentId: employment.id,
				scheduledDate: "2025-07-15",
				startsAt: "2025-07-15T01:00:00.000Z",
				endsAt: "2025-07-15T09:00:00.000Z",
			});

			const overlapping = await assignShift(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-overlap",
					idempotencyKey: "idem-p07-overlap",
					employeeId: employee.id,
					employmentId: employment.id,
					shiftId: assignment.shiftId,
					scheduledDate: "2025-07-15",
					startsAt: "2025-07-15T08:00:00.000Z",
					endsAt: "2025-07-15T16:00:00.000Z",
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

		it("amends published assignment via changeShiftAssignment", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p07-amend",
			});
			const { assignment } = await seedPublishedDayShift(ready, {
				suffix: "p07-am",
				employeeId: employee.id,
				employmentId: employment.id,
				scheduledDate: "2025-07-16",
				startsAt: "2025-07-16T01:00:00.000Z",
				endsAt: "2025-07-16T09:00:00.000Z",
			});

			const changed = await changeShiftAssignment(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-amend",
					assignmentId: assignment.id,
					startsAt: "2025-07-16T02:00:00.000Z",
					endsAt: "2025-07-16T10:00:00.000Z",
					expectedVersion: assignment.version,
				},
				ready,
			);
			expect(changed.ok).toBe(true);
			if (!changed.ok) return;
			expect(changed.data.publicationStatus).toBe("changed");
			expect(changed.data.startsAt.toISOString()).toBe(
				"2025-07-16T02:00:00.000Z",
			);
			expect(changed.data.endsAt.toISOString()).toBe(
				"2025-07-16T10:00:00.000Z",
			);
		});

		it("preserves a published assignment once attendance exists", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p07-attendance-lock",
			});
			const { assignment } = await seedPublishedDayShift(ready, {
				suffix: "p07-attendance-lock",
				employeeId: employee.id,
				employmentId: employment.id,
				scheduledDate: "2025-07-18",
				startsAt: "2025-07-18T01:00:00.000Z",
				endsAt: "2025-07-18T09:00:00.000Z",
			});
			const attendance = await recordClockIn(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-attendance-lock-record",
					idempotencyKey: "idem-p07-attendance-lock-record",
					employeeId: employee.id,
					employmentId: employment.id,
					shiftAssignmentId: assignment.id,
					occurredAt: "2025-07-18T01:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-18",
				},
				ready,
			);
			expect(attendance.ok).toBe(true);

			const changed = await changeShiftAssignment(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-attendance-lock-change",
					assignmentId: assignment.id,
					startsAt: "2025-07-18T02:00:00.000Z",
					endsAt: "2025-07-18T10:00:00.000Z",
					expectedVersion: assignment.version,
				},
				ready,
			);
			expect(changed.ok).toBe(false);
			if (changed.ok) return;
			expect(humanResourcesCodeFromResult(changed)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		});

		it("replays attendance event by idempotency key without duplicate row", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p07-idem-att",
			});
			const payload = {
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-p07-idem-cin",
				idempotencyKey: "idem-p07-idem-cin",
				employeeId: employee.id,
				employmentId: employment.id,
				occurredAt: "2025-07-17T01:00:00.000Z",
				sourceTimezone: "Asia/Singapore",
				localWorkDate: "2025-07-17",
			};
			const first = await recordClockIn(payload, ready);
			expect(first.ok).toBe(true);
			if (!first.ok) return;

			const replay = await recordClockIn(
				{ ...payload, correlationId: "corr-p07-idem-cin-2" },
				ready,
			);
			expect(replay.ok).toBe(true);
			if (!replay.ok) return;
			expect(replay.data.id).toBe(first.data.id);

			const listed = await listAttendanceEvents(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-idem-list",
					employeeId: employee.id,
					fromDate: "2025-07-17",
					toDate: "2025-07-17",
				},
				ready,
			);
			expect(listed.ok).toBe(true);
			if (!listed.ok) return;
			expect(listed.data).toHaveLength(1);
		});

		it("resolves overnight session minutes across UTC boundary", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p07-ovn-sess",
			});
			await recordClockIn(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-ovn-cin",
					idempotencyKey: "idem-p07-ovn-cin",
					employeeId: employee.id,
					employmentId: employment.id,
					occurredAt: "2025-07-18T22:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-19",
				},
				ready,
			);
			await recordClockOut(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-ovn-cout",
					idempotencyKey: "idem-p07-ovn-cout",
					employeeId: employee.id,
					employmentId: employment.id,
					occurredAt: "2025-07-19T06:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-19",
				},
				ready,
			);

			const session = await resolveAttendanceSession(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-ovn-sess",
					idempotencyKey: "idem-p07-ovn-sess",
					employeeId: employee.id,
					localWorkDate: "2025-07-19",
					timezone: "Asia/Singapore",
				},
				ready,
			);
			expect(session.ok).toBe(true);
			if (!session.ok) return;
			expect(session.data.workedMinutes).toBe(480);
			expect(session.data.resolutionStatus).toBe("resolved");
			expect(session.data.firstClockInAt?.toISOString()).toBe(
				"2025-07-18T22:00:00.000Z",
			);
			expect(session.data.finalClockOutAt?.toISOString()).toBe(
				"2025-07-19T06:00:00.000Z",
			);
		});

		it("correctAttendanceEvent retains event id and records adjustment", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p07-correct",
			});
			const clockIn = await recordClockIn(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-correct-cin",
					idempotencyKey: "idem-p07-correct-cin",
					employeeId: employee.id,
					employmentId: employment.id,
					occurredAt: "2025-07-19T01:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-19",
				},
				ready,
			);
			expect(clockIn.ok).toBe(true);
			if (!clockIn.ok) return;
			const originalOccurredAt = clockIn.data.occurredAt.toISOString();

			const corrected = await correctAttendanceEvent(
				{
					organizationId: ORG,
					actorUserId: MANAGER,
					correlationId: "corr-p07-correct",
					eventId: clockIn.data.id,
					occurredAt: "2025-07-19T01:15:00.000Z",
					adjustmentReason: "badge misread",
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
				"2025-07-19T01:15:00.000Z",
			);
			expect(originalOccurredAt).toBe("2025-07-19T01:00:00.000Z");

			const fetched = await getAttendanceEvent(
				{
					organizationId: ORG,
					actorUserId: MANAGER,
					correlationId: "corr-p07-correct-get",
					eventId: clockIn.data.id,
				},
				ready,
			);
			expect(fetched.ok).toBe(true);
			if (!fetched.ok || fetched.data === null) return;
			expect(fetched.data.occurredAt.toISOString()).toBe(
				"2025-07-19T01:15:00.000Z",
			);
			expect(fetched.data.voidedAt).toBeNull();
		});

		it("generate, edit draft, submit, return, reopen, approve", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p07-ts-life",
			});
			await seedPublishedDayShift(ready, {
				suffix: "p07-ts",
				employeeId: employee.id,
				employmentId: employment.id,
				scheduledDate: "2025-07-21",
				startsAt: "2025-07-21T01:00:00.000Z",
				endsAt: "2025-07-21T09:00:00.000Z",
			});
			await recordClockIn(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-ts-cin",
					idempotencyKey: "idem-p07-ts-cin",
					employeeId: employee.id,
					employmentId: employment.id,
					occurredAt: "2025-07-21T01:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-21",
				},
				ready,
			);
			await recordClockOut(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-ts-cout",
					idempotencyKey: "idem-p07-ts-cout",
					employeeId: employee.id,
					employmentId: employment.id,
					occurredAt: "2025-07-21T09:00:00.000Z",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2025-07-21",
				},
				ready,
			);
			const session = await resolveAttendanceSession(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-ts-sess",
					idempotencyKey: "idem-p07-ts-sess",
					employeeId: employee.id,
					localWorkDate: "2025-07-21",
					timezone: "Asia/Singapore",
				},
				ready,
			);
			expect(session.ok).toBe(true);
			if (!session.ok) return;

			const timesheet = await createTimesheet(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-ts-create",
					idempotencyKey: "idem-p07-ts-create",
					employeeId: employee.id,
					employmentId: employment.id,
					periodStart: "2025-07-21",
					periodEnd: "2025-07-21",
				},
				ready,
			);
			expect(timesheet.ok).toBe(true);
			if (!timesheet.ok) return;

			const generated = await generateTimesheetEntries(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-ts-gen",
					timesheetId: timesheet.data.id,
					expectedVersion: timesheet.data.version,
				},
				ready,
			);
			expect(generated.ok).toBe(true);
			if (!generated.ok) return;
			expect(generated.data.entries.length).toBeGreaterThanOrEqual(1);
			const [entry] = generated.data.entries;
			if (!entry) throw new Error("Expected a generated timesheet entry");

			const edited = await updateTimesheetEntry(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-ts-edit",
					entryId: entry.id,
					recordedMinutes: 450,
					approvedMinutes: 450,
					costCenterId: "cost-center-ops",
					projectId: "project-erp",
					locationId: "location-kl",
					departmentId: "department-people",
					approvalReference: "approval-manager-2025-07-21",
					evidenceReference: "evidence-timesheet-2025-07-21",
					expectedVersion: entry.version,
				},
				ready,
			);
			expect(edited.ok).toBe(true);
			if (!edited.ok) return;
			expect(edited.data).toMatchObject({
				costCenterId: "cost-center-ops",
				projectId: "project-erp",
				locationId: "location-kl",
				departmentId: "department-people",
				approvalReference: "approval-manager-2025-07-21",
				evidenceReference: "evidence-timesheet-2025-07-21",
			});

			const submitted = await submitTimesheet(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-ts-submit",
					timesheetId: generated.data.timesheet.id,
					expectedVersion: generated.data.timesheet.version,
				},
				ready,
			);
			expect(submitted.ok).toBe(true);
			if (!submitted.ok) return;
			expect(submitted.data.status).toBe("submitted");

			const returned = await returnTimesheet(
				{
					organizationId: ORG,
					actorUserId: MANAGER,
					correlationId: "corr-p07-ts-return",
					timesheetId: submitted.data.id,
					approverNotes: "fix break minutes",
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
					correlationId: "corr-p07-ts-reopen",
					timesheetId: returned.data.id,
					expectedVersion: returned.data.version,
				},
				ready,
			);
			expect(reopened.ok).toBe(true);
			if (!reopened.ok) return;
			expect(reopened.data.status).toBe("draft");

			const reEdited = await updateTimesheetEntry(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-ts-reedit",
					entryId: edited.data.id,
					recordedMinutes: 480,
					approvedMinutes: 480,
					expectedVersion: edited.data.version,
				},
				ready,
			);
			expect(reEdited.ok).toBe(true);
			if (!reEdited.ok) return;

			const resubmitted = await submitTimesheet(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-ts-resubmit",
					timesheetId: reopened.data.id,
					expectedVersion: reopened.data.version,
				},
				ready,
			);
			expect(resubmitted.ok).toBe(true);
			if (!resubmitted.ok) return;
			await grantTimeApprovalAuthority(ready, {
				organizationId: ORG,
				targetActorUserId: MANAGER,
				authority: "line_manager",
				suffix: "p07-manager",
			});

			const approved = await approveTimesheet(
				{
					organizationId: ORG,
					actorUserId: MANAGER,
					correlationId: "corr-p07-ts-approve",
					authority: "line_manager",
					timesheetId: resubmitted.data.id,
					expectedVersion: resubmitted.data.version,
				},
				ready,
			);
			expect(approved.ok).toBe(true);
			if (!approved.ok) return;
			expect(approved.data.status).toBe("approved");
		});

		it("overtime request→approve→actual→verify keeps minute fields distinct", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p07-ot",
			});
			const requested = await createOvertimeRequest(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-ot-req",
					idempotencyKey: "idem-p07-ot-req",
					employeeId: employee.id,
					employmentId: employment.id,
					overtimeType: "weekday_overtime",
					requestedStartsAt: "2025-07-22T10:00:00.000Z",
					requestedEndsAt: "2025-07-22T12:00:00.000Z",
					requestedMinutes: 120,
					reason: "peak load",
				},
				ready,
			);
			expect(requested.ok).toBe(true);
			if (!requested.ok) return;
			expect(requested.data.requestedMinutes).toBe(120);

			const approved = await approveOvertimeRequest(
				{
					organizationId: ORG,
					actorUserId: MANAGER,
					correlationId: "corr-p07-ot-approve",
					requestId: requested.data.id,
					approvedMaximumMinutes: 90,
					expectedVersion: requested.data.version,
				},
				ready,
			);
			expect(approved.ok).toBe(true);
			if (!approved.ok) return;
			expect(approved.data.approvedMaximumMinutes).toBe(90);

			const worked = await recordOvertimeActual(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-ot-actual",
					requestId: approved.data.id,
					actualMinutes: 75,
					expectedVersion: approved.data.version,
				},
				ready,
			);
			expect(worked.ok).toBe(true);
			if (!worked.ok) return;
			expect(worked.data.actualMinutes).toBe(75);

			const verified = await verifyOvertimeRequest(
				{
					organizationId: ORG,
					actorUserId: MANAGER,
					correlationId: "corr-p07-ot-verify",
					requestId: worked.data.id,
					payrollApprovedMinutes: 60,
					expectedVersion: worked.data.version,
				},
				ready,
			);
			expect(verified.ok).toBe(true);
			if (!verified.ok) return;
			expect(verified.data.requestedMinutes).toBe(120);
			expect(verified.data.approvedMaximumMinutes).toBe(90);
			expect(verified.data.actualMinutes).toBe(75);
			expect(verified.data.payrollApprovedMinutes).toBe(60);
			expect(verified.data.status).toBe("verified");
			const minutes = [
				verified.data.requestedMinutes,
				verified.data.approvedMaximumMinutes,
				verified.data.actualMinutes,
				verified.data.payrollApprovedMinutes,
			];
			expect(new Set(minutes).size).toBe(4);
		});

		it("uses assignment timezone for schedule lookup when calendar differs", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p07-tz",
			});
			const calendar = await createWorkCalendar(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-tz-cal",
					idempotencyKey: "idem-p07-tz-cal",
					code: "TZ-P07",
					name: "Singapore Calendar",
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
					correlationId: "corr-p07-tz-cal-assign",
					employeeId: employee.id,
					employmentId: employment.id,
					calendarId: calendar.data.id,
					effectiveFrom: "2025-01-01",
				},
				ready,
			);
			expect(assignedCal.ok).toBe(true);

			const shift = await createShift(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-tz-shift",
					idempotencyKey: "idem-p07-tz-shift",
					code: "TZ-DAY",
					name: "LA Day",
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
					correlationId: "corr-p07-tz-act",
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
					correlationId: "corr-p07-tz-assign",
					idempotencyKey: "idem-p07-tz-assign",
					employeeId: employee.id,
					employmentId: employment.id,
					shiftId: shift.data.id,
					scheduledDate: "2025-07-23",
					startsAt: "2025-07-23T16:00:00.000Z",
					endsAt: "2025-07-24T00:00:00.000Z",
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
					correlationId: "corr-p07-tz-pub",
					assignmentId: assignment.data.id,
					expectedVersion: assignment.data.version,
				},
				ready,
			);
			expect(published.ok).toBe(true);
			if (!published.ok) return;
			expect(published.data.timezone).toBe("America/Los_Angeles");

			const scheduled = await getScheduledShiftForEmployeeDate(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-tz-sched",
					employeeId: employee.id,
					scheduledDate: "2025-07-23",
				},
				ready,
			);
			expect(scheduled.ok).toBe(true);
			if (!scheduled.ok || scheduled.data === null) return;
			expect(scheduled.data.id).toBe(published.data.id);
			expect(scheduled.data.timezone).toBe("America/Los_Angeles");

			const clockIn = await recordClockIn(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-tz-cin",
					idempotencyKey: "idem-p07-tz-cin",
					employeeId: employee.id,
					employmentId: employment.id,
					shiftAssignmentId: published.data.id,
					occurredAt: "2025-07-23T16:00:00.000Z",
					sourceTimezone: "America/Los_Angeles",
					localWorkDate: "2025-07-23",
				},
				ready,
			);
			expect(clockIn.ok).toBe(true);
			if (!clockIn.ok) return;
			expect(clockIn.data.sourceTimezone).toBe("America/Los_Angeles");
			expect(clockIn.data.localWorkDate).toBe("2025-07-23");
			expect(calendar.data.timezone).toBe("Asia/Singapore");
		});

		it("getApprovedTimeHandoff returns null until timesheet approved", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p07-payroll",
			});
			const timesheet = await createTimesheet(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-pay-create",
					idempotencyKey: "idem-p07-pay-create",
					employeeId: employee.id,
					employmentId: employment.id,
					periodStart: "2025-07-24",
					periodEnd: "2025-07-24",
				},
				ready,
			);
			expect(timesheet.ok).toBe(true);
			if (!timesheet.ok) return;

			const entry = await addTimesheetEntry(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-pay-entry",
					timesheetId: timesheet.data.id,
					employeeId: employee.id,
					workDate: "2025-07-24",
					timezone: "Asia/Singapore",
					sourceType: "manual",
					timeType: "regular",
					recordedMinutes: 480,
					approvedMinutes: 480,
				},
				ready,
			);
			expect(entry.ok).toBe(true);

			const draftHandoff = await getApprovedTimeHandoff(
				{
					organizationId: ORG,
					actorUserId: MANAGER,
					correlationId: "corr-p07-pay-draft",
					timesheetId: timesheet.data.id,
				},
				ready,
			);
			expect(draftHandoff.ok).toBe(true);
			if (!draftHandoff.ok) return;
			expect(draftHandoff.data).toBeNull();

			const current = await getTimesheet(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-pay-get",
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
					correlationId: "corr-p07-pay-submit",
					timesheetId: current.data.id,
					expectedVersion: current.data.version,
				},
				ready,
			);
			expect(submitted.ok).toBe(true);
			if (!submitted.ok) return;

			const submittedHandoff = await getApprovedTimeHandoff(
				{
					organizationId: ORG,
					actorUserId: MANAGER,
					correlationId: "corr-p07-pay-sub",
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
					actorUserId: MANAGER,
					correlationId: "corr-p07-pay-return",
					timesheetId: submitted.data.id,
					expectedVersion: submitted.data.version,
				},
				ready,
			);
			expect(returned.ok).toBe(true);
			if (!returned.ok) return;

			const returnedHandoff = await getApprovedTimeHandoff(
				{
					organizationId: ORG,
					actorUserId: MANAGER,
					correlationId: "corr-p07-pay-ret",
					timesheetId: returned.data.id,
				},
				ready,
			);
			expect(returnedHandoff.ok).toBe(true);
			if (!returnedHandoff.ok) return;
			expect(returnedHandoff.data).toBeNull();

			const resubmitted = await submitTimesheet(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-pay-resubmit",
					timesheetId: returned.data.id,
					expectedVersion: returned.data.version,
				},
				ready,
			);
			expect(resubmitted.ok).toBe(true);
			if (!resubmitted.ok) return;
			await grantTimeApprovalAuthority(ready, {
				organizationId: ORG,
				targetActorUserId: MANAGER,
				authority: "line_manager",
				suffix: "p07-pay-manager",
			});

			const approved = await approveTimesheet(
				{
					organizationId: ORG,
					actorUserId: MANAGER,
					correlationId: "corr-p07-pay-approve",
					authority: "line_manager",
					timesheetId: resubmitted.data.id,
					expectedVersion: resubmitted.data.version,
				},
				ready,
			);
			expect(approved.ok).toBe(true);
			if (!approved.ok) return;

			const handoff = await getApprovedTimeHandoff(
				{
					organizationId: ORG,
					actorUserId: MANAGER,
					correlationId: "corr-p07-pay-handoff",
					timesheetId: approved.data.id,
				},
				ready,
			);
			expect(handoff.ok).toBe(true);
			if (!handoff.ok || handoff.data === null) return;
			expect(handoff.data.regularMinutes).toBe(480);
		});

		it("rejects stale expectedVersion on timesheet submit", async () => {
			const ready = harness();
			const { employee, employment } = await seedEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "p07-stale",
			});
			const timesheet = await createTimesheet(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-stale-create",
					idempotencyKey: "idem-p07-stale-create",
					employeeId: employee.id,
					employmentId: employment.id,
					periodStart: "2025-07-25",
					periodEnd: "2025-07-25",
				},
				ready,
			);
			expect(timesheet.ok).toBe(true);
			if (!timesheet.ok) return;

			const entry = await addTimesheetEntry(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-stale-entry",
					timesheetId: timesheet.data.id,
					employeeId: employee.id,
					workDate: "2025-07-25",
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
					correlationId: "corr-p07-stale-get",
					timesheetId: timesheet.data.id,
				},
				ready,
			);
			expect(current.ok).toBe(true);
			if (!current.ok || current.data === null) return;

			const stale = await submitTimesheet(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-p07-stale-submit",
					timesheetId: current.data.id,
					expectedVersion: current.data.version - 1,
				},
				ready,
			);
			expect(stale.ok).toBe(false);
			if (stale.ok) return;
			expect(humanResourcesCodeFromResult(stale)).toBe(
				HUMAN_RESOURCES_ERROR_STALE_VERSION,
			);
		});
	});
});
