/**
 * GUIDE-018 I3.1 — assign org role Zod + hard-tenancy audited write (N12 Path-to-100%).
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, db, eq, platformRoleAssignment, withOrg } from "@afenda/db";
import { afterAll, describe, expect, it } from "vitest";
import { parseAssignOrgRoleCommand } from "../modules/identity/domain/assign-org-role";
import { assignOrgRoleWithAudit } from "../modules/identity/domain/assign-org-role-audited";
import { deleteRbacAuditRow } from "../modules/platform/domain/record-rbac-audit";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../..",
);

const createdAssignmentIds: Array<{ id: string; orgId: string }> = [];
const createdAuditIds: Array<{ id: string; orgId: string }> = [];

function loadDatabaseUrl(): string | undefined {
	if (process.env.DATABASE_URL) {
		return process.env.DATABASE_URL;
	}
	try {
		const text = readFileSync(path.join(repoRoot, ".env.local"), "utf8");
		for (const line of text.split(/\r?\n/)) {
			const trimmed = line.trim();
			if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
			const match = /^DATABASE_URL\s*=\s*(.*)$/.exec(trimmed);
			if (!match) continue;
			let value = match[1]?.trim() ?? "";
			if (
				(value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))
			) {
				value = value.slice(1, -1);
			}
			return value.length > 0 ? value : undefined;
		}
	} catch {
		return undefined;
	}
	return undefined;
}

const databaseUrl = loadDatabaseUrl();
if (databaseUrl) {
	process.env.DATABASE_URL = databaseUrl;
}

const hasDatabase = typeof databaseUrl === "string" && databaseUrl.length > 0;

/** Live Org Admin system template on br-tiny-hill (ARCH-023 seed). */
const ORG_ADMIN_TEMPLATE_ROLE_ID = "22527ba9-7a74-4217-8b2e-986f36e0b444";

describe("parseAssignOrgRoleCommand (I3.1)", () => {
	it("accepts trimmed userId and uuid roleId", () => {
		expect(
			parseAssignOrgRoleCommand({
				userId: "  user-abc  ",
				roleId: ORG_ADMIN_TEMPLATE_ROLE_ID,
			}),
		).toEqual({
			userId: "user-abc",
			roleId: ORG_ADMIN_TEMPLATE_ROLE_ID,
		});
	});

	it("rejects empty userId", () => {
		expect(() =>
			parseAssignOrgRoleCommand({
				userId: "   ",
				roleId: ORG_ADMIN_TEMPLATE_ROLE_ID,
			}),
		).toThrow();
	});

	it("rejects non-uuid roleId", () => {
		expect(() =>
			parseAssignOrgRoleCommand({
				userId: "user-abc",
				roleId: "not-a-uuid",
			}),
		).toThrow();
	});
});

describe.skipIf(!hasDatabase)(
	"assignOrgRoleWithAudit tenancy write (I3.1)",
	() => {
		const runId = `${Date.now()}`;
		const orgA = `org-i31-assign-a-${runId}`;
		const orgB = `org-i31-assign-b-${runId}`;
		const userId = `user-i31-assign-target-${runId}`;
		const grantedBy = `user-i31-assign-actor-${runId}`;

		afterAll(async () => {
			for (const row of createdAuditIds) {
				await deleteRbacAuditRow({ id: row.id, orgId: row.orgId });
			}
			for (const row of createdAssignmentIds) {
				await db
					.delete(platformRoleAssignment)
					.where(
						and(
							eq(platformRoleAssignment.id, row.id),
							eq(platformRoleAssignment.organizationId, row.orgId),
						),
					);
			}
		});

		it("assigns a system template role under hard organization_id with auditId", async () => {
			const result = await assignOrgRoleWithAudit({
				orgId: orgA,
				userId,
				roleId: ORG_ADMIN_TEMPLATE_ROLE_ID,
				grantedBy,
				actorUserId: grantedBy,
			});
			expect(result.ok).toBe(true);
			if (!result.ok) {
				return;
			}

			createdAssignmentIds.push({ id: result.assignment.id, orgId: orgA });
			createdAuditIds.push({ id: result.auditId, orgId: orgA });
			expect(result.assignment.organizationId).toBe(orgA);
			expect(result.assignment.roleId).toBe(ORG_ADMIN_TEMPLATE_ROLE_ID);
			expect(result.assignment.active).toBe(true);
			expect(result.reactivated).toBe(false);
			expect(result.auditId).toBeTruthy();

			const forOrgA = await withOrg(platformRoleAssignment, orgA);
			expect(forOrgA.some((item) => item.id === result.assignment.id)).toBe(
				true,
			);

			const forOrgB = await withOrg(platformRoleAssignment, orgB);
			expect(forOrgB.some((item) => item.id === result.assignment.id)).toBe(
				false,
			);

			const conflict = await assignOrgRoleWithAudit({
				orgId: orgA,
				userId,
				roleId: ORG_ADMIN_TEMPLATE_ROLE_ID,
				grantedBy,
				actorUserId: grantedBy,
			});
			expect(conflict.ok).toBe(false);
			if (!conflict.ok) {
				expect(conflict.code).toBe("CONFLICT");
			}
		});

		it("rejects unknown role ids", async () => {
			const result = await assignOrgRoleWithAudit({
				orgId: orgA,
				userId: "user-i31-missing-role",
				roleId: "00000000-0000-4000-8000-000000000099",
				grantedBy,
				actorUserId: grantedBy,
			});
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.code).toBe("NOT_FOUND");
			}
		});
	},
);
