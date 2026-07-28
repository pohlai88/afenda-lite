/** Memory vs Drizzle parity for compliance (HR-COMPLIANCE-01). */

import { afterAll, describe, expect, it } from "vitest";
import {
	createDocumentRequirement,
	publishDocumentRequirement,
} from "../src/compliance/document-requirement";
import {
	listMissingRequiredDocuments,
	registerEmployeeDocument,
	verifyEmployeeDocument,
} from "../src/compliance/employee-document";
import {
	issuePolicyAcknowledgementRequirement,
	listOverduePolicyAcknowledgements,
} from "../src/compliance/policy-acknowledgement";
import {
	listEmployeesWithWorkEligibilityRisk,
	recordWorkEligibility,
} from "../src/compliance/work-eligibility";
import { createEmployee } from "../src/core/employee";
import { runDrizzleParity } from "./helpers/database-gate";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import { createNeonOrgTracker } from "./helpers/neon-cleanup";

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function seedEmployee(
	ready: ReturnType<typeof createHrParityHarness>,
	input: { organizationId: string; actorUserId: string; suffix: string },
) {
	const employee = await createEmployee(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-emp-${input.suffix}`,
			idempotencyKey: `idem-emp-${input.suffix}`,
			employeeNumber: `E-${input.suffix}`.slice(0, 64),
			legalName: `Worker ${input.suffix}`,
		},
		ready,
	);
	if (!employee.ok) {
		throw new Error(`Failed to seed employee: ${employee.code}`);
	}
	return employee.data;
}

function defineComplianceParitySuite(adapter: WorkforceStoreAdapter): void {
	const suffix = uniqueSuffix(adapter);
	const neonOrgs = createNeonOrgTracker();
	const organizationId = neonOrgs.trackOrg(`org-compliance-parity-${suffix}`);
	const actorUserId = `actor-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await neonOrgs.cleanup();
		}
	});

	it("document register + verify + policy + eligibility", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await seedEmployee(ready, {
			organizationId,
			actorUserId,
			suffix: `baseline-${suffix}`,
		});
		const requirement = await createDocumentRequirement(
			{
				organizationId,
				actorUserId,
				correlationId: `corr-create-req-${suffix}`,
				code: `REQ-${suffix}`.slice(0, 64),
				name: "Passport",
				documentType: "passport",
			},
			ready,
		);
		expect(requirement.ok).toBe(true);
		if (!requirement.ok) return;
		const published = await publishDocumentRequirement(
			{
				organizationId,
				actorUserId,
				correlationId: `corr-publish-req-${suffix}`,
				requirementId: requirement.data.id,
				expectedVersion: requirement.data.version,
			},
			ready,
		);
		expect(published.ok).toBe(true);
		if (!published.ok) return;
		const document = await registerEmployeeDocument(
			{
				organizationId,
				actorUserId,
				correlationId: `corr-register-doc-${suffix}`,
				employeeId: employee.id,
				requirementId: published.data.id,
				documentType: "passport",
				issuedOn: "2026-01-01",
				expiresOn: "2031-01-01",
				documentRef: `vault://organizations/${organizationId}/passport/${suffix}?version=1`,
				idempotencyKey: `idem-doc-${suffix}`,
			},
			ready,
		);
		expect(document.ok).toBe(true);
		if (!document.ok) return;
		const verified = await verifyEmployeeDocument(
			{
				organizationId,
				actorUserId,
				correlationId: `corr-verify-doc-${suffix}`,
				documentId: document.data.id,
				evidenceDate: "2026-01-02",
				expectedVersion: document.data.version,
			},
			ready,
		);
		expect(verified.ok).toBe(true);
		if (!verified.ok) return;
		expect(verified.data.verificationStatus).toBe("verified");
		const eligibility = await recordWorkEligibility(
			{
				organizationId,
				actorUserId,
				correlationId: `corr-record-eligibility-${suffix}`,
				employeeId: employee.id,
				countryCode: "US",
				issuedOn: "2026-01-01",
				idempotencyKey: `idem-eligibility-${suffix}`,
			},
			ready,
		);
		expect(eligibility.ok).toBe(true);
		const policy = await issuePolicyAcknowledgementRequirement(
			{
				organizationId,
				actorUserId,
				correlationId: `corr-issue-policy-${suffix}`,
				employeeId: employee.id,
				policyCode: "HANDBOOK",
				policyVersion: "1",
				idempotencyKey: `idem-policy-${suffix}`,
			},
			ready,
		);
		expect(policy.ok).toBe(true);
		if (!policy.ok) return;
		expect(policy.data.requirementStatus).toBe("outstanding");
	});

	it("honors structured applicability with and without employee filters", async () => {
		const ready = createHrParityHarness(adapter);
		const employeeA = await seedEmployee(ready, {
			organizationId,
			actorUserId,
			suffix: `app-a-${suffix}`,
		});
		const employeeB = await seedEmployee(ready, {
			organizationId,
			actorUserId,
			suffix: `app-b-${suffix}`,
		});
		for (const input of [
			{
				code: `ALL-${suffix}`.slice(0, 64),
				name: "All employees",
				applicability: { kind: "all_employees" as const },
			},
			{
				code: `ONLY-${suffix}`.slice(0, 64),
				name: "Employee A only",
				applicability: {
					kind: "employee_ids" as const,
					employeeIds: [employeeA.id],
				},
			},
		]) {
			const created = await createDocumentRequirement(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-app-create-${input.code}`,
					code: input.code,
					name: input.name,
					documentType: "policy",
					applicability: input.applicability,
				},
				ready,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) return;
			const published = await publishDocumentRequirement(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-app-publish-${input.code}`,
					requirementId: created.data.id,
					expectedVersion: created.data.version,
				},
				ready,
			);
			expect(published.ok).toBe(true);
		}
		const unfiltered = await listMissingRequiredDocuments(
			{
				organizationId,
				actorUserId,
				correlationId: `corr-app-all-${suffix}`,
			},
			ready,
		);
		expect(unfiltered.ok).toBe(true);
		if (!unfiltered.ok) return;
		expect(unfiltered.data.requirements.map((row) => row.name)).toEqual(
			expect.arrayContaining(["All employees", "Employee A only"]),
		);
		const employeeBOnly = await listMissingRequiredDocuments(
			{
				organizationId,
				actorUserId,
				correlationId: `corr-app-b-${suffix}`,
				employeeId: employeeB.id,
			},
			ready,
		);
		expect(employeeBOnly.ok).toBe(true);
		if (!employeeBOnly.ok) return;
		expect(employeeBOnly.data.requirements.map((row) => row.name)).toContain(
			"All employees",
		);
		expect(
			employeeBOnly.data.requirements.map((row) => row.name),
		).not.toContain("Employee A only");
	});

	it("orders near and past eligibility risks and overdue policies deterministically", async () => {
		const ready = createHrParityHarness(adapter);
		const riskOrganizationId = neonOrgs.trackOrg(`${organizationId}-risk`);
		const employeeA = await seedEmployee(ready, {
			organizationId: riskOrganizationId,
			actorUserId,
			suffix: `risk-a-${suffix}`,
		});
		const employeeB = await seedEmployee(ready, {
			organizationId: riskOrganizationId,
			actorUserId,
			suffix: `risk-b-${suffix}`,
		});
		for (const input of [
			{ employeeId: employeeA.id, expiresOn: "2026-06-30", label: "past" },
			{ employeeId: employeeB.id, expiresOn: "2026-07-15", label: "near" },
		]) {
			const recorded = await recordWorkEligibility(
				{
					organizationId: riskOrganizationId,
					actorUserId,
					correlationId: `corr-risk-${input.label}-${suffix}`,
					employeeId: input.employeeId,
					countryCode: "US",
					issuedOn: "2026-01-01",
					expiresOn: input.expiresOn,
					idempotencyKey: `idem-risk-${input.label}-${suffix}`,
				},
				ready,
			);
			expect(recorded.ok).toBe(true);
		}
		const risks = await listEmployeesWithWorkEligibilityRisk(
			{
				organizationId: riskOrganizationId,
				actorUserId,
				correlationId: `corr-risk-list-${suffix}`,
				asOf: "2026-07-01",
				withinDays: 30,
				pageSize: 10,
			},
			ready,
		);
		expect(risks.ok).toBe(true);
		if (!risks.ok) return;
		expect(risks.data.eligibilities.map((row) => row.employeeId)).toEqual([
			employeeA.id,
			employeeB.id,
		]);

		for (const input of [
			{ employeeId: employeeA.id, dueOn: "2026-06-15", label: "first" },
			{ employeeId: employeeB.id, dueOn: "2026-06-30", label: "second" },
		]) {
			const issued = await issuePolicyAcknowledgementRequirement(
				{
					organizationId: riskOrganizationId,
					actorUserId,
					correlationId: `corr-overdue-${input.label}-${suffix}`,
					employeeId: input.employeeId,
					policyCode: `POLICY-${input.label}`,
					policyVersion: "1",
					dueOn: input.dueOn,
					idempotencyKey: `idem-overdue-${input.label}-${suffix}`,
				},
				ready,
			);
			expect(issued.ok).toBe(true);
		}
		const overdue = await listOverduePolicyAcknowledgements(
			{
				organizationId: riskOrganizationId,
				actorUserId,
				correlationId: `corr-overdue-list-${suffix}`,
				asOf: "2026-07-01",
				pageSize: 10,
			},
			ready,
		);
		expect(overdue.ok).toBe(true);
		if (!overdue.ok) return;
		expect(overdue.data.acknowledgements.map((row) => row.dueOn)).toEqual([
			"2026-06-15",
			"2026-06-30",
		]);
	});
}

describe("human-resources compliance parity (memory)", () => {
	defineComplianceParitySuite("memory");
});

describe.skipIf(!runDrizzleParity)(
	"human-resources compliance parity (drizzle/neon)",
	() => {
		defineComplianceParitySuite("drizzle");
	},
);
