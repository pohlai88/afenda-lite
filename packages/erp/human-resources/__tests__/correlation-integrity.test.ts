/**
 * Behavioral proof: caller-supplied correlationId reaches audit and outbox unchanged.
 */

import { describe, expect, it } from "vitest";

import {
	createDocumentRequirement,
	publishDocumentRequirement,
	retireDocumentRequirement,
	updateDocumentRequirement,
} from "../src/compliance/document-requirement";
import {
	markEmployeeDocumentExpired,
	registerEmployeeDocument,
	rejectEmployeeDocument,
	revokeEmployeeDocumentVerification,
	updateEmployeeDocumentMetadata,
	verifyEmployeeDocument,
} from "../src/compliance/employee-document";
import {
	acknowledgePolicy,
	issuePolicyAcknowledgementRequirement,
	revokePolicyAcknowledgement,
	supersedePolicyAcknowledgementRequirement,
} from "../src/compliance/policy-acknowledgement";
import {
	closeWorkEligibility,
	recordWorkEligibility,
	renewWorkEligibility,
	suspendWorkEligibility,
	verifyWorkEligibility,
} from "../src/compliance/work-eligibility";
import { createEmployee } from "../src/core/employee";
import {
	expireCertification,
	issueCertification,
	revokeCertification,
} from "../src/learning/certification";
import { recordCompletion } from "../src/learning/completion";
import { createCourse } from "../src/learning/course";
import { assignLearning } from "../src/learning/learning-assignment";
import {
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_CORRECT,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_RECORD,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_VOID,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENTS_IMPORT,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_CREATE,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_EXCUSE,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_REJECT,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_RESOLVE,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_REVIEW,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_SESSION_RESOLVE,
	HUMAN_RESOURCES_COMMAND_CERTIFICATION_EXPIRE,
	HUMAN_RESOURCES_COMMAND_CERTIFICATION_ISSUE,
	HUMAN_RESOURCES_COMMAND_CERTIFICATION_REVOKE,
	HUMAN_RESOURCES_COMMAND_COMPLETION_RECORD,
	HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_PUBLISH,
	HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_RETIRE,
	HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_UPDATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_MARK_EXPIRED,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REGISTER,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REJECT,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REVOKE_VERIFICATION,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_UPDATE_METADATA,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_VERIFY,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CALENDAR_ASSIGN,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CALENDAR_END,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_APPROVE,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_CANCEL,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_CREATE,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_RECORD_ACTUAL,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_REJECT,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_VERIFY,
	HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_ACKNOWLEDGE,
	HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_ISSUE,
	HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_REVOKE,
	HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_SHIFT_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGN,
	HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_CANCEL,
	HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_CHANGE,
	HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_COMPLETE,
	HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_PUBLISH,
	HUMAN_RESOURCES_COMMAND_SHIFT_BREAK_ADD,
	HUMAN_RESOURCES_COMMAND_SHIFT_BREAK_REMOVE,
	HUMAN_RESOURCES_COMMAND_SHIFT_CREATE,
	HUMAN_RESOURCES_COMMAND_SHIFT_DEACTIVATE,
	HUMAN_RESOURCES_COMMAND_SHIFT_UPDATE,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_APPROVE,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_CREATE,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_ADD,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_REMOVE,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_UPDATE,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_GENERATE_ENTRIES,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_LOCK,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_REJECT,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_REOPEN,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_RETURN,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_SUBMIT,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_CREATE,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_DATE_OVERRIDE_ADD,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_DATE_OVERRIDE_REMOVE,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_HOLIDAY_ADD,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_HOLIDAY_REMOVE,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_UPDATE,
	HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_CLOSE,
	HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_RECORD,
	HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_RENEW,
	HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_SUSPEND,
	HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_VERIFY,
	HUMAN_RESOURCES_TIME_COMMAND_IDS,
} from "../src/module-ids";
import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY } from "../src/mutation-emission-registry";
import { HUMAN_RESOURCES_PERMISSION_CODES } from "../src/permissions";
import { createProductionWorkCalendar } from "../src/production-work-calendar";
import { createMemoryHumanResourcesStore } from "../src/testing";
import {
	correctAttendanceEvent,
	recordClockIn,
	recordClockOut,
	voidAttendanceEvent,
} from "../src/time/attendance/events";
import {
	createAttendanceException,
	excuseAttendanceException,
	rejectAttendanceException,
	resolveAttendanceException,
	reviewAttendanceException,
} from "../src/time/attendance/exceptions";
import { importAttendanceEvents } from "../src/time/attendance/import";
import { resolveAttendanceSession } from "../src/time/attendance/sessions";
import {
	addCalendarDateOverride,
	addWorkCalendarHoliday,
	archiveWorkCalendar,
	assignEmploymentCalendar,
	createWorkCalendar,
	endWorkCalendarAssignment,
	removeCalendarDateOverride,
	removeWorkCalendarHoliday,
	updateWorkCalendar,
} from "../src/time/calendar";
import {
	approveOvertimeRequest,
	cancelOvertimeRequest,
	createOvertimeRequest,
	recordOvertimeActual,
	rejectOvertimeRequest,
	verifyOvertimeRequest,
} from "../src/time/overtime";
import { assignTimeApprovalAuthority } from "../src/time/policy";
import {
	assignShift,
	cancelShiftAssignment,
	changeShiftAssignment,
	completeShiftAssignment,
	publishShiftAssignment,
} from "../src/time/scheduling";
import {
	activateShift,
	addShiftBreak,
	createShift,
	deactivateShift,
	removeShiftBreak,
	updateShift,
} from "../src/time/shift";
import {
	addTimesheetEntry,
	approveTimesheet,
	createTimesheet,
	generateTimesheetEntries,
	getTimesheet,
	lockTimesheet,
	rejectTimesheet,
	removeTimesheetEntry,
	reopenTimesheet,
	returnTimesheet,
	submitTimesheet,
	supersedeTimesheet,
	updateTimesheetEntry,
} from "../src/time/timesheet";
import { createTestHumanResourcesCommandOptions } from "./helpers/command-options";
import { createStoreBackedIdentityResolver } from "./helpers/identity-resolver";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { createStoreWorkCalendarLookup } from "./helpers/store-work-calendar-lookup";
import {
	seedTimeCorrelationEmployeeEmployment,
	TIME_CORR_STANDARD_WEEK,
} from "./helpers/time-correlation-seed";

const ORG = "org-corr-integrity";
const ACTOR = "user-corr-integrity";
const MANAGER = "user-corr-manager";

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
			workCalendar: createProductionWorkCalendar({
				lookup: createStoreWorkCalendarLookup({ store }),
			}),
		}),
		store,
	};
}

function memoryPorts(ready: ReturnType<typeof harness>) {
	return ready.ports as ReturnType<typeof createMemoryMutationPorts>;
}

function clearPorts(ready: ReturnType<typeof harness>) {
	memoryPorts(ready).audit.calls.length = 0;
	memoryPorts(ready).outbox.calls.length = 0;
}

async function grantManagerTimeApprovalAuthority(
	ready: ReturnType<typeof harness>,
	suffix: string,
) {
	const assigned = await assignTimeApprovalAuthority(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `seed-authority-${suffix}`,
			targetActorUserId: MANAGER,
			authority: "line_manager",
			effectiveFrom: "2020-01-01",
		},
		ready,
	);
	expect(assigned.ok).toBe(true);
}

function assertCorrelationPropagated(
	ready: ReturnType<typeof harness>,
	correlationId: string,
	options: { expectOutbox: boolean; operation: string },
) {
	const ports = ready.ports as ReturnType<typeof createMemoryMutationPorts>;
	expect(ports.audit.calls.length).toBeGreaterThan(0);
	for (const call of ports.audit.calls) {
		expect(call.correlationId).toBe(correlationId);
		expect(call.correlationId).not.toBe(options.operation);
	}
	if (options.expectOutbox) {
		expect(ports.outbox.calls.length).toBeGreaterThan(0);
		for (const call of ports.outbox.calls) {
			expect(call.correlationId).toBe(correlationId);
			expect(call.payload.correlationId).toBe(correlationId);
			if (typeof call.payload.operation === "string") {
				expect(call.payload.operation).toBe(options.operation);
			}
		}
	}
}

describe("correlation integrity", () => {
	it("covers every emission-registry command with a fixture", () => {
		const covered = new Set([
			HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE,
			HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_CREATE,
			HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_UPDATE,
			HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_PUBLISH,
			HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_RETIRE,
			HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REGISTER,
			HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_UPDATE_METADATA,
			HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_VERIFY,
			HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REJECT,
			HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REVOKE_VERIFICATION,
			HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_MARK_EXPIRED,
			HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_RECORD,
			HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_VERIFY,
			HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_SUSPEND,
			HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_RENEW,
			HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_CLOSE,
			HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_ISSUE,
			HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_ACKNOWLEDGE,
			HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_REVOKE,
			HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_SUPERSEDE,
			HUMAN_RESOURCES_COMMAND_CERTIFICATION_ISSUE,
			HUMAN_RESOURCES_COMMAND_CERTIFICATION_EXPIRE,
			HUMAN_RESOURCES_COMMAND_CERTIFICATION_REVOKE,
			HUMAN_RESOURCES_COMMAND_COMPLETION_RECORD,
			HUMAN_RESOURCES_COMMAND_TIMESHEET_APPROVE,
			...HUMAN_RESOURCES_TIME_COMMAND_IDS,
		]);
		for (const entry of HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY) {
			expect(covered.has(entry.command)).toBe(true);
		}
	});

	it("propagates correlationId for employee create (domain_event)", async () => {
		const ready = harness();
		const correlationId = "trace-employee-create";
		const created = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId,
				idempotencyKey: "idem-emp-corr",
				employeeNumber: "E-CORR-1",
				legalName: "Corr Worker",
			},
			ready,
		);
		expect(created.ok).toBe(true);
		assertCorrelationPropagated(ready, correlationId, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE,
		});
	});

	it("propagates correlationId across compliance mutations", async () => {
		const ready = harness();
		const emp = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-emp",
				idempotencyKey: "idem-seed-emp",
				employeeNumber: "E-CORR-2",
				legalName: "Compliance Corr",
			},
			ready,
		);
		expect(emp.ok).toBe(true);
		if (!emp.ok) return;

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;

		const reqCorr = "trace-req-create";
		const req = await createDocumentRequirement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: reqCorr,
				code: "PASS-CORR",
				name: "Passport Corr",
				documentType: "passport",
			},
			ready,
		);
		expect(req.ok).toBe(true);
		if (!req.ok) return;
		assertCorrelationPropagated(ready, reqCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_CREATE,
		});

		memoryPorts(ready).audit.calls.length = 0;
		const updCorr = "trace-req-update";
		const updated = await updateDocumentRequirement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: updCorr,
				requirementId: req.data.id,
				name: "Passport Corr Updated",
				expectedVersion: req.data.version,
			},
			ready,
		);
		expect(updated.ok).toBe(true);
		if (!updated.ok) return;
		assertCorrelationPropagated(ready, updCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_UPDATE,
		});

		memoryPorts(ready).audit.calls.length = 0;
		const pubCorr = "trace-req-publish";
		const published = await publishDocumentRequirement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: pubCorr,
				requirementId: updated.data.id,
				expectedVersion: updated.data.version,
			},
			ready,
		);
		expect(published.ok).toBe(true);
		if (!published.ok) return;
		assertCorrelationPropagated(ready, pubCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_PUBLISH,
		});

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const regCorr = "trace-doc-register";
		const registered = await registerEmployeeDocument(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: regCorr,
				employeeId: emp.data.id,
				requirementId: published.data.id,
				documentType: "passport",
				issuedOn: "2026-01-01",
				expiresOn: "2030-01-01",
				documentRef: "vault://passport/corr",
				documentIdentifier: "XY 9999 1111",
				idempotencyKey: "idem-doc-corr",
			},
			ready,
		);
		expect(registered.ok).toBe(true);
		if (!registered.ok) return;
		assertCorrelationPropagated(ready, regCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REGISTER,
		});
		expect(
			memoryPorts(ready).audit.calls.some(
				(call) =>
					call.changes.length > 0 ||
					(call.newValue !== undefined && call.newValue !== null),
			),
		).toBe(true);
		for (const call of memoryPorts(ready).audit.calls) {
			const snap = JSON.stringify(call.newValue ?? {});
			expect(snap).not.toContain("vault://passport/corr");
		}

		memoryPorts(ready).audit.calls.length = 0;
		const metaCorr = "trace-doc-meta";
		const metaUpdated = await updateEmployeeDocumentMetadata(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: metaCorr,
				documentId: registered.data.id,
				issuingJurisdiction: "US",
				expectedVersion: registered.data.version,
			},
			ready,
		);
		expect(metaUpdated.ok).toBe(true);
		if (!metaUpdated.ok) return;
		assertCorrelationPropagated(ready, metaCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_UPDATE_METADATA,
		});

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const verifyCorr = "trace-doc-verify";
		const verified = await verifyEmployeeDocument(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: verifyCorr,
				documentId: metaUpdated.data.id,
				evidenceDate: "2026-02-01",
				expectedVersion: metaUpdated.data.version,
			},
			ready,
		);
		expect(verified.ok).toBe(true);
		if (!verified.ok) return;
		assertCorrelationPropagated(ready, verifyCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_VERIFY,
		});

		memoryPorts(ready).audit.calls.length = 0;
		const revokeCorr = "trace-doc-revoke-ver";
		const revokedVer = await revokeEmployeeDocumentVerification(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: revokeCorr,
				documentId: verified.data.id,
				expectedVersion: verified.data.version,
			},
			ready,
		);
		expect(revokedVer.ok).toBe(true);
		if (!revokedVer.ok) return;
		assertCorrelationPropagated(ready, revokeCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REVOKE_VERIFICATION,
		});

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const rejectSeed = await registerEmployeeDocument(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "trace-doc-reject-seed",
				employeeId: emp.data.id,
				documentType: "drivers-license",
				issuedOn: "2026-01-01",
				expiresOn: "2030-01-01",
				documentRef: "vault://license/corr",
				idempotencyKey: "idem-doc-reject",
			},
			ready,
		);
		expect(rejectSeed.ok).toBe(true);
		if (!rejectSeed.ok) return;

		memoryPorts(ready).audit.calls.length = 0;
		const rejectCorr = "trace-doc-reject";
		const rejected = await rejectEmployeeDocument(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: rejectCorr,
				documentId: rejectSeed.data.id,
				rejectionReason: "illegible",
				expectedVersion: rejectSeed.data.version,
			},
			ready,
		);
		expect(rejected.ok).toBe(true);
		if (!rejected.ok) return;
		assertCorrelationPropagated(ready, rejectCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REJECT,
		});

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const reg2 = await registerEmployeeDocument(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "trace-doc-reg2",
				employeeId: emp.data.id,
				documentType: "visa",
				issuedOn: "2026-01-01",
				expiresOn: "2026-06-01",
				documentRef: "vault://visa/corr",
				idempotencyKey: "idem-doc-corr-2",
			},
			ready,
		);
		expect(reg2.ok).toBe(true);
		if (!reg2.ok) return;

		memoryPorts(ready).audit.calls.length = 0;
		const expireCorr = "trace-doc-expire";
		const expired = await markEmployeeDocumentExpired(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: expireCorr,
				documentId: reg2.data.id,
				expectedVersion: reg2.data.version,
			},
			ready,
		);
		expect(expired.ok).toBe(true);
		assertCorrelationPropagated(ready, expireCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_MARK_EXPIRED,
		});

		memoryPorts(ready).audit.calls.length = 0;
		const retireCorr = "trace-req-retire";
		const retired = await retireDocumentRequirement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: retireCorr,
				requirementId: published.data.id,
				expectedVersion: published.data.version,
			},
			ready,
		);
		expect(retired.ok).toBe(true);
		assertCorrelationPropagated(ready, retireCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_RETIRE,
		});
	});

	it("propagates correlationId across work-eligibility mutations", async () => {
		const ready = harness();
		const emp = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-we",
				idempotencyKey: "idem-seed-we",
				employeeNumber: "E-CORR-WE",
				legalName: "Eligibility Corr",
			},
			ready,
		);
		expect(emp.ok).toBe(true);
		if (!emp.ok) return;

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const recordCorr = "trace-we-record";
		const recorded = await recordWorkEligibility(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: recordCorr,
				employeeId: emp.data.id,
				countryCode: "US",
				issuedOn: "2026-01-01",
				expiresOn: "2027-01-01",
				idempotencyKey: "idem-we-corr",
			},
			ready,
		);
		expect(recorded.ok).toBe(true);
		if (!recorded.ok) return;
		assertCorrelationPropagated(ready, recordCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_RECORD,
		});

		memoryPorts(ready).audit.calls.length = 0;
		const verifyCorr = "trace-we-verify";
		const verified = await verifyWorkEligibility(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: verifyCorr,
				eligibilityId: recorded.data.id,
				evidenceDate: "2026-01-15",
				expectedVersion: recorded.data.version,
			},
			ready,
		);
		expect(verified.ok).toBe(true);
		if (!verified.ok) return;
		assertCorrelationPropagated(ready, verifyCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_VERIFY,
		});

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const suspendCorr = "trace-we-suspend";
		const suspended = await suspendWorkEligibility(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: suspendCorr,
				eligibilityId: verified.data.id,
				expectedVersion: verified.data.version,
			},
			ready,
		);
		expect(suspended.ok).toBe(true);
		if (!suspended.ok) return;
		assertCorrelationPropagated(ready, suspendCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_SUSPEND,
		});

		memoryPorts(ready).audit.calls.length = 0;
		const renewCorr = "trace-we-renew";
		const renewed = await renewWorkEligibility(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: renewCorr,
				eligibilityId: suspended.data.id,
				issuedOn: "2026-02-01",
				expiresOn: "2028-01-01",
				expectedVersion: suspended.data.version,
			},
			ready,
		);
		expect(renewed.ok).toBe(true);
		if (!renewed.ok) return;
		assertCorrelationPropagated(ready, renewCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_RENEW,
		});

		memoryPorts(ready).audit.calls.length = 0;
		const closeCorr = "trace-we-close";
		const closed = await closeWorkEligibility(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: closeCorr,
				eligibilityId: renewed.data.id,
				expectedVersion: renewed.data.version,
			},
			ready,
		);
		expect(closed.ok).toBe(true);
		assertCorrelationPropagated(ready, closeCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_CLOSE,
		});
	});

	it("propagates correlationId across policy acknowledgement mutations", async () => {
		const ready = harness();
		const emp = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-pol",
				idempotencyKey: "idem-seed-pol",
				employeeNumber: "E-CORR-POL",
				legalName: "Policy Corr",
			},
			ready,
		);
		expect(emp.ok).toBe(true);
		if (!emp.ok) return;

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const issueCorr = "trace-pol-issue";
		const issued = await issuePolicyAcknowledgementRequirement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: issueCorr,
				employeeId: emp.data.id,
				policyCode: "CODE-OF-CONDUCT",
				policyVersion: "v1",
				idempotencyKey: "idem-pol-corr",
			},
			ready,
		);
		expect(issued.ok).toBe(true);
		if (!issued.ok) return;
		assertCorrelationPropagated(ready, issueCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_ISSUE,
		});

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const ackCorr = "trace-pol-ack";
		const ack = await acknowledgePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: ackCorr,
				acknowledgementId: issued.data.id,
				expectedVersion: issued.data.version,
			},
			ready,
		);
		expect(ack.ok).toBe(true);
		if (!ack.ok) return;
		assertCorrelationPropagated(ready, ackCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_ACKNOWLEDGE,
		});

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const issue2 = await issuePolicyAcknowledgementRequirement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "trace-pol-issue-2",
				employeeId: emp.data.id,
				policyCode: "SAFETY",
				policyVersion: "v1",
				idempotencyKey: "idem-pol-corr-2",
			},
			ready,
		);
		expect(issue2.ok).toBe(true);
		if (!issue2.ok) return;

		memoryPorts(ready).audit.calls.length = 0;
		const revokeCorr = "trace-pol-revoke";
		const revoked = await revokePolicyAcknowledgement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: revokeCorr,
				acknowledgementId: issue2.data.id,
				expectedVersion: issue2.data.version,
			},
			ready,
		);
		expect(revoked.ok).toBe(true);
		if (!revoked.ok) return;
		assertCorrelationPropagated(ready, revokeCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_REVOKE,
		});

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const issue3 = await issuePolicyAcknowledgementRequirement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "trace-pol-issue-3",
				employeeId: emp.data.id,
				policyCode: "PRIVACY",
				policyVersion: "v1",
				idempotencyKey: "idem-pol-corr-3",
			},
			ready,
		);
		expect(issue3.ok).toBe(true);
		if (!issue3.ok) return;

		memoryPorts(ready).audit.calls.length = 0;
		const supersedeCorr = "trace-pol-supersede";
		const superseded = await supersedePolicyAcknowledgementRequirement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: supersedeCorr,
				acknowledgementId: issue3.data.id,
				newPolicyVersion: "v2",
				expectedVersion: issue3.data.version,
			},
			ready,
		);
		expect(superseded.ok).toBe(true);
		assertCorrelationPropagated(ready, supersedeCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_SUPERSEDE,
		});
	});

	it("propagates correlationId across certification mutations", async () => {
		const ready = harness();
		const emp = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-cert",
				idempotencyKey: "idem-seed-cert",
				employeeNumber: "E-CORR-CERT",
				legalName: "Cert Corr",
			},
			ready,
		);
		expect(emp.ok).toBe(true);
		if (!emp.ok) return;

		const course = await createCourse(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-course",
				code: "COURSE-CORR",
				title: "Safety Course",
				idempotencyKey: "idem-course-corr",
			},
			ready,
		);
		expect(course.ok).toBe(true);
		if (!course.ok) return;

		const assignment = await assignLearning(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-assign",
				employeeId: emp.data.id,
				courseId: course.data.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) return;

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const completionCorr = "trace-completion";
		const completion = await recordCompletion(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: completionCorr,
				assignmentId: assignment.data.id,
				employeeId: emp.data.id,
				courseId: course.data.id,
				sessionId: null,
				completedAt: "2026-03-01T12:00:00Z",
				outcome: "passed",
				assessorUserId: null,
				notes: null,
				idempotencyKey: "idem-completion-corr",
			},
			ready,
		);
		expect(completion.ok).toBe(true);
		if (!completion.ok) return;
		assertCorrelationPropagated(ready, completionCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_COMPLETION_RECORD,
		});

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const issueCorr = "trace-cert-issue";
		const issued = await issueCertification(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: issueCorr,
				employeeId: emp.data.id,
				courseId: course.data.id,
				completionId: completion.data.id,
				certificationCode: "CERT-CORR",
				issuedOn: "2026-03-02",
				expiresOn: "2027-03-02",
				idempotencyKey: "idem-cert-corr",
			},
			ready,
		);
		expect(issued.ok).toBe(true);
		if (!issued.ok) return;
		assertCorrelationPropagated(ready, issueCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_CERTIFICATION_ISSUE,
		});
		expect(memoryPorts(ready).audit.calls[0]?.changes.length).toBeGreaterThan(
			0,
		);

		memoryPorts(ready).audit.calls.length = 0;
		const expireCorr = "trace-cert-expire";
		const expired = await expireCertification(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: expireCorr,
				certificationId: issued.data.id,
				expectedVersion: issued.data.version,
			},
			ready,
		);
		expect(expired.ok).toBe(true);
		if (!expired.ok) return;
		assertCorrelationPropagated(ready, expireCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_CERTIFICATION_EXPIRE,
		});

		const assignment2 = await assignLearning(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-assign-2",
				employeeId: emp.data.id,
				courseId: course.data.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignment2.ok).toBe(true);
		if (!assignment2.ok) return;

		const completion2 = await recordCompletion(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-completion-2",
				assignmentId: assignment2.data.id,
				employeeId: emp.data.id,
				courseId: course.data.id,
				sessionId: null,
				completedAt: "2026-04-01T12:00:00Z",
				outcome: "passed",
				assessorUserId: null,
				notes: null,
				idempotencyKey: "idem-completion-corr-2",
			},
			ready,
		);
		expect(completion2.ok).toBe(true);
		if (!completion2.ok) return;

		const issued2 = await issueCertification(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-cert-2",
				employeeId: emp.data.id,
				courseId: course.data.id,
				completionId: completion2.data.id,
				certificationCode: "CERT-CORR-2",
				issuedOn: "2026-04-02",
				idempotencyKey: "idem-cert-corr-2",
			},
			ready,
		);
		expect(issued2.ok).toBe(true);
		if (!issued2.ok) return;

		memoryPorts(ready).audit.calls.length = 0;
		const revokeCorr = "trace-cert-revoke";
		const revoked = await revokeCertification(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: revokeCorr,
				certificationId: issued2.data.id,
				expectedVersion: issued2.data.version,
			},
			ready,
		);
		expect(revoked.ok).toBe(true);
		assertCorrelationPropagated(ready, revokeCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_CERTIFICATION_REVOKE,
		});
	});

	it("does not double-emit outbox on idempotent document register replay", async () => {
		const ready = harness();
		const emp = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-idem",
				idempotencyKey: "idem-seed-idem",
				employeeNumber: "E-CORR-IDEM",
				legalName: "Idem Corr",
			},
			ready,
		);
		expect(emp.ok).toBe(true);
		if (!emp.ok) return;

		const payload = {
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: "trace-idem-reg",
			employeeId: emp.data.id,
			documentType: "passport",
			issuedOn: "2026-01-01",
			expiresOn: "2030-01-01",
			documentRef: "vault://passport/idem",
			idempotencyKey: "idem-doc-replay",
		};

		memoryPorts(ready).outbox.calls.length = 0;
		const first = await registerEmployeeDocument(payload, ready);
		expect(first.ok).toBe(true);
		const outboxAfterFirst = memoryPorts(ready).outbox.calls.length;
		expect(outboxAfterFirst).toBeGreaterThan(0);

		const replay = await registerEmployeeDocument(
			{ ...payload, correlationId: "trace-idem-reg-replay" },
			ready,
		);
		expect(replay.ok).toBe(true);
		expect(memoryPorts(ready).outbox.calls.length).toBe(outboxAfterFirst);
	});

	it("propagates correlationId for timesheet approve (domain_event)", async () => {
		const ready = harness();
		const { employee, employment } =
			await seedTimeCorrelationEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "ts-legacy",
			});

		const timesheet = await createTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-ts-create",
				idempotencyKey: "idem-ts-corr",
				employeeId: employee.id,
				employmentId: employment.id,
				periodStart: "2025-07-01",
				periodEnd: "2025-07-07",
			},
			ready,
		);
		expect(timesheet.ok).toBe(true);
		if (!timesheet.ok) return;

		const submitted = await submitTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-ts-submit",
				timesheetId: timesheet.data.id,
				expectedVersion: timesheet.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) return;

		await grantManagerTimeApprovalAuthority(ready, "legacy");
		clearPorts(ready);
		const approveCorr = "trace-timesheet-approve";
		const approved = await approveTimesheet(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: approveCorr,
				authority: "line_manager",
				timesheetId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;
		assertCorrelationPropagated(ready, approveCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_APPROVE,
		});
	});

	it("propagates correlationId across time domain_event mutations", async () => {
		const ready = harness();
		const { employee, employment } =
			await seedTimeCorrelationEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "time-domain",
			});

		const calendar = await createWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-domain-cal",
				idempotencyKey: "idem-time-domain-cal",
				code: "CORR-TIME",
				name: "Corr Time Calendar",
				timezone: "Asia/Singapore",
				calendarVersion: "v1",
				workWeek: TIME_CORR_STANDARD_WEEK,
				standardHoursPerDay: "8.00",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(calendar.ok).toBe(true);
		if (!calendar.ok) return;

		const calendarAssigned = await assignEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-domain-cal-assign",
				employeeId: employee.id,
				employmentId: employment.id,
				calendarId: calendar.data.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(calendarAssigned.ok).toBe(true);
		if (!calendarAssigned.ok) return;

		const shift = await createShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-domain-shift",
				idempotencyKey: "idem-time-domain-shift",
				code: "CORR-DAY",
				name: "Corr Day",
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

		const activatedShift = await activateShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-domain-shift-act",
				shiftId: shift.data.id,
				expectedVersion: shift.data.version,
			},
			ready,
		);
		expect(activatedShift.ok).toBe(true);
		if (!activatedShift.ok) return;

		const assignment = await assignShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-domain-assign",
				idempotencyKey: "idem-time-domain-assign",
				employeeId: employee.id,
				employmentId: employment.id,
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

		clearPorts(ready);
		const publishCorr = "trace-time-publish";
		const published = await publishShiftAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: publishCorr,
				assignmentId: assignment.data.id,
				expectedVersion: assignment.data.version,
			},
			ready,
		);
		expect(published.ok).toBe(true);
		if (!published.ok) return;
		assertCorrelationPropagated(ready, publishCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_PUBLISH,
		});

		clearPorts(ready);
		const clockCorr = "trace-time-clock-in";
		const clockIn = await recordClockIn(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: clockCorr,
				idempotencyKey: "idem-time-clock-in",
				employeeId: employee.id,
				employmentId: employment.id,
				occurredAt: "2025-07-01T01:05:00.000Z",
				sourceTimezone: "Asia/Singapore",
				localWorkDate: "2025-07-01",
			},
			ready,
		);
		expect(clockIn.ok).toBe(true);
		if (!clockIn.ok) return;
		assertCorrelationPropagated(ready, clockCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_RECORD,
		});

		clearPorts(ready);
		const correctCorr = "trace-time-correct";
		const corrected = await correctAttendanceEvent(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: correctCorr,
				eventId: clockIn.data.id,
				occurredAt: "2025-07-01T01:10:00.000Z",
				adjustmentReason: "corrected arrival",
				expectedVersion: clockIn.data.version,
			},
			ready,
		);
		expect(corrected.ok).toBe(true);
		if (!corrected.ok) return;
		assertCorrelationPropagated(ready, correctCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_CORRECT,
		});

		clearPorts(ready);
		const exceptionCorr = "trace-time-exception";
		const exception = await createAttendanceException(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: exceptionCorr,
				employeeId: employee.id,
				exceptionType: "absence",
				severity: "critical",
				remarks: "missing punch",
			},
			ready,
		);
		expect(exception.ok).toBe(true);
		if (!exception.ok) return;
		assertCorrelationPropagated(ready, exceptionCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_CREATE,
		});

		const timesheet = await createTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-domain-ts",
				idempotencyKey: "idem-time-domain-ts",
				employeeId: employee.id,
				employmentId: employment.id,
				periodStart: "2025-07-01",
				periodEnd: "2025-07-07",
			},
			ready,
		);
		expect(timesheet.ok).toBe(true);
		if (!timesheet.ok) return;

		clearPorts(ready);
		const submitCorr = "trace-time-submit";
		const submitted = await submitTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: submitCorr,
				timesheetId: timesheet.data.id,
				expectedVersion: timesheet.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) return;
		assertCorrelationPropagated(ready, submitCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_SUBMIT,
		});

		const returned = await returnTimesheet(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "seed-time-return-for-reopen",
				timesheetId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(returned.ok).toBe(true);
		if (!returned.ok) return;

		clearPorts(ready);
		const reopenCorr = "trace-time-reopen";
		const reopened = await reopenTimesheet(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: reopenCorr,
				timesheetId: returned.data.id,
				expectedVersion: returned.data.version,
			},
			ready,
		);
		expect(reopened.ok).toBe(true);
		if (!reopened.ok) return;
		assertCorrelationPropagated(ready, reopenCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_REOPEN,
		});

		clearPorts(ready);
		const resubmitCorr = "trace-time-resubmit";
		const resubmitted = await submitTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: resubmitCorr,
				timesheetId: reopened.data.id,
				expectedVersion: reopened.data.version,
			},
			ready,
		);
		expect(resubmitted.ok).toBe(true);
		if (!resubmitted.ok) return;
		assertCorrelationPropagated(ready, resubmitCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_SUBMIT,
		});

		await grantManagerTimeApprovalAuthority(ready, "domain");
		clearPorts(ready);
		const approveCorr = "trace-time-approve";
		const approved = await approveTimesheet(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: approveCorr,
				authority: "line_manager",
				timesheetId: resubmitted.data.id,
				expectedVersion: resubmitted.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;
		assertCorrelationPropagated(ready, approveCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_APPROVE,
		});

		clearPorts(ready);
		const lockCorr = "trace-time-lock";
		const locked = await lockTimesheet(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: lockCorr,
				timesheetId: approved.data.id,
				expectedVersion: approved.data.version,
			},
			ready,
		);
		expect(locked.ok).toBe(true);
		if (!locked.ok) return;
		assertCorrelationPropagated(ready, lockCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_LOCK,
		});
		expect(memoryPorts(ready).outbox.calls.length).toBeGreaterThanOrEqual(2);
		expect(
			memoryPorts(ready).outbox.calls.some((call) =>
				call.type.includes("timesheet.locked"),
			),
		).toBe(true);
		expect(
			memoryPorts(ready).outbox.calls.some((call) =>
				call.type.includes("payroll_handoff"),
			),
		).toBe(true);

		const overtimeRequest = await createOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-ot",
				idempotencyKey: "idem-time-ot",
				employeeId: employee.id,
				employmentId: employment.id,
				overtimeType: "weekday_overtime",
				requestedStartsAt: "2025-07-02T10:00:00.000Z",
				requestedEndsAt: "2025-07-02T12:00:00.000Z",
				requestedMinutes: 120,
				reason: "release crunch",
			},
			ready,
		);
		expect(overtimeRequest.ok).toBe(true);
		if (!overtimeRequest.ok) return;

		clearPorts(ready);
		const otApproveCorr = "trace-time-ot-approve";
		const otApproved = await approveOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: otApproveCorr,
				requestId: overtimeRequest.data.id,
				approvedMaximumMinutes: 120,
				expectedVersion: overtimeRequest.data.version,
			},
			ready,
		);
		expect(otApproved.ok).toBe(true);
		if (!otApproved.ok) return;
		assertCorrelationPropagated(ready, otApproveCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_APPROVE,
		});
	});

	it("propagates correlationId across time audit_only mutations", async () => {
		const ready = harness();
		const { employee, employment } =
			await seedTimeCorrelationEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "time-audit",
			});

		clearPorts(ready);
		const calCreateCorr = "trace-time-cal-create";
		const calendar = await createWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: calCreateCorr,
				idempotencyKey: "idem-time-audit-cal",
				code: "AUDIT-CAL",
				name: "Audit Calendar",
				timezone: "Asia/Singapore",
				calendarVersion: "v1",
				workWeek: TIME_CORR_STANDARD_WEEK,
				standardHoursPerDay: "8.00",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(calendar.ok).toBe(true);
		if (!calendar.ok) return;
		assertCorrelationPropagated(ready, calCreateCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_CREATE,
		});

		clearPorts(ready);
		const calUpdateCorr = "trace-time-cal-update";
		const updatedCalendar = await updateWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: calUpdateCorr,
				calendarId: calendar.data.id,
				name: "Audit Calendar Updated",
				expectedVersion: calendar.data.version,
			},
			ready,
		);
		expect(updatedCalendar.ok).toBe(true);
		if (!updatedCalendar.ok) return;
		assertCorrelationPropagated(ready, calUpdateCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_UPDATE,
		});

		clearPorts(ready);
		const holidayAddCorr = "trace-time-holiday-add";
		const holiday = await addWorkCalendarHoliday(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: holidayAddCorr,
				calendarId: updatedCalendar.data.id,
				holidayDate: "2025-07-04",
				label: "Independence Day",
			},
			ready,
		);
		expect(holiday.ok).toBe(true);
		if (!holiday.ok) return;
		assertCorrelationPropagated(ready, holidayAddCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_HOLIDAY_ADD,
		});

		clearPorts(ready);
		const overrideAddCorr = "trace-time-override-add";
		const override = await addCalendarDateOverride(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: overrideAddCorr,
				calendarId: updatedCalendar.data.id,
				holidayDate: "2025-07-05",
				overrideKind: "shortened_day",
				isWorkingDay: true,
				expectedMinutes: 240,
				label: "Half day",
			},
			ready,
		);
		expect(override.ok).toBe(true);
		if (!override.ok) return;
		assertCorrelationPropagated(ready, overrideAddCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_DATE_OVERRIDE_ADD,
		});

		clearPorts(ready);
		const overrideRemoveCorr = "trace-time-override-remove";
		const overrideRemoved = await removeCalendarDateOverride(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: overrideRemoveCorr,
				holidayId: override.data.id,
			},
			ready,
		);
		expect(overrideRemoved.ok).toBe(true);
		if (!overrideRemoved.ok) return;
		assertCorrelationPropagated(ready, overrideRemoveCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_DATE_OVERRIDE_REMOVE,
		});

		clearPorts(ready);
		const holidayRemoveCorr = "trace-time-holiday-remove";
		const holidayRemoved = await removeWorkCalendarHoliday(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: holidayRemoveCorr,
				holidayId: holiday.data.id,
			},
			ready,
		);
		expect(holidayRemoved.ok).toBe(true);
		if (!holidayRemoved.ok) return;
		assertCorrelationPropagated(ready, holidayRemoveCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_HOLIDAY_REMOVE,
		});

		clearPorts(ready);
		const calAssignCorr = "trace-time-cal-assign";
		const calendarAssignment = await assignEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: calAssignCorr,
				employeeId: employee.id,
				employmentId: employment.id,
				calendarId: updatedCalendar.data.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(calendarAssignment.ok).toBe(true);
		if (!calendarAssignment.ok) return;
		assertCorrelationPropagated(ready, calAssignCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CALENDAR_ASSIGN,
		});

		clearPorts(ready);
		const calEndCorr = "trace-time-cal-end";
		const calendarEnded = await endWorkCalendarAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: calEndCorr,
				assignmentId: calendarAssignment.data.id,
				effectiveTo: "2025-12-31",
				expectedVersion: calendarAssignment.data.version,
			},
			ready,
		);
		expect(calendarEnded.ok).toBe(true);
		if (!calendarEnded.ok) return;
		assertCorrelationPropagated(ready, calEndCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CALENDAR_END,
		});

		clearPorts(ready);
		const calArchiveCorr = "trace-time-cal-archive";
		const archivedCalendar = await archiveWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: calArchiveCorr,
				calendarId: updatedCalendar.data.id,
				expectedVersion: updatedCalendar.data.version,
			},
			ready,
		);
		expect(archivedCalendar.ok).toBe(true);
		if (!archivedCalendar.ok) return;
		assertCorrelationPropagated(ready, calArchiveCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_ARCHIVE,
		});

		clearPorts(ready);
		const shiftCreateCorr = "trace-time-shift-create";
		const shift = await createShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: shiftCreateCorr,
				idempotencyKey: "idem-time-audit-shift",
				code: "AUDIT-SHIFT",
				name: "Audit Shift",
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
		assertCorrelationPropagated(ready, shiftCreateCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_SHIFT_CREATE,
		});

		clearPorts(ready);
		const shiftUpdateCorr = "trace-time-shift-update";
		const updatedShift = await updateShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: shiftUpdateCorr,
				shiftId: shift.data.id,
				name: "Audit Shift Updated",
				expectedVersion: shift.data.version,
			},
			ready,
		);
		expect(updatedShift.ok).toBe(true);
		if (!updatedShift.ok) return;
		assertCorrelationPropagated(ready, shiftUpdateCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_SHIFT_UPDATE,
		});

		clearPorts(ready);
		const shiftActivateCorr = "trace-time-shift-activate";
		const activatedShift = await activateShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: shiftActivateCorr,
				shiftId: updatedShift.data.id,
				expectedVersion: updatedShift.data.version,
			},
			ready,
		);
		expect(activatedShift.ok).toBe(true);
		if (!activatedShift.ok) return;
		assertCorrelationPropagated(ready, shiftActivateCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_SHIFT_ACTIVATE,
		});

		clearPorts(ready);
		const breakAddCorr = "trace-time-break-add";
		const shiftBreak = await addShiftBreak(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: breakAddCorr,
				shiftId: activatedShift.data.id,
				durationMinutes: 30,
				label: "Lunch",
			},
			ready,
		);
		expect(shiftBreak.ok).toBe(true);
		if (!shiftBreak.ok) return;
		assertCorrelationPropagated(ready, breakAddCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_SHIFT_BREAK_ADD,
		});

		clearPorts(ready);
		const breakRemoveCorr = "trace-time-break-remove";
		const breakRemoved = await removeShiftBreak(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: breakRemoveCorr,
				breakId: shiftBreak.data.id,
			},
			ready,
		);
		expect(breakRemoved.ok).toBe(true);
		if (!breakRemoved.ok) return;
		assertCorrelationPropagated(ready, breakRemoveCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_SHIFT_BREAK_REMOVE,
		});

		clearPorts(ready);
		const shiftDeactivateCorr = "trace-time-shift-deactivate";
		const deactivatedShift = await deactivateShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: shiftDeactivateCorr,
				shiftId: activatedShift.data.id,
				expectedVersion: activatedShift.data.version,
			},
			ready,
		);
		expect(deactivatedShift.ok).toBe(true);
		if (!deactivatedShift.ok) return;
		assertCorrelationPropagated(ready, shiftDeactivateCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_SHIFT_DEACTIVATE,
		});

		const activeShift = await activateShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-audit-shift-reactivate",
				shiftId: deactivatedShift.data.id,
				expectedVersion: deactivatedShift.data.version,
			},
			ready,
		);
		expect(activeShift.ok).toBe(true);
		if (!activeShift.ok) return;

		clearPorts(ready);
		const assignCorr = "trace-time-shift-assign";
		const plannedAssignment = await assignShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: assignCorr,
				idempotencyKey: "idem-time-audit-assign",
				employeeId: employee.id,
				employmentId: employment.id,
				shiftId: activeShift.data.id,
				scheduledDate: "2025-07-10",
				startsAt: "2025-07-10T01:00:00.000Z",
				endsAt: "2025-07-10T09:00:00.000Z",
				timezone: "Asia/Singapore",
			},
			ready,
		);
		expect(plannedAssignment.ok).toBe(true);
		if (!plannedAssignment.ok) return;
		assertCorrelationPropagated(ready, assignCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGN,
		});

		const cancelAssignmentSeed = await assignShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-audit-cancel-assign",
				idempotencyKey: "idem-time-audit-cancel-assign",
				employeeId: employee.id,
				employmentId: employment.id,
				shiftId: activeShift.data.id,
				scheduledDate: "2025-07-11",
				startsAt: "2025-07-11T01:00:00.000Z",
				endsAt: "2025-07-11T09:00:00.000Z",
				timezone: "Asia/Singapore",
			},
			ready,
		);
		expect(cancelAssignmentSeed.ok).toBe(true);
		if (!cancelAssignmentSeed.ok) return;

		clearPorts(ready);
		const cancelCorr = "trace-time-assign-cancel";
		const cancelledAssignment = await cancelShiftAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: cancelCorr,
				assignmentId: cancelAssignmentSeed.data.id,
				expectedVersion: cancelAssignmentSeed.data.version,
			},
			ready,
		);
		expect(cancelledAssignment.ok).toBe(true);
		if (!cancelledAssignment.ok) return;
		assertCorrelationPropagated(ready, cancelCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_CANCEL,
		});

		clearPorts(ready);
		const changeCorr = "trace-time-assign-change";
		const changedAssignment = await changeShiftAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: changeCorr,
				assignmentId: plannedAssignment.data.id,
				startsAt: "2025-07-10T02:00:00.000Z",
				endsAt: "2025-07-10T10:00:00.000Z",
				expectedVersion: plannedAssignment.data.version,
			},
			ready,
		);
		expect(changedAssignment.ok).toBe(true);
		if (!changedAssignment.ok) return;
		assertCorrelationPropagated(ready, changeCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_CHANGE,
		});

		const completeAssignmentSeed = await assignShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-audit-complete-assign",
				idempotencyKey: "idem-time-audit-complete-assign",
				employeeId: employee.id,
				employmentId: employment.id,
				shiftId: activeShift.data.id,
				scheduledDate: "2025-07-12",
				startsAt: "2025-07-12T01:00:00.000Z",
				endsAt: "2025-07-12T09:00:00.000Z",
				timezone: "Asia/Singapore",
			},
			ready,
		);
		expect(completeAssignmentSeed.ok).toBe(true);
		if (!completeAssignmentSeed.ok) return;

		const publishedForComplete = await publishShiftAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-audit-complete-publish",
				assignmentId: completeAssignmentSeed.data.id,
				expectedVersion: completeAssignmentSeed.data.version,
			},
			ready,
		);
		expect(publishedForComplete.ok).toBe(true);
		if (!publishedForComplete.ok) return;

		clearPorts(ready);
		const completeCorr = "trace-time-assign-complete";
		const completedAssignment = await completeShiftAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: completeCorr,
				assignmentId: publishedForComplete.data.id,
				expectedVersion: publishedForComplete.data.version,
			},
			ready,
		);
		expect(completedAssignment.ok).toBe(true);
		if (!completedAssignment.ok) return;
		assertCorrelationPropagated(ready, completeCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_COMPLETE,
		});

		clearPorts(ready);
		const importCorr = "trace-time-import";
		const imported = await importAttendanceEvents(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: importCorr,
				idempotencyKey: "idem-time-audit-import",
				batchId: "batch-time-audit",
				sourceKey: "terminal-audit",
				events: [
					{
						employeeId: employee.id,
						eventType: "clock_in",
						occurredAt: "2025-07-15T01:00:00.000Z",
						sourceTimezone: "Asia/Singapore",
						localWorkDate: "2025-07-15",
						sourceReference: "audit-cin-1",
					},
				],
			},
			ready,
		);
		expect(imported.ok).toBe(true);
		if (!imported.ok) return;
		assertCorrelationPropagated(ready, importCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENTS_IMPORT,
		});

		const voidSeed = await recordClockIn(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-void-event",
				idempotencyKey: "idem-time-void-event",
				employeeId: employee.id,
				employmentId: employment.id,
				occurredAt: "2025-07-16T01:00:00.000Z",
				sourceTimezone: "Asia/Singapore",
				localWorkDate: "2025-07-16",
			},
			ready,
		);
		expect(voidSeed.ok).toBe(true);
		if (!voidSeed.ok) return;

		clearPorts(ready);
		const voidCorr = "trace-time-void";
		const voided = await voidAttendanceEvent(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: voidCorr,
				eventId: voidSeed.data.id,
				voidReason: "duplicate punch",
				expectedVersion: voidSeed.data.version,
			},
			ready,
		);
		expect(voided.ok).toBe(true);
		if (!voided.ok) return;
		assertCorrelationPropagated(ready, voidCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_VOID,
		});

		await recordClockIn(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-session-cin",
				idempotencyKey: "idem-time-session-cin",
				employeeId: employee.id,
				employmentId: employment.id,
				occurredAt: "2025-07-17T01:00:00.000Z",
				sourceTimezone: "Asia/Singapore",
				localWorkDate: "2025-07-17",
			},
			ready,
		);
		await recordClockOut(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-session-cout",
				idempotencyKey: "idem-time-session-cout",
				employeeId: employee.id,
				employmentId: employment.id,
				occurredAt: "2025-07-17T09:00:00.000Z",
				sourceTimezone: "Asia/Singapore",
				localWorkDate: "2025-07-17",
			},
			ready,
		);

		clearPorts(ready);
		const sessionCorr = "trace-time-session-resolve";
		const session = await resolveAttendanceSession(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: sessionCorr,
				idempotencyKey: "idem-time-session",
				employeeId: employee.id,
				localWorkDate: "2025-07-17",
				timezone: "Asia/Singapore",
			},
			ready,
		);
		expect(session.ok).toBe(true);
		if (!session.ok) return;
		assertCorrelationPropagated(ready, sessionCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_ATTENDANCE_SESSION_RESOLVE,
		});

		const reviewExceptionSeed = await createAttendanceException(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "seed-time-exc-review",
				employeeId: employee.id,
				exceptionType: "late_arrival",
				severity: "warning",
				remarks: "late",
			},
			ready,
		);
		expect(reviewExceptionSeed.ok).toBe(true);
		if (!reviewExceptionSeed.ok) return;

		clearPorts(ready);
		const reviewCorr = "trace-time-exc-review";
		const reviewed = await reviewAttendanceException(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: reviewCorr,
				exceptionId: reviewExceptionSeed.data.id,
				expectedVersion: reviewExceptionSeed.data.version,
			},
			ready,
		);
		expect(reviewed.ok).toBe(true);
		if (!reviewed.ok) return;
		assertCorrelationPropagated(ready, reviewCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_REVIEW,
		});

		clearPorts(ready);
		const excuseCorr = "trace-time-exc-excuse";
		const excused = await excuseAttendanceException(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: excuseCorr,
				exceptionId: reviewed.data.id,
				resolution: "traffic",
				expectedVersion: reviewed.data.version,
			},
			ready,
		);
		expect(excused.ok).toBe(true);
		if (!excused.ok) return;
		assertCorrelationPropagated(ready, excuseCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_EXCUSE,
		});

		const rejectExceptionSeed = await createAttendanceException(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "seed-time-exc-reject",
				employeeId: employee.id,
				exceptionType: "early_departure",
				severity: "warning",
				remarks: "left early",
			},
			ready,
		);
		expect(rejectExceptionSeed.ok).toBe(true);
		if (!rejectExceptionSeed.ok) return;

		const rejectReviewed = await reviewAttendanceException(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "seed-time-exc-reject-review",
				exceptionId: rejectExceptionSeed.data.id,
				expectedVersion: rejectExceptionSeed.data.version,
			},
			ready,
		);
		expect(rejectReviewed.ok).toBe(true);
		if (!rejectReviewed.ok) return;

		clearPorts(ready);
		const rejectExcCorr = "trace-time-exc-reject";
		const rejectedException = await rejectAttendanceException(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: rejectExcCorr,
				exceptionId: rejectReviewed.data.id,
				resolution: "unapproved leave",
				expectedVersion: rejectReviewed.data.version,
			},
			ready,
		);
		expect(rejectedException.ok).toBe(true);
		if (!rejectedException.ok) return;
		assertCorrelationPropagated(ready, rejectExcCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_REJECT,
		});

		const resolveExceptionSeed = await createAttendanceException(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "seed-time-exc-resolve",
				employeeId: employee.id,
				exceptionType: "missing_clock_out",
				severity: "warning",
				remarks: "missing out punch",
			},
			ready,
		);
		expect(resolveExceptionSeed.ok).toBe(true);
		if (!resolveExceptionSeed.ok) return;

		const resolveReviewed = await reviewAttendanceException(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "seed-time-exc-resolve-review",
				exceptionId: resolveExceptionSeed.data.id,
				expectedVersion: resolveExceptionSeed.data.version,
			},
			ready,
		);
		expect(resolveReviewed.ok).toBe(true);
		if (!resolveReviewed.ok) return;

		clearPorts(ready);
		const resolveExcCorr = "trace-time-exc-resolve";
		const resolvedException = await resolveAttendanceException(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: resolveExcCorr,
				exceptionId: resolveReviewed.data.id,
				resolution: "manual correction filed",
				expectedVersion: resolveReviewed.data.version,
			},
			ready,
		);
		expect(resolvedException.ok).toBe(true);
		if (!resolvedException.ok) return;
		assertCorrelationPropagated(ready, resolveExcCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_RESOLVE,
		});

		const auditCalendar = await createWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-audit-ts-cal",
				idempotencyKey: "idem-time-audit-ts-cal",
				code: "AUDIT-TS-CAL",
				name: "Audit TS Calendar",
				timezone: "Asia/Singapore",
				calendarVersion: "v1",
				workWeek: TIME_CORR_STANDARD_WEEK,
				standardHoursPerDay: "8.00",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(auditCalendar.ok).toBe(true);
		if (!auditCalendar.ok) return;

		await assignEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-audit-ts-cal-assign",
				employeeId: employee.id,
				employmentId: employment.id,
				calendarId: auditCalendar.data.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);

		clearPorts(ready);
		const tsCreateCorr = "trace-time-ts-create";
		const timesheet = await createTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: tsCreateCorr,
				idempotencyKey: "idem-time-audit-ts",
				employeeId: employee.id,
				employmentId: employment.id,
				periodStart: "2025-07-01",
				periodEnd: "2025-07-07",
			},
			ready,
		);
		expect(timesheet.ok).toBe(true);
		if (!timesheet.ok) return;
		assertCorrelationPropagated(ready, tsCreateCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_CREATE,
		});

		clearPorts(ready);
		const generateCorr = "trace-time-ts-generate";
		const generated = await generateTimesheetEntries(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: generateCorr,
				timesheetId: timesheet.data.id,
				expectedVersion: timesheet.data.version,
			},
			ready,
		);
		expect(generated.ok).toBe(true);
		if (!generated.ok) return;
		assertCorrelationPropagated(ready, generateCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_GENERATE_ENTRIES,
		});

		clearPorts(ready);
		const entryAddCorr = "trace-time-ts-entry-add";
		const entry = await addTimesheetEntry(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: entryAddCorr,
				timesheetId: generated.data.timesheet.id,
				employeeId: employee.id,
				workDate: "2025-07-02",
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
		assertCorrelationPropagated(ready, entryAddCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_ADD,
		});

		clearPorts(ready);
		const entryUpdateCorr = "trace-time-ts-entry-update";
		const updatedEntry = await updateTimesheetEntry(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: entryUpdateCorr,
				entryId: entry.data.id,
				approvedMinutes: 450,
				expectedVersion: entry.data.version,
			},
			ready,
		);
		expect(updatedEntry.ok).toBe(true);
		if (!updatedEntry.ok) return;
		assertCorrelationPropagated(ready, entryUpdateCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_UPDATE,
		});

		clearPorts(ready);
		const entryRemoveCorr = "trace-time-ts-entry-remove";
		const removedEntry = await removeTimesheetEntry(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: entryRemoveCorr,
				entryId: updatedEntry.data.id,
				expectedVersion: updatedEntry.data.version,
			},
			ready,
		);
		expect(removedEntry.ok).toBe(true);
		if (!removedEntry.ok) return;
		assertCorrelationPropagated(ready, entryRemoveCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_REMOVE,
		});

		const timesheetForReturn = await getTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-ts-return-get",
				timesheetId: generated.data.timesheet.id,
			},
			ready,
		);
		expect(timesheetForReturn.ok).toBe(true);
		if (!timesheetForReturn.ok || timesheetForReturn.data === null) return;
		const submittedForReturn = await submitTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-ts-return-submit",
				timesheetId: timesheetForReturn.data.id,
				expectedVersion: timesheetForReturn.data.version,
			},
			ready,
		);
		expect(submittedForReturn.ok).toBe(true);
		if (!submittedForReturn.ok) return;

		clearPorts(ready);
		const returnCorr = "trace-time-ts-return";
		const returned = await returnTimesheet(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: returnCorr,
				timesheetId: submittedForReturn.data.id,
				approverNotes: "fix entries",
				expectedVersion: submittedForReturn.data.version,
			},
			ready,
		);
		expect(returned.ok).toBe(true);
		if (!returned.ok) return;
		assertCorrelationPropagated(ready, returnCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_RETURN,
		});

		const rejectTimesheetSeed = await createTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-ts-reject",
				idempotencyKey: "idem-time-ts-reject",
				employeeId: employee.id,
				employmentId: employment.id,
				periodStart: "2025-08-01",
				periodEnd: "2025-08-07",
			},
			ready,
		);
		expect(rejectTimesheetSeed.ok).toBe(true);
		if (!rejectTimesheetSeed.ok) return;

		const submittedForReject = await submitTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-ts-reject-submit",
				timesheetId: rejectTimesheetSeed.data.id,
				expectedVersion: rejectTimesheetSeed.data.version,
			},
			ready,
		);
		expect(submittedForReject.ok).toBe(true);
		if (!submittedForReject.ok) return;

		clearPorts(ready);
		const rejectTsCorr = "trace-time-ts-reject";
		const rejectedTimesheet = await rejectTimesheet(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: rejectTsCorr,
				timesheetId: submittedForReject.data.id,
				rejectionReason: "unsupported overtime",
				expectedVersion: submittedForReject.data.version,
			},
			ready,
		);
		expect(rejectedTimesheet.ok).toBe(true);
		if (!rejectedTimesheet.ok) return;
		assertCorrelationPropagated(ready, rejectTsCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_REJECT,
		});

		const supersedeTimesheetSeed = await createTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-ts-supersede",
				idempotencyKey: "idem-time-ts-supersede",
				employeeId: employee.id,
				employmentId: employment.id,
				periodStart: "2025-09-01",
				periodEnd: "2025-09-07",
			},
			ready,
		);
		expect(supersedeTimesheetSeed.ok).toBe(true);
		if (!supersedeTimesheetSeed.ok) return;

		const submittedForSupersede = await submitTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-ts-supersede-submit",
				timesheetId: supersedeTimesheetSeed.data.id,
				expectedVersion: supersedeTimesheetSeed.data.version,
			},
			ready,
		);
		expect(submittedForSupersede.ok).toBe(true);
		if (!submittedForSupersede.ok) return;

		await grantManagerTimeApprovalAuthority(ready, "supersede");
		const approvedForSupersede = await approveTimesheet(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "seed-time-ts-supersede-approve",
				authority: "line_manager",
				timesheetId: submittedForSupersede.data.id,
				expectedVersion: submittedForSupersede.data.version,
			},
			ready,
		);
		expect(approvedForSupersede.ok).toBe(true);
		if (!approvedForSupersede.ok) return;

		clearPorts(ready);
		const supersedeCorr = "trace-time-ts-supersede";
		const superseded = await supersedeTimesheet(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: supersedeCorr,
				timesheetId: approvedForSupersede.data.id,
				expectedVersion: approvedForSupersede.data.version,
				idempotencyKey: "idem-time-ts-supersede-op",
			},
			ready,
		);
		expect(superseded.ok).toBe(true);
		if (!superseded.ok) return;
		assertCorrelationPropagated(ready, supersedeCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_SUPERSEDE,
		});

		clearPorts(ready);
		const otCreateCorr = "trace-time-ot-create";
		const otRejectSeed = await createOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: otCreateCorr,
				idempotencyKey: "idem-time-ot-reject",
				employeeId: employee.id,
				employmentId: employment.id,
				overtimeType: "weekday_overtime",
				requestedStartsAt: "2025-07-20T10:00:00.000Z",
				requestedEndsAt: "2025-07-20T12:00:00.000Z",
				requestedMinutes: 120,
				reason: "audit reject path",
			},
			ready,
		);
		expect(otRejectSeed.ok).toBe(true);
		if (!otRejectSeed.ok) return;
		assertCorrelationPropagated(ready, otCreateCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_CREATE,
		});

		clearPorts(ready);
		const otRejectCorr = "trace-time-ot-reject";
		const otRejected = await rejectOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: otRejectCorr,
				requestId: otRejectSeed.data.id,
				comment: "not approved",
				expectedVersion: otRejectSeed.data.version,
			},
			ready,
		);
		expect(otRejected.ok).toBe(true);
		if (!otRejected.ok) return;
		assertCorrelationPropagated(ready, otRejectCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_REJECT,
		});

		const otCancelSeed = await createOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-ot-cancel",
				idempotencyKey: "idem-time-ot-cancel",
				employeeId: employee.id,
				employmentId: employment.id,
				overtimeType: "weekday_overtime",
				requestedStartsAt: "2025-07-21T10:00:00.000Z",
				requestedEndsAt: "2025-07-21T11:00:00.000Z",
				requestedMinutes: 60,
				reason: "audit cancel path",
			},
			ready,
		);
		expect(otCancelSeed.ok).toBe(true);
		if (!otCancelSeed.ok) return;

		clearPorts(ready);
		const otCancelCorr = "trace-time-ot-cancel";
		const otCancelled = await cancelOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: otCancelCorr,
				requestId: otCancelSeed.data.id,
				expectedVersion: otCancelSeed.data.version,
			},
			ready,
		);
		expect(otCancelled.ok).toBe(true);
		if (!otCancelled.ok) return;
		assertCorrelationPropagated(ready, otCancelCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_CANCEL,
		});

		const otActualSeed = await createOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-ot-actual",
				idempotencyKey: "idem-time-ot-actual",
				employeeId: employee.id,
				employmentId: employment.id,
				overtimeType: "weekday_overtime",
				requestedStartsAt: "2025-07-22T10:00:00.000Z",
				requestedEndsAt: "2025-07-22T12:00:00.000Z",
				requestedMinutes: 120,
				reason: "audit actual path",
			},
			ready,
		);
		expect(otActualSeed.ok).toBe(true);
		if (!otActualSeed.ok) return;

		const otApprovedForActual = await approveOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "seed-time-ot-actual-approve",
				requestId: otActualSeed.data.id,
				approvedMaximumMinutes: 120,
				expectedVersion: otActualSeed.data.version,
			},
			ready,
		);
		expect(otApprovedForActual.ok).toBe(true);
		if (!otApprovedForActual.ok) return;

		clearPorts(ready);
		const otActualCorr = "trace-time-ot-actual";
		const otActual = await recordOvertimeActual(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: otActualCorr,
				requestId: otApprovedForActual.data.id,
				actualMinutes: 90,
				expectedVersion: otApprovedForActual.data.version,
			},
			ready,
		);
		expect(otActual.ok).toBe(true);
		if (!otActual.ok) return;
		assertCorrelationPropagated(ready, otActualCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_RECORD_ACTUAL,
		});

		clearPorts(ready);
		const otVerifyCorr = "trace-time-ot-verify";
		const otVerified = await verifyOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: otVerifyCorr,
				requestId: otActual.data.id,
				payrollApprovedMinutes: 90,
				expectedVersion: otActual.data.version,
			},
			ready,
		);
		expect(otVerified.ok).toBe(true);
		if (!otVerified.ok) return;
		assertCorrelationPropagated(ready, otVerifyCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_VERIFY,
		});
	});
});
