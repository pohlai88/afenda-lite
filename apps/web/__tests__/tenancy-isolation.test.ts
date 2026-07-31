// biome-ignore-all lint/performance/noAwaitInLoops: Cases run serially to isolate mutable test state and ordered transitions.
/**
 * N9 / ARCH-023 — two-org isolation for living platform / identity adapters.
 *
 * Integration cases need `DATABASE_URL` (runner env or `.env.local`).
 * Fixtures use synthetic org ids and are deleted in afterAll.
 */

import { rbacAudit } from "@afenda/admin/audit";
import { database as afendaDatabase, platformRbacAudit } from "@afenda/db";
import { afterAll, describe, expect, it } from "vitest";
import { hasDatabase } from "./helpers/identity-database";

describe("tenancy isolation guards (N9)", () => {
	it("withOrg rejects empty orgId", async () => {
		await expect(
			afendaDatabase.tenancy.readAll(platformRbacAudit, "  "),
		).rejects.toThrow(/non-empty organizationId/);
	});
});

describe.skipIf(!hasDatabase)("tenancy isolation two-org (N9)", () => {
	const runId = `${Date.now()}`;
	const orgA = `org-n9-iso-a-${runId}`;
	const orgB = `org-n9-iso-b-${runId}`;
	const clientEmail = `n9-iso-${runId}@example.com`;

	const auditIds: Array<{ id: string; orgId: string }> = [];

	afterAll(async () => {
		for (const row of auditIds) {
			await rbacAudit.rows.delete(row);
		}
	});

	it("RBAC audit: withOrg A sees row; withOrg B does not", async () => {
		const recorded = await rbacAudit.record({
			orgId: orgA,
			action: rbacAudit.actions.memberInvite,
			actorUserId: `user-n9-iso-${runId}`,
			targetType: "membership",
			targetId: clientEmail,
			correlationId: "test-correlation-id",
		});
		expect(recorded.ok).toBe(true);
		if (!recorded.ok) {
			throw new Error(recorded.message);
		}
		const row = recorded.data;
		auditIds.push({ id: row.id, orgId: orgA });

		const forA = await afendaDatabase.tenancy.readAll(platformRbacAudit, orgA);
		expect(forA.some((item) => item.id === row.id)).toBe(true);

		const forB = await afendaDatabase.tenancy.readAll(platformRbacAudit, orgB);
		expect(forB.some((item) => item.id === row.id)).toBe(false);
	});
});
