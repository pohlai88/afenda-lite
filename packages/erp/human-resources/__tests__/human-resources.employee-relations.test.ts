/**
 * Employee-relations case management rules matrix (HR-ER-01).
 */

import {
	HUMAN_RESOURCES_EMPLOYEE_CASE_ACTION_APPROVED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_CASE_OPENED_EVENT,
} from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";

import type { HumanResourcesPermission } from "../src/authorization";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import {
	approveEmployeeCaseAction,
	recommendEmployeeCaseAction,
} from "../src/employee-relations/case-action";
import {
	recordEmployeeCaseAppeal,
	resolveEmployeeCaseAppeal,
} from "../src/employee-relations/case-appeal";
import {
	addEmployeeCaseEvidenceReference,
	recordEmployeeCaseEvent,
} from "../src/employee-relations/case-event";
import {
	assignEmployeeCaseOwner,
	closeEmployeeCase,
	getEmployeeCaseById,
	getEmployeeCaseOutcome,
	getEmployeeCaseTimeline,
	getEmployeeRelationsHistoryByEmployee,
	issueInterimEmployeeMeasure,
	openEmployeeCase,
	recordEmployeeCaseFinding,
	reopenEmployeeCase,
} from "../src/employee-relations/employee-case";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
} from "../src/error-codes";
import {
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ACTION_APPROVE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_APPEAL,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ASSIGNED_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_EXCEPTIONAL_ADMIN,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_FINDING,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_INVESTIGATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_OPEN,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
} from "../src/permissions";
import { createMemoryHumanResourcesStore } from "../src/testing";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { humanResourcesCodeFromResult } from "./helpers/result-details";

const ORG = "org-er-a";
const OTHER_ORG = "org-er-b";
const OWNER = "user-er-owner";
const PARTICIPANT = "user-er-participant";
const OUTSIDER = "user-er-outsider";
const SUBJECT = "user-er-subject";

const ER_PERMISSIONS: readonly HumanResourcesPermission[] = [
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_OPEN,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ASSIGNED_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_INVESTIGATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_FINDING,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ACTION_APPROVE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_APPEAL,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_EXCEPTIONAL_ADMIN,
];

function harness(
	permissions: readonly HumanResourcesPermission[] = ER_PERMISSIONS,
) {
	const store = createMemoryHumanResourcesStore();
	const ports = createMemoryMutationPorts();
	const authorization = createGrantingHumanResourcesAuthorization(permissions);
	return { store, ports, authorization };
}

async function seedEmployeeEmployment(ready: ReturnType<typeof harness>) {
	const seedReady = {
		...ready,
		authorization: createGrantingHumanResourcesAuthorization([
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
			HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
		]),
	};
	const employee = await createEmployee(
		{
			organizationId: ORG,
			actorUserId: OWNER,
			correlationId: "corr-er-emp",
			idempotencyKey: `idem-er-emp-${Date.now()}`,
			employeeNumber: `E-ER-${Date.now()}`,
			legalName: "Case Subject",
		},
		seedReady,
	);
	if (!employee.ok) {
		throw new Error(`seed employee failed: ${employee.code}`);
	}
	const employment = await createEmployment(
		{
			organizationId: ORG,
			actorUserId: OWNER,
			correlationId: "corr-er-employ",
			employeeId: employee.data.id,
			startsOn: "2025-01-01",
		},
		seedReady,
	);
	if (!employment.ok) {
		throw new Error(`seed employment failed: ${employment.code}`);
	}
	return { employee: employee.data, employment: employment.data };
}

async function openCase(
	ready: ReturnType<typeof harness>,
	input: {
		employeeId: string;
		employmentId: string;
		ownerActorUserId?: string;
		conflictedActorUserIds?: string[];
		subjectActorUserId?: string | null;
		idempotencyKey?: string;
	},
) {
	return openEmployeeCase(
		{
			organizationId: ORG,
			actorUserId: OWNER,
			correlationId: "corr-er-open",
			idempotencyKey: input.idempotencyKey ?? `idem-case-${Date.now()}`,
			employeeId: input.employeeId,
			employmentId: input.employmentId,
			caseType: "conduct",
			severity: "medium",
			allegationSummary: "Alleged policy breach",
			classificationCode: "CONDUCT-01",
			ownerActorUserId: input.ownerActorUserId ?? OWNER,
			subjectActorUserId: input.subjectActorUserId ?? SUBJECT,
			conflictedActorUserIds: input.conflictedActorUserIds ?? [],
		},
		ready,
	);
}

describe("Employee relations case lifecycle", () => {
	it("opens case, records finding, recommends and approves action, closes", async () => {
		const ready = harness();
		const { employee, employment } = await seedEmployeeEmployment(ready);

		const opened = await openCase(ready, {
			employeeId: employee.id,
			employmentId: employment.id,
		});
		expect(opened.ok).toBe(true);
		if (!opened.ok) return;
		expect(opened.data.status).toBe("open");
		expect(opened.data.allegationSummary).toBe("Alleged policy breach");
		expect(opened.data.findingCode).toBeNull();

		const eventOutbox = ready.ports.outbox.calls.find(
			(e) => e.type === HUMAN_RESOURCES_EMPLOYEE_CASE_OPENED_EVENT,
		);
		expect(eventOutbox?.payload).toMatchObject({
			entityType: "hr_employee_case",
			entityId: opened.data.id,
		});
		expect(JSON.stringify(eventOutbox?.payload)).not.toContain("Alleged");

		await recordEmployeeCaseEvent(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-inv-note",
				caseId: opened.data.id,
				eventKind: "investigation_note",
				payloadJson: { note: "Interview scheduled" },
			},
			ready,
		);

		const finding = await recordEmployeeCaseFinding(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-finding",
				caseId: opened.data.id,
				findingCode: "SUBSTANTIATED",
				findingSummary: "Policy breach confirmed",
				expectedVersion: opened.data.version + 1,
			},
			ready,
		);
		expect(finding.ok).toBe(true);
		if (!finding.ok) return;
		expect(finding.data.status).toBe("finding_recorded");
		expect(finding.data.findingCode).toBe("SUBSTANTIATED");

		const recommended = await recommendEmployeeCaseAction(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-recommend",
				caseId: finding.data.id,
				idempotencyKey: "idem-action-1",
				actionType: "warning",
				expectedVersion: finding.data.version,
			},
			ready,
		);
		expect(recommended.ok).toBe(true);
		if (!recommended.ok) return;

		const approved = await approveEmployeeCaseAction(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-approve",
				caseId: finding.data.id,
				actionId: recommended.data.id,
				policyValidationRecorded: true,
				expectedVersion: finding.data.version + 1,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;

		const employmentBefore = await ready.store.getEmploymentById({
			organizationId: ORG,
			employmentId: employment.id,
		});
		expect(employmentBefore.ok).toBe(true);
		if (!employmentBefore.ok || !employmentBefore.data) return;
		expect(employmentBefore.data.status).toBe("active");

		const closed = await closeEmployeeCase(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-close",
				caseId: finding.data.id,
				outcomeCode: "WARNING_ISSUED",
				expectedVersion: finding.data.version + 2,
			},
			ready,
		);
		expect(closed.ok).toBe(true);
		if (!closed.ok) return;
		expect(closed.data.status).toBe("closed");

		const employmentAfter = await ready.store.getEmploymentById({
			organizationId: ORG,
			employmentId: employment.id,
		});
		expect(employmentAfter.ok).toBe(true);
		if (!employmentAfter.ok || !employmentAfter.data) return;
		expect(employmentAfter.data.status).toBe("active");
	});

	it("denies outsider read and allows owner access", async () => {
		const ready = harness();
		const { employee, employment } = await seedEmployeeEmployment(ready);
		const opened = await openCase(ready, {
			employeeId: employee.id,
			employmentId: employment.id,
		});
		if (!opened.ok) return;

		const outsiderRead = await getEmployeeCaseById(
			{
				organizationId: ORG,
				actorUserId: OUTSIDER,
				correlationId: "corr-outsider",
				caseId: opened.data.id,
			},
			{
				...ready,
				authorization: createGrantingHumanResourcesAuthorization([
					HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ASSIGNED_READ,
				]),
			},
		);
		expect(outsiderRead.ok).toBe(false);
		expect(humanResourcesCodeFromResult(outsiderRead)).toBe(
			HUMAN_RESOURCES_ERROR_NOT_FOUND,
		);

		const ownerRead = await getEmployeeCaseById(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-owner-read",
				caseId: opened.data.id,
			},
			ready,
		);
		expect(ownerRead.ok).toBe(true);
	});

	it("rejects employee.read-only access to case queries", async () => {
		const ready = harness();
		const { employee, employment } = await seedEmployeeEmployment(ready);
		const opened = await openCase(ready, {
			employeeId: employee.id,
			employmentId: employment.id,
		});
		if (!opened.ok) return;

		const denied = await getEmployeeCaseById(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-emp-read",
				caseId: opened.data.id,
			},
			{
				...ready,
				authorization: createGrantingHumanResourcesAuthorization([
					HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
				]),
			},
		);
		expect(denied.ok).toBe(false);
		expect(humanResourcesCodeFromResult(denied)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);
	});

	it("blocks conflicted owner assignment", async () => {
		const ready = harness();
		const { employee, employment } = await seedEmployeeEmployment(ready);
		const opened = await openCase(ready, {
			employeeId: employee.id,
			employmentId: employment.id,
			conflictedActorUserIds: [PARTICIPANT],
		});
		if (!opened.ok) return;

		const assign = await assignEmployeeCaseOwner(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-assign-coi",
				caseId: opened.data.id,
				ownerActorUserId: PARTICIPANT,
				expectedVersion: opened.data.version,
			},
			ready,
		);
		expect(assign.ok).toBe(false);
		expect(humanResourcesCodeFromResult(assign)).toBe(
			HUMAN_RESOURCES_ERROR_CONFLICT,
		);
	});

	it("appends evidence references without binary storage", async () => {
		const ready = harness();
		const { employee, employment } = await seedEmployeeEmployment(ready);
		const opened = await openCase(ready, {
			employeeId: employee.id,
			employmentId: employment.id,
		});
		if (!opened.ok) return;

		const evidence = await addEmployeeCaseEvidenceReference(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-evidence",
				caseId: opened.data.id,
				documentRef: "s3://evidence/doc-1.pdf",
			},
			ready,
		);
		expect(evidence.ok).toBe(true);

		const timeline = await getEmployeeCaseTimeline(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-timeline",
				caseId: opened.data.id,
			},
			ready,
		);
		expect(timeline.ok).toBe(true);
		if (!timeline.ok) return;
		expect(timeline.data.events.some((e) => e.eventKind === "evidence_reference_added")).toBe(
			true,
		);
	});

	it("validates interim review date", async () => {
		const ready = harness();
		const { employee, employment } = await seedEmployeeEmployment(ready);
		const opened = await openCase(ready, {
			employeeId: employee.id,
			employmentId: employment.id,
		});
		if (!opened.ok) return;

		const interim = await issueInterimEmployeeMeasure(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-interim",
				caseId: opened.data.id,
				interimAuthority: "HR Director",
				interimReason: "Pending investigation",
				interimStartsOn: "2025-06-01",
				interimReviewOn: "2025-05-01",
				expectedVersion: opened.data.version,
			},
			ready,
		);
		expect(interim.ok).toBe(false);
		expect(humanResourcesCodeFromResult(interim)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);
	});

	it("preserves finding on appeal and resolves back to action_approved", async () => {
		const ready = harness();
		const { employee, employment } = await seedEmployeeEmployment(ready);
		const opened = await openCase(ready, {
			employeeId: employee.id,
			employmentId: employment.id,
		});
		if (!opened.ok) return;

		await recordEmployeeCaseEvent(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-inv",
				caseId: opened.data.id,
				eventKind: "investigation_note",
			},
			ready,
		);

		const finding = await recordEmployeeCaseFinding(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-finding-appeal",
				caseId: opened.data.id,
				findingCode: "SUBSTANTIATED",
				findingSummary: "Confirmed",
				expectedVersion: opened.data.version + 1,
			},
			ready,
		);
		if (!finding.ok) return;

		const recommended = await recommendEmployeeCaseAction(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-rec-appeal",
				caseId: finding.data.id,
				idempotencyKey: "idem-action-appeal",
				actionType: "warning",
				expectedVersion: finding.data.version,
			},
			ready,
		);
		if (!recommended.ok) return;

		const approved = await approveEmployeeCaseAction(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-app-appeal",
				caseId: finding.data.id,
				actionId: recommended.data.id,
				policyValidationRecorded: true,
				expectedVersion: finding.data.version + 1,
			},
			ready,
		);
		if (!approved.ok) return;

		const appeal = await recordEmployeeCaseAppeal(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-appeal",
				caseId: finding.data.id,
				idempotencyKey: "idem-appeal-1",
				appealGroundsSummary: "Procedural fairness",
				expectedVersion: finding.data.version + 2,
			},
			ready,
		);
		expect(appeal.ok).toBe(true);
		if (!appeal.ok) return;
		expect(appeal.data.originalFindingCode).toBe("SUBSTANTIATED");

		const resolved = await resolveEmployeeCaseAppeal(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-resolve-appeal",
				caseId: finding.data.id,
				appealId: appeal.data.id,
				appealOutcomeCode: "UPHELD",
				expectedVersion: finding.data.version + 3,
			},
			ready,
		);
		expect(resolved.ok).toBe(true);
		if (!resolved.ok) return;

		const after = await getEmployeeCaseById(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-after-appeal",
				caseId: finding.data.id,
			},
			ready,
		);
		expect(after.ok).toBe(true);
		if (!after.ok) return;
		expect(after.data.status).toBe("action_approved");
		expect(after.data.findingCode).toBe("SUBSTANTIATED");
	});

	it("blocks mutations on closed case except reopen", async () => {
		const ready = harness();
		const { employee, employment } = await seedEmployeeEmployment(ready);
		const opened = await openCase(ready, {
			employeeId: employee.id,
			employmentId: employment.id,
		});
		if (!opened.ok) return;

		await recordEmployeeCaseEvent(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-inv-close",
				caseId: opened.data.id,
				eventKind: "investigation_note",
			},
			ready,
		);

		const finding = await recordEmployeeCaseFinding(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-finding-close",
				caseId: opened.data.id,
				findingCode: "UNSUBSTANTIATED",
				findingSummary: "Not substantiated",
				expectedVersion: opened.data.version + 1,
			},
			ready,
		);
		if (!finding.ok) return;

		const closed = await closeEmployeeCase(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-close-immutable",
				caseId: finding.data.id,
				outcomeCode: "NO_ACTION",
				expectedVersion: finding.data.version,
			},
			ready,
		);
		if (!closed.ok) return;

		const blocked = await recordEmployeeCaseEvent(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-blocked",
				caseId: closed.data.id,
				eventKind: "investigation_note",
			},
			ready,
		);
		expect(blocked.ok).toBe(false);
		expect(humanResourcesCodeFromResult(blocked)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		);

		const reopened = await reopenEmployeeCase(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-reopen",
				caseId: closed.data.id,
				reasonCode: "NEW_EVIDENCE",
				expectedVersion: closed.data.version,
			},
			ready,
		);
		expect(reopened.ok).toBe(true);
		if (!reopened.ok) return;
		expect(reopened.data.status).toBe("open");
	});

	it("returns termination handoff without mutating employment", async () => {
		const ready = harness();
		const { employee, employment } = await seedEmployeeEmployment(ready);
		const opened = await openCase(ready, {
			employeeId: employee.id,
			employmentId: employment.id,
		});
		if (!opened.ok) return;

		await recordEmployeeCaseEvent(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-inv-term",
				caseId: opened.data.id,
				eventKind: "investigation_note",
			},
			ready,
		);

		const finding = await recordEmployeeCaseFinding(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-finding-term",
				caseId: opened.data.id,
				findingCode: "SUBSTANTIATED",
				findingSummary: "Serious misconduct",
				expectedVersion: opened.data.version + 1,
			},
			ready,
		);
		if (!finding.ok) return;

		const recommended = await recommendEmployeeCaseAction(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-rec-term",
				caseId: finding.data.id,
				idempotencyKey: "idem-term-action",
				actionType: "termination_recommendation",
				expectedVersion: finding.data.version,
			},
			ready,
		);
		if (!recommended.ok) return;

		const approved = await approveEmployeeCaseAction(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-app-term",
				caseId: finding.data.id,
				actionId: recommended.data.id,
				policyValidationRecorded: true,
				expectedVersion: finding.data.version + 1,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;

		const outcome = await getEmployeeCaseOutcome(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-outcome",
				caseId: finding.data.id,
			},
			ready,
		);
		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.data.terminationHandoff).toMatchObject({
			caseId: finding.data.id,
			actionId: recommended.data.id,
			employeeId: employee.id,
			employmentId: employment.id,
		});

		const actionEvent = ready.ports.outbox.calls.find(
			(e) => e.type === HUMAN_RESOURCES_EMPLOYEE_CASE_ACTION_APPROVED_EVENT,
		);
		expect(JSON.stringify(actionEvent?.payload)).not.toContain("Serious");
	});

	it("denies cross-organization case access", async () => {
		const ready = harness();
		const { employee, employment } = await seedEmployeeEmployment(ready);
		const opened = await openCase(ready, {
			employeeId: employee.id,
			employmentId: employment.id,
		});
		if (!opened.ok) return;

		const crossOrg = await getEmployeeCaseById(
			{
				organizationId: OTHER_ORG,
				actorUserId: OWNER,
				correlationId: "corr-cross-org",
				caseId: opened.data.id,
			},
			ready,
		);
		expect(crossOrg.ok).toBe(false);
		expect(humanResourcesCodeFromResult(crossOrg)).toBe(
			HUMAN_RESOURCES_ERROR_NOT_FOUND,
		);
	});

	it("lists employee history for exceptional admin without participant ACL", async () => {
		const ready = harness();
		const { employee, employment } = await seedEmployeeEmployment(ready);
		const opened = await openCase(ready, {
			employeeId: employee.id,
			employmentId: employment.id,
		});
		if (!opened.ok) return;

		const history = await getEmployeeRelationsHistoryByEmployee(
			{
				organizationId: ORG,
				actorUserId: OUTSIDER,
				correlationId: "corr-history",
				employeeId: employee.id,
			},
			ready,
		);
		expect(history.ok).toBe(true);
		if (!history.ok) return;
		expect(history.data.totalCount).toBeGreaterThanOrEqual(1);
	});
});
