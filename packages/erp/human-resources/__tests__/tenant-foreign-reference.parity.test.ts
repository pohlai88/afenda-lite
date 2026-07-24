import { randomUUID } from "node:crypto";

import { and, db, eq, hrEmployee, hrUserEmployee } from "@afenda/db";
import { afterAll, describe, expect, it } from "vitest";

import { runDrizzleParity } from "./helpers/database-gate";
import { createNeonOrgTracker } from "./helpers/neon-cleanup";

const describeDatabase = runDrizzleParity ? describe : describe.skip;

describeDatabase("HR tenant foreign-reference isolation", () => {
	const suffix = randomUUID();
	const neonOrgs = createNeonOrgTracker();
	const ownerOrganizationId = neonOrgs.trackOrg(`org-fk-owner-${suffix}`);
	const attackerOrganizationId = neonOrgs.trackOrg(`org-fk-attacker-${suffix}`);
	const employeeId = randomUUID();
	const mappingId = randomUUID();

	afterAll(async () => {
		await neonOrgs.cleanup();
	});

	it("rejects an HR reference to a row owned by another tenant", async () => {
		await db.insert(hrEmployee).values({
			id: employeeId,
			organizationId: ownerOrganizationId,
			employeeNumber: `E-${suffix}`,
			normalizedEmployeeNumber: `e-${suffix}`,
			legalName: "Tenant FK Evidence",
			createIdempotencyKey: `employee-${suffix}`,
			createRequestFingerprint: `fingerprint-${suffix}`,
			createdBy: "phase-4-test",
			updatedBy: "phase-4-test",
		});

		await expect(
			db.insert(hrUserEmployee).values({
				id: mappingId,
				organizationId: attackerOrganizationId,
				userId: `user-${suffix}`,
				employeeId,
				relationshipType: "self",
				effectiveFrom: "2026-07-24",
				createdBy: "phase-4-test",
			}),
		).rejects.toThrow();

		const leakedReferences = await db
			.select({ id: hrUserEmployee.id })
			.from(hrUserEmployee)
			.where(
				and(
					eq(hrUserEmployee.organizationId, attackerOrganizationId),
					eq(hrUserEmployee.id, mappingId),
				),
			);
		expect(leakedReferences).toEqual([]);
	});
});
