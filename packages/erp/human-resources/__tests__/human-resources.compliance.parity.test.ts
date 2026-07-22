/** Memory vs Drizzle parity for compliance (HR-COMPLIANCE-01). */

import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { afterAll, describe, expect, it } from "vitest";
import {
	createDocumentRequirement,
	publishDocumentRequirement,
} from "../src/compliance/document-requirement";
import {
	registerEmployeeDocument,
	verifyEmployeeDocument,
} from "../src/compliance/employee-document";
import { issuePolicyAcknowledgementRequirement } from "../src/compliance/policy-acknowledgement";
import { recordWorkEligibility } from "../src/compliance/work-eligibility";
import { createEmployee } from "../src/core/employee";
import { cleanupHumanResourcesNeonOrgs } from "./helpers/neon-cleanup";
import {
	createWorkforceHarness,
	type WorkforceStoreAdapter,
} from "./helpers/workforce-harness";

const { hasDatabase } = resolveDatabaseUrlForTests();

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function seedEmployee(
	ready: ReturnType<typeof createWorkforceHarness>,
	input: { organizationId: string; actorUserId: string; suffix: string },
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
	if (!employee.ok) {
		throw new Error(`Failed to seed employee: ${employee.code}`);
	}
	return employee.data;
}

describe.runIf(hasDatabase)("human-resources compliance parity", () => {
	const parityOrgs: string[] = [];

	afterAll(async () => {
		await cleanupHumanResourcesNeonOrgs(parityOrgs);
	});

	for (const adapter of ["memory", "drizzle"] as const) {
		it(`${adapter}: document register + verify + policy + eligibility`, async () => {
			const suffix = uniqueSuffix(adapter);
			const organizationId = `org-compliance-parity-${suffix}`;
			parityOrgs.push(organizationId);
			const actorUserId = `actor-${suffix}`;
			const ready = createWorkforceHarness(adapter);

			const employee = await seedEmployee(ready, {
				organizationId,
				actorUserId,
				suffix,
			});

			const requirement = await createDocumentRequirement(
				{
					organizationId,
					actorUserId,
					code: `REQ-${suffix}`,
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
					employeeId: employee.id,
					requirementId: published.data.id,
					documentType: "passport",
					issuedOn: "2026-01-01",
					expiresOn: "2031-01-01",
					documentRef: `vault://passport/${suffix}`,
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
					employeeId: employee.id,
					countryCode: "US",
					issuedOn: "2026-01-01",
					idempotencyKey: `idem-eligibility-${suffix}`,
				},
				ready,
			);
			expect(eligibility.ok).toBe(true);
			if (!eligibility.ok) return;

			const policy = await issuePolicyAcknowledgementRequirement(
				{
					organizationId,
					actorUserId,
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
	}
});
