import { afterAll, describe, expect, it } from "vitest";

import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	HUMAN_RESOURCES_ERROR_STALE_VERSION,
} from "../src/error-codes";
import { createWorkCalendar, getWorkCalendar } from "../src/time/calendar";
import {
	approveOvertimeRequest,
	createOvertimeRequest,
	getOvertimeRequest,
	recordOvertimeActual,
	verifyOvertimeRequest,
} from "../src/time/overtime";
import { assignTimeApprovalAuthority } from "../src/time/policy";
import { assignShift } from "../src/time/scheduling";
import { activateShift, createShift } from "../src/time/shift";
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
import { createNeonOrgTracker } from "./helpers/neon-cleanup";
import { humanResourcesCodeFromResult } from "./helpers/result-details";
import {
	runDrizzleParity,
	STANDARD_WEEK,
	uniqueSuffix,
} from "./helpers/time-parity-shared";

function defineTimeSchedulingParitySuite(adapter: WorkforceStoreAdapter): void {
	const suffix = uniqueSuffix(adapter);
	const neonOrgs = createNeonOrgTracker();
	const ORG = neonOrgs.trackOrg(`org-hr-time-parity-${suffix}`);
	const ACTOR = `user-hr-time-parity-${suffix}`;
	const _MANAGER = `user-hr-time-mgr-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await neonOrgs.cleanup();
		}
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

		const managerAuthority = await assignTimeApprovalAuthority(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-overtime-manager-authority-${suffix}`,
				targetActorUserId: overtimeManager,
				authority: "line_manager",
				effectiveFrom: "2020-01-01",
			},
			ready,
		);
		expect(managerAuthority.ok).toBe(true);
		if (!managerAuthority.ok) return;

		const approved = await approveOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: overtimeManager,
				correlationId: `corr-overtime-approve-${suffix}`,
				requestedAuthority: "line_manager",
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
}

describe("human-resources.time.scheduling.parity (memory)", () => {
	defineTimeSchedulingParitySuite("memory");
});

describe.runIf(runDrizzleParity)(
	"human-resources.time.scheduling.parity (drizzle)",
	() => {
		defineTimeSchedulingParitySuite("drizzle");
	},
);
