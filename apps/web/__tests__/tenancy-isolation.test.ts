/**
 * N9 / ARCH-023 — two-org isolation for living platform / identity adapters.
 *
 * Integration cases need `DATABASE_URL` (runner env or `.env.local`).
 * Fixtures use synthetic org ids and are deleted in afterAll.
 */

import {
	deleteRbacAuditRow,
	MEMBER_INVITE_AUDIT_ACTION,
	recordRbacAudit,
} from "@afenda/admin/audit";
import { platformRbacAudit, withOrg } from "@afenda/db";
import { afterAll, describe, expect, it } from "vitest";
import { hasDatabase } from "./helpers/identity-database";

describe("tenancy isolation guards (N9)", () => {
	it("withOrg rejects empty orgId", async () => {
		await expect(withOrg(platformRbacAudit, "  ")).rejects.toThrow(
			/non-empty orgId/,
		);
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
			await deleteRbacAuditRow(row);
		}
	});

	it("RBAC audit: withOrg A sees row; withOrg B does not", async () => {
		const recorded = await recordRbacAudit({
			orgId: orgA,
			action: MEMBER_INVITE_AUDIT_ACTION,
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

		const forA = await withOrg(platformRbacAudit, orgA);
		expect(forA.some((item) => item.id === row.id)).toBe(true);

		const forB = await withOrg(platformRbacAudit, orgB);
		expect(forB.some((item) => item.id === row.id)).toBe(false);
	});
});
