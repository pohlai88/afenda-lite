/**
 * Memory vs Drizzle parity — HR Time / attendance.
 */

import { fail } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_TIME_TIMESHEET_APPROVAL_STEP_RECORDED_EVENT,
	HUMAN_RESOURCES_TIMESHEET_APPROVED_EVENT,
} from "@afenda/events/schemas";
import { afterAll, describe, expect, it } from "vitest";

import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	HUMAN_RESOURCES_ERROR_STALE_VERSION,
} from "../src/error-codes";
import {
	approveAttendanceBreakWaiver,
	listAttendanceBreakWaiverDecisions,
} from "../src/time/attendance/break-waivers";
import {
	listAttendanceEvents,
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
	assignEmploymentCalendar,
	createWorkCalendar,
} from "../src/time/calendar";
import {
	activateTimePolicy,
	assignTimeApprovalAuthority,
	assignTimePolicy,
	createTimePolicy,
	endTimeApprovalAuthorityAssignment,
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
} from "../src/time/shift";
import {
	approveTimesheet,
	createTimesheet,
	getTimesheet,
	listTimesheetApprovalDecisions,
	reopenTimesheet,
	returnTimesheet,
	submitTimesheet,
} from "../src/time/timesheet";
import type { AttendanceExceptionType } from "../src/types";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import { createNeonOrgTracker } from "./helpers/neon-cleanup";
import { humanResourcesCodeFromResult } from "./helpers/result-details";
import {
	runDrizzleParity,
	STANDARD_WEEK,
	uniqueSuffix,
} from "./helpers/time-parity-shared";

function defineTimeAttendanceParitySuite(adapter: WorkforceStoreAdapter): void {
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
}

describe("human-resources.time.attendance.parity (memory)", () => {
	defineTimeAttendanceParitySuite("memory");
});

describe.runIf(runDrizzleParity)(
	"human-resources.time.attendance.parity (drizzle)",
	() => {
		defineTimeAttendanceParitySuite("drizzle");
	},
);
