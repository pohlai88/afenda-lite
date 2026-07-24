import { afterAll, describe, expect, it } from "vitest";

import { createEmployee } from "../src/core/employee";
import { amendEmployment, createEmployment } from "../src/core/employment";
import { HUMAN_RESOURCES_ERROR_CONFLICT } from "../src/error-codes";
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
	recordBreakEnd,
	recordBreakStart,
	recordClockIn,
	recordClockOut,
} from "../src/time/attendance/events";
import {
	ATTENDANCE_SESSION_DETECTION_SOURCE,
	parseExceptionDetectionRemarks,
} from "../src/time/attendance/exception-detection";
import { listUnresolvedAttendanceExceptions } from "../src/time/attendance/exceptions";
import { resolveAttendanceSession } from "../src/time/attendance/sessions";
import {
	assignEmploymentCalendar,
	createWorkCalendar,
} from "../src/time/calendar";
import { getApprovedTimeHandoff } from "../src/time/handoff/approved-time-handoff";
import {
	activateTimePolicy,
	assignTimeApprovalAuthority,
	assignTimePolicy,
	createTimePolicy,
} from "../src/time/policy";
import { assignShift, publishShiftAssignment } from "../src/time/scheduling";
import { activateShift, createShift } from "../src/time/shift";
import {
	approveTimesheet,
	createTimesheet,
	generateTimesheetEntries,
	submitTimesheet,
} from "../src/time/timesheet";
import {
	parseAbsenceDetectionRemarks,
	TIMESHEET_GENERATION_ABSENCE_SOURCE,
} from "../src/time/timesheet-generation";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import { mapActorToEmployee } from "./helpers/identity-resolver";
import { createNeonOrgTracker } from "./helpers/neon-cleanup";
import { humanResourcesCodeFromResult } from "./helpers/result-details";
import { createStoreWorkCalendarLookup } from "./helpers/store-work-calendar-lookup";
import {
	ALL_ATTENDANCE_EXCEPTION_TYPES,
	ATTENDANCE_EXCEPTION_INVENTORY_IS_EXHAUSTIVE,
	ATTENDANCE_EXCEPTION_SEVERITY,
	runDrizzleParity,
	STANDARD_WEEK,
	uniqueSuffix,
} from "./helpers/time-parity-shared";

function defineTimeExceptionsParitySuite(adapter: WorkforceStoreAdapter): void {
	const suffix = uniqueSuffix(adapter);
	const neonOrgs = createNeonOrgTracker();
	const ORG = neonOrgs.trackOrg(`org-hr-time-parity-${suffix}`);
	const ACTOR = `user-hr-time-parity-${suffix}`;
	const MANAGER = `user-hr-time-mgr-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await neonOrgs.cleanup();
		}
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

describe("human-resources.time.exceptions.parity (memory)", () => {
	defineTimeExceptionsParitySuite("memory");
});

describe.runIf(runDrizzleParity)(
	"human-resources.time.exceptions.parity (drizzle)",
	() => {
		defineTimeExceptionsParitySuite("drizzle");
	},
);
