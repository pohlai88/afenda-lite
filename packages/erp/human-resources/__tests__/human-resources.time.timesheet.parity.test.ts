/**
 * Memory vs Drizzle parity — HR Time / timesheet.
 */

import { fail } from "@afenda/errors/result";
import { afterAll, describe, expect, it } from "vitest";

import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import {
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	HUMAN_RESOURCES_ERROR_STALE_VERSION,
} from "../src/error-codes";
import {
	correctAttendanceEvent,
	getAttendanceEvent,
	listAttendanceAdjustments,
	recordClockIn,
} from "../src/time/attendance/events";
import { getApprovedTimeHandoff } from "../src/time/handoff/approved-time-handoff";
import { assignTimeApprovalAuthority } from "../src/time/policy";
import {
	addTimesheetEntry,
	approveTimesheet,
	createTimesheet,
	generateTimesheetEntries,
	getTimesheet,
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
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { cleanupHumanResourcesNeonOrgs } from "./helpers/neon-cleanup";
import { humanResourcesCodeFromResult } from "./helpers/result-details";
import { runDrizzleParity, uniqueSuffix } from "./helpers/time-parity-shared";

function defineTimeTimesheetParitySuite(adapter: WorkforceStoreAdapter): void {
	const suffix = uniqueSuffix(adapter);
	const ORG = `org-hr-time-parity-${suffix}`;
	const ACTOR = `user-hr-time-parity-${suffix}`;
	const MANAGER = `user-hr-time-mgr-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await cleanupHumanResourcesNeonOrgs([ORG]);
		}
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
}

describe("human-resources.time.timesheet.parity (memory)", () => {
	defineTimeTimesheetParitySuite("memory");
});

describe.runIf(runDrizzleParity)(
	"human-resources.time.timesheet.parity (drizzle)",
	() => {
		defineTimeTimesheetParitySuite("drizzle");
	},
);
