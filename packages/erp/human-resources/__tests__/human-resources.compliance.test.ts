/**
 * Compliance domain rules matrix (HR-COMPLIANCE-01).
 */

import {
	HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_REGISTERED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_VERIFIED_EVENT,
	HUMAN_RESOURCES_POLICY_ACKNOWLEDGEMENT_ACKNOWLEDGED_EVENT,
	HUMAN_RESOURCES_POLICY_ACKNOWLEDGEMENT_OUTSTANDING_EVENT,
	HUMAN_RESOURCES_WORK_ELIGIBILITY_SUSPENDED_EVENT,
} from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";

import type { HumanResourcesPermission } from "../src/authorization";
import {
	createDocumentRequirement,
	publishDocumentRequirement,
} from "../src/compliance/document-requirement";
import { getEmployeeComplianceSummary } from "../src/compliance/employee-compliance-summary";
import {
	listEmployeeDocuments,
	markEmployeeDocumentExpired,
	registerEmployeeDocument,
	rejectEmployeeDocument,
	revokeEmployeeDocumentVerification,
	verifyEmployeeDocument,
} from "../src/compliance/employee-document";
import {
	acknowledgePolicy,
	issuePolicyAcknowledgementRequirement,
	listOutstandingPolicyAcknowledgements,
	supersedePolicyAcknowledgementRequirement,
} from "../src/compliance/policy-acknowledgement";
import {
	closeWorkEligibility,
	recordWorkEligibility,
	suspendWorkEligibility,
	verifyWorkEligibility,
} from "../src/compliance/work-eligibility";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import {
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
} from "../src/error-codes";
import {
	HUMAN_RESOURCES_PERMISSION_CODES,
	HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
	HUMAN_RESOURCES_PERMISSION_DOCUMENT_REQUIREMENT_MANAGE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_REGISTER,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_VERIFY,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
	HUMAN_RESOURCES_PERMISSION_POLICY_ACKNOWLEDGEMENT_ADMINISTER,
	HUMAN_RESOURCES_PERMISSION_WORK_ELIGIBILITY_VERIFY,
} from "../src/permissions";
import { createMemoryHumanResourcesStore } from "../src/testing";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { humanResourcesCodeFromResult } from "./helpers/result-details";

const ORG_A = "org-compliance-a";
const ORG_B = "org-compliance-b";
const ACTOR = "user-compliance-1";
const VERIFIER = "user-compliance-verifier";

function harness(
	permissions: readonly HumanResourcesPermission[] = HUMAN_RESOURCES_PERMISSION_CODES,
	ports = createMemoryMutationPorts(),
) {
	const store = createMemoryHumanResourcesStore();
	const authorization = createGrantingHumanResourcesAuthorization(permissions);
	return { store, ports, authorization };
}

async function seedEmployee(
	ready: ReturnType<typeof harness>,
	input: { organizationId: string; suffix: string },
) {
	const employee = await createEmployee(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-emp-${input.suffix}`,
			idempotencyKey: `idem-emp-${input.suffix}`,
			employeeNumber: `E-${input.suffix}`,
			legalName: `Worker ${input.suffix}`,
		},
		ready,
	);
	if (!employee.ok) {
		throw new Error(`Failed to seed employee: ${employee.code}`);
	}
	return employee.data;
}

async function seedPublishedRequirement(
	ready: ReturnType<typeof harness>,
	input: { organizationId: string; code: string },
) {
	const created = await createDocumentRequirement(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			code: input.code,
			name: `Requirement ${input.code}`,
			documentType: "passport",
		},
		ready,
	);
	if (!created.ok) {
		throw new Error(`Failed to create requirement: ${created.code}`);
	}
	const published = await publishDocumentRequirement(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			requirementId: created.data.id,
			expectedVersion: created.data.version,
		},
		ready,
	);
	if (!published.ok) {
		throw new Error(`Failed to publish requirement: ${published.code}`);
	}
	return published.data;
}

describe("human-resources compliance (memory)", () => {
	it("registers a valid employee document and emits outbox only", async () => {
		const ready = harness();
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "valid-doc",
		});

		const registered = await registerEmployeeDocument(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				employeeId: employee.id,
				documentType: "passport",
				issuedOn: "2026-01-01",
				expiresOn: "2031-01-01",
				documentRef: "vault://passport/valid-doc",
				documentIdentifier: "AB 1234 5678",
				idempotencyKey: "idem-doc-valid",
			},
			ready,
		);
		expect(registered.ok).toBe(true);
		if (!registered.ok) return;
		expect(registered.data.verificationStatus).toBe("pending");
		expect(registered.data.identifierLast4).toBe("5678");

		expect(
			ready.ports.outbox.calls.some(
				(call) =>
					call.type === HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_REGISTERED_EVENT,
			),
		).toBe(true);
	});

	it("rejects invalid expiry before issue date", async () => {
		const ready = harness();
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "bad-expiry",
		});

		const registered = await registerEmployeeDocument(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				employeeId: employee.id,
				documentType: "passport",
				issuedOn: "2026-06-01",
				expiresOn: "2026-01-01",
				documentRef: "vault://passport/bad-expiry",
				idempotencyKey: "idem-doc-bad-expiry",
			},
			ready,
		);
		expect(registered.ok).toBe(false);
		if (registered.ok) return;
		expect(humanResourcesCodeFromResult(registered)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);
	});

	it("denies verify when actor lacks verifier permission", async () => {
		const ready = harness([
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_REGISTER,
		]);
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "no-verify",
		});
		const registered = await registerEmployeeDocument(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				employeeId: employee.id,
				documentType: "passport",
				issuedOn: "2026-01-01",
				documentRef: "vault://passport/no-verify",
				idempotencyKey: "idem-doc-no-verify",
			},
			ready,
		);
		expect(registered.ok).toBe(true);
		if (!registered.ok) return;

		const denied = await verifyEmployeeDocument(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				documentId: registered.data.id,
				evidenceDate: "2026-01-02",
				expectedVersion: registered.data.version,
			},
			ready,
		);
		expect(denied.ok).toBe(false);
		if (denied.ok) return;
		expect(humanResourcesCodeFromResult(denied)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);
	});

	it("records rejected verification with reason", async () => {
		const ready = harness([
			...HUMAN_RESOURCES_PERMISSION_CODES.filter(
				(code) =>
					code === HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE ||
					code === HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_REGISTER ||
					code === HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_VERIFY,
			),
		]);
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "reject",
		});
		const registered = await registerEmployeeDocument(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				employeeId: employee.id,
				documentType: "passport",
				issuedOn: "2026-01-01",
				documentRef: "vault://passport/reject",
				idempotencyKey: "idem-doc-reject",
			},
			ready,
		);
		expect(registered.ok).toBe(true);
		if (!registered.ok) return;

		const rejected = await rejectEmployeeDocument(
			{
				organizationId: ORG_A,
				actorUserId: VERIFIER,
				documentId: registered.data.id,
				rejectionReason: "Image unreadable",
				expectedVersion: registered.data.version,
			},
			ready,
		);
		expect(rejected.ok).toBe(true);
		if (!rejected.ok) return;
		expect(rejected.data.verificationStatus).toBe("rejected");
		expect(rejected.data.rejectionReason).toBe("Image unreadable");
	});

	it("audits reverification and bumps version", async () => {
		const ready = harness([
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_REGISTER,
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_VERIFY,
		]);
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "reverify",
		});
		const registered = await registerEmployeeDocument(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				employeeId: employee.id,
				documentType: "passport",
				issuedOn: "2026-01-01",
				documentRef: "vault://passport/reverify",
				idempotencyKey: "idem-doc-reverify",
			},
			ready,
		);
		expect(registered.ok).toBe(true);
		if (!registered.ok) return;

		const firstVerify = await verifyEmployeeDocument(
			{
				organizationId: ORG_A,
				actorUserId: VERIFIER,
				documentId: registered.data.id,
				evidenceDate: "2026-01-02",
				expectedVersion: registered.data.version,
			},
			ready,
		);
		expect(firstVerify.ok).toBe(true);
		if (!firstVerify.ok) return;

		const revoked = await revokeEmployeeDocumentVerification(
			{
				organizationId: ORG_A,
				actorUserId: VERIFIER,
				documentId: firstVerify.data.id,
				expectedVersion: firstVerify.data.version,
			},
			ready,
		);
		expect(revoked.ok).toBe(true);
		if (!revoked.ok) return;

		const secondVerify = await verifyEmployeeDocument(
			{
				organizationId: ORG_A,
				actorUserId: VERIFIER,
				documentId: revoked.data.id,
				evidenceDate: "2026-02-01",
				expectedVersion: revoked.data.version,
			},
			ready,
		);
		expect(secondVerify.ok).toBe(true);
		if (!secondVerify.ok) return;
		expect(secondVerify.data.version).toBeGreaterThan(registered.data.version);
		expect(
			ready.ports.audit.calls.filter(
				(call) => call.entity === "hr_employee_document",
			).length,
		).toBeGreaterThanOrEqual(3);
		expect(
			ready.ports.outbox.calls.some(
				(call) =>
					call.type === HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_VERIFIED_EVENT,
			),
		).toBe(true);
	});

	it("markExpired clears verified status", async () => {
		const ready = harness([
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_REGISTER,
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_VERIFY,
		]);
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "expire",
		});
		const registered = await registerEmployeeDocument(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				employeeId: employee.id,
				documentType: "passport",
				issuedOn: "2024-01-01",
				expiresOn: "2025-01-01",
				documentRef: "vault://passport/expire",
				idempotencyKey: "idem-doc-expire",
			},
			ready,
		);
		expect(registered.ok).toBe(true);
		if (!registered.ok) return;

		const verified = await verifyEmployeeDocument(
			{
				organizationId: ORG_A,
				actorUserId: VERIFIER,
				documentId: registered.data.id,
				evidenceDate: "2024-02-01",
				expectedVersion: registered.data.version,
			},
			ready,
		);
		expect(verified.ok).toBe(true);
		if (!verified.ok) return;

		const expired = await markEmployeeDocumentExpired(
			{
				organizationId: ORG_A,
				actorUserId: VERIFIER,
				documentId: verified.data.id,
				expectedVersion: verified.data.version,
			},
			ready,
		);
		expect(expired.ok).toBe(true);
		if (!expired.ok) return;
		expect(expired.data.verificationStatus).toBe("expired");
		expect(expired.data.verifiedBy).toBeNull();
	});

	it("masks identifier fields on list responses", async () => {
		const ready = harness([
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_REGISTER,
			HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
		]);
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "mask",
		});
		const registered = await registerEmployeeDocument(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				employeeId: employee.id,
				documentType: "passport",
				issuedOn: "2026-01-01",
				documentRef: "vault://passport/mask",
				documentIdentifier: "XY 9999 1111",
				idempotencyKey: "idem-doc-mask",
			},
			ready,
		);
		expect(registered.ok).toBe(true);
		if (!registered.ok) return;

		const listed = await listEmployeeDocuments(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				employeeId: employee.id,
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) return;
		expect(listed.data.documents).toHaveLength(1);
		expect(listed.data.documents[0]).not.toHaveProperty("identifierLast4");
		expect(listed.data.documents[0]).not.toHaveProperty("documentRef");
	});

	it("denies cross-organization employee document registration", async () => {
		const ready = harness();
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "cross",
		});

		const crossOrg = await registerEmployeeDocument(
			{
				organizationId: ORG_B,
				actorUserId: ACTOR,
				employeeId: employee.id,
				documentType: "passport",
				issuedOn: "2026-01-01",
				documentRef: "vault://passport/cross",
				idempotencyKey: "idem-doc-cross",
			},
			ready,
		);
		expect(crossOrg.ok).toBe(false);
		if (crossOrg.ok) return;
		expect(humanResourcesCodeFromResult(crossOrg)).toBe(
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	});

	it("surfaces work eligibility risk and suspension events", async () => {
		const ready = harness([
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
			HUMAN_RESOURCES_PERMISSION_WORK_ELIGIBILITY_VERIFY,
			HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
		]);
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "eligibility",
		});
		const recorded = await recordWorkEligibility(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				employeeId: employee.id,
				countryCode: "US",
				issuedOn: "2026-01-01",
				expiresOn: "2026-12-31",
				idempotencyKey: "idem-eligibility",
			},
			ready,
		);
		expect(recorded.ok).toBe(true);
		if (!recorded.ok) return;

		const verified = await verifyWorkEligibility(
			{
				organizationId: ORG_A,
				actorUserId: VERIFIER,
				eligibilityId: recorded.data.id,
				evidenceDate: "2026-01-02",
				expectedVersion: recorded.data.version,
			},
			ready,
		);
		expect(verified.ok).toBe(true);
		if (!verified.ok) return;

		const suspended = await suspendWorkEligibility(
			{
				organizationId: ORG_A,
				actorUserId: VERIFIER,
				eligibilityId: verified.data.id,
				expectedVersion: verified.data.version,
			},
			ready,
		);
		expect(suspended.ok).toBe(true);
		if (!suspended.ok) return;
		expect(
			ready.ports.outbox.calls.some(
				(call) =>
					call.type === HUMAN_RESOURCES_WORK_ELIGIBILITY_SUSPENDED_EVENT,
			),
		).toBe(true);

		const summary = await getEmployeeComplianceSummary(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				employeeId: employee.id,
				asOf: "2026-06-01",
			},
			ready,
		);
		expect(summary.ok).toBe(true);
		if (!summary.ok) return;
		expect(summary.data.workEligibilityAtRisk).toBe(true);
	});

	it("issues outstanding policy acknowledgements and preserves prior acks on supersede", async () => {
		const ready = harness([
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
			HUMAN_RESOURCES_PERMISSION_POLICY_ACKNOWLEDGEMENT_ADMINISTER,
			HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
		]);
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "policy",
		});

		const issued = await issuePolicyAcknowledgementRequirement(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				employeeId: employee.id,
				policyCode: "CODE_OF_CONDUCT",
				policyVersion: "2026.1",
				idempotencyKey: "idem-policy-v1",
			},
			ready,
		);
		expect(issued.ok).toBe(true);
		if (!issued.ok) return;
		expect(
			ready.ports.outbox.calls.some(
				(call) =>
					call.type ===
					HUMAN_RESOURCES_POLICY_ACKNOWLEDGEMENT_OUTSTANDING_EVENT,
			),
		).toBe(true);

		const acknowledged = await acknowledgePolicy(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				acknowledgementId: issued.data.id,
				expectedVersion: issued.data.version,
			},
			ready,
		);
		expect(acknowledged.ok).toBe(true);
		if (!acknowledged.ok) return;
		expect(
			ready.ports.outbox.calls.some(
				(call) =>
					call.type ===
					HUMAN_RESOURCES_POLICY_ACKNOWLEDGEMENT_ACKNOWLEDGED_EVENT,
			),
		).toBe(true);

		const superseded = await supersedePolicyAcknowledgementRequirement(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				acknowledgementId: acknowledged.data.id,
				newPolicyVersion: "2026.2",
				expectedVersion: acknowledged.data.version,
			},
			ready,
		);
		expect(superseded.ok).toBe(true);
		if (!superseded.ok) return;
		expect(superseded.data.policyVersion).toBe("2026.2");
		expect(superseded.data.requirementStatus).toBe("outstanding");
		expect(acknowledged.data.requirementStatus).toBe("acknowledged");

		const outstanding = await listOutstandingPolicyAcknowledgements(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				employeeId: employee.id,
			},
			ready,
		);
		expect(outstanding.ok).toBe(true);
		if (!outstanding.ok) return;
		expect(outstanding.data.acknowledgements.length).toBeGreaterThan(0);
	});

	it("does not mutate employment status from compliance commands", async () => {
		const ready = harness([
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
			HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
			HUMAN_RESOURCES_PERMISSION_DOCUMENT_REQUIREMENT_MANAGE,
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_REGISTER,
			HUMAN_RESOURCES_PERMISSION_WORK_ELIGIBILITY_VERIFY,
			HUMAN_RESOURCES_PERMISSION_POLICY_ACKNOWLEDGEMENT_ADMINISTER,
		]);
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "employment",
		});
		const employment = await createEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-employment",
				employeeId: employee.id,
				startsOn: "2026-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		await registerEmployeeDocument(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				employeeId: employee.id,
				documentType: "passport",
				issuedOn: "2026-01-01",
				documentRef: "vault://passport/employment",
				idempotencyKey: "idem-doc-employment",
			},
			ready,
		);
		await recordWorkEligibility(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				employeeId: employee.id,
				countryCode: "US",
				issuedOn: "2026-01-01",
				idempotencyKey: "idem-eligibility-employment",
			},
			ready,
		);
		await issuePolicyAcknowledgementRequirement(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				employeeId: employee.id,
				policyCode: "HANDBOOK",
				policyVersion: "1",
				idempotencyKey: "idem-policy-employment",
			},
			ready,
		);

		const after = await ready.store.getEmploymentById({
			organizationId: ORG_A,
			employmentId: employment.data.id,
		});
		expect(after.ok).toBe(true);
		if (!after.ok || !after.data) return;
		expect(after.data.status).toBe("active");
	});

	it("rolls back document registration when outbox append fails", async () => {
		const ready = harness();
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "rollback",
		});
		const failingPorts = createMemoryMutationPorts({ outboxFailAfter: 0 });
		const failingReady = { ...ready, ports: failingPorts };

		const registered = await registerEmployeeDocument(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				employeeId: employee.id,
				documentType: "passport",
				issuedOn: "2026-01-01",
				documentRef: "vault://passport/rollback",
				idempotencyKey: "idem-doc-rollback",
			},
			failingReady,
		);
		expect(registered.ok).toBe(false);

		const listed = await ready.store.listEmployeeDocuments({
			organizationId: ORG_A,
			page: 1,
			pageSize: 10,
			employeeId: employee.id,
		});
		expect(listed.ok).toBe(true);
		if (!listed.ok) return;
		expect(listed.data.totalCount).toBe(0);
	});

	it("rejects embedded data: document references", async () => {
		const ready = harness();
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "data-uri",
		});

		const registered = await registerEmployeeDocument(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				employeeId: employee.id,
				documentType: "passport",
				issuedOn: "2026-01-01",
				documentRef: "data:image/png;base64,AAAA",
				idempotencyKey: "idem-doc-data-uri",
			},
			ready,
		);
		expect(registered.ok).toBe(false);
		if (!registered.ok) {
			expect(registered.code).toBe("VALIDATION_ERROR");
		}
	});

	it("tracks missing required documents against published requirements", async () => {
		const ready = harness([
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
			HUMAN_RESOURCES_PERMISSION_DOCUMENT_REQUIREMENT_MANAGE,
			HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
		]);
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "missing",
		});
		await seedPublishedRequirement(ready, {
			organizationId: ORG_A,
			code: "REQ-PASSPORT",
		});

		const summary = await getEmployeeComplianceSummary(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				employeeId: employee.id,
			},
			ready,
		);
		expect(summary.ok).toBe(true);
		if (!summary.ok) return;
		expect(summary.data.missingRequiredDocumentCount).toBeGreaterThan(0);
	});

	it("closes work eligibility without terminating employment", async () => {
		const ready = harness([
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
			HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
			HUMAN_RESOURCES_PERMISSION_WORK_ELIGIBILITY_VERIFY,
		]);
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "close-eligibility",
		});
		const employment = await createEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-employment-close",
				employeeId: employee.id,
				startsOn: "2026-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const recorded = await recordWorkEligibility(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				employeeId: employee.id,
				countryCode: "US",
				issuedOn: "2026-01-01",
				idempotencyKey: "idem-close-eligibility",
			},
			ready,
		);
		expect(recorded.ok).toBe(true);
		if (!recorded.ok) return;

		const closed = await closeWorkEligibility(
			{
				organizationId: ORG_A,
				actorUserId: VERIFIER,
				eligibilityId: recorded.data.id,
				expectedVersion: recorded.data.version,
			},
			ready,
		);
		expect(closed.ok).toBe(true);
		if (!closed.ok) return;
		expect(closed.data.status).toBe("closed");

		const after = await ready.store.getEmploymentById({
			organizationId: ORG_A,
			employmentId: employment.data.id,
		});
		expect(after.ok).toBe(true);
		if (!after.ok || !after.data) return;
		expect(after.data.status).toBe("active");
	});
});
