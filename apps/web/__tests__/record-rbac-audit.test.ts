/**
 * GUIDE-018 I2.3 — first authenticated write under hard `organization_id`.
 *
 * Integration cases need `DATABASE_URL` (from the runner env or `.env.local`).
 * They insert real `platform_rbac_audit` rows on the configured Neon branch,
 * prove `withOrg` isolation, then delete the fixture ids.
 */

import {
	deleteRbacAuditRow,
	MEMBER_INVITE_AUDIT_ACTION,
	recordRbacAudit,
} from "@afenda/admin/audit";
import { platformRbacAudit, withOrg } from "@afenda/db";
import { afterAll, describe, expect, it } from "vitest";
import { hasDatabase } from "./helpers/identity-database";

const createdAuditIds: Array<{ id: string; orgId: string }> = [];

describe("recordRbacAudit guards (I2.3)", () => {
	it("rejects empty orgId before touching the database", async () => {
		const result = await recordRbacAudit({
			orgId: "   ",
			action: MEMBER_INVITE_AUDIT_ACTION,
			actorUserId: "user-a",
			correlationId: "test-correlation-id",
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("BAD_REQUEST");
		}
	});

	it("rejects empty actorUserId", async () => {
		const result = await recordRbacAudit({
			orgId: "org-a",
			action: MEMBER_INVITE_AUDIT_ACTION,
			actorUserId: "",
			correlationId: "test-correlation-id",
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("BAD_REQUEST");
		}
	});
});

describe.skipIf(!hasDatabase)("recordRbacAudit tenancy write (I2.3)", () => {
	const orgA = "org-i23-write-a";
	const orgB = "org-i23-write-b";
	const actorUserId = "user-i23-write-actor";

	afterAll(async () => {
		for (const row of createdAuditIds) {
			await deleteRbacAuditRow(row);
		}
	});

	it("inserts with explicit organization_id and isolates via withOrg", async () => {
		const recorded = await recordRbacAudit({
			orgId: orgA,
			action: MEMBER_INVITE_AUDIT_ACTION,
			actorUserId,
			targetType: "membership",
			targetId: "invitee@example.com",
			newValue: { email: "invitee@example.com", role: "client" },
			correlationId: "test-correlation-id",
		});
		if (!recorded.ok) {
			throw new Error(
				`recordRbacAudit failed: ${recorded.code} ${recorded.message}`,
			);
		}
		const row = recorded.data;
		createdAuditIds.push({ id: row.id, orgId: orgA });

		expect(row.organizationId).toBe(orgA);
		expect(row.action).toBe(MEMBER_INVITE_AUDIT_ACTION);
		expect(row.actorUserId).toBe(actorUserId);

		const forOrgA = await withOrg(platformRbacAudit, orgA);
		expect(forOrgA.some((item) => item.id === row.id)).toBe(true);

		const forOrgB = await withOrg(platformRbacAudit, orgB);
		expect(forOrgB.some((item) => item.id === row.id)).toBe(false);

		const wrongOrgDelete = await deleteRbacAuditRow({
			id: row.id,
			orgId: orgB,
		});
		expect(wrongOrgDelete.ok).toBe(true);
		if (wrongOrgDelete.ok) {
			expect(wrongOrgDelete.data).toBeNull();
		}

		const forOrgAAfterDeniedDelete = await withOrg(platformRbacAudit, orgA);
		expect(forOrgAAfterDeniedDelete.some((item) => item.id === row.id)).toBe(
			true,
		);
	});
});
