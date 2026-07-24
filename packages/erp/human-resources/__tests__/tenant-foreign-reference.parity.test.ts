import { randomUUID } from "node:crypto";

import { and, db, eq, hrEmployee, hrUserEmployee } from "@afenda/db";
import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { afterAll, describe, expect, it } from "vitest";

const { hasDatabase } = resolveDatabaseUrlForTests();
const runDatabaseEvidence =
	hasDatabase && process.env.REQUIRE_DATABASE_TESTS === "1";
const describeDatabase = runDatabaseEvidence ? describe : describe.skip;

describeDatabase("HR tenant foreign-reference isolation", () => {
	const suffix = randomUUID();
	const ownerOrganizationId = `org-fk-owner-${suffix}`;
	const attackerOrganizationId = `org-fk-attacker-${suffix}`;
	const employeeId = randomUUID();
	const mappingId = randomUUID();

	afterAll(async () => {
		await db
			.delete(hrUserEmployee)
			.where(
				and(
					eq(hrUserEmployee.organizationId, attackerOrganizationId),
					eq(hrUserEmployee.id, mappingId),
				),
			);
		await db
			.delete(hrEmployee)
			.where(
				and(
					eq(hrEmployee.organizationId, ownerOrganizationId),
					eq(hrEmployee.id, employeeId),
				),
			);
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
