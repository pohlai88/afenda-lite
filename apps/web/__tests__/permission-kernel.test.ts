/**
 * N10 — Permission kernel: catalog gate, list ports, two-org authz isolation.
 * Assign/revoke via WithAudit (N12 Path-to-100%).
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	PLATFORM_PERMISSION_CODES_V1,
	and,
	db,
	eq,
	ensurePlatformPermissionCatalog,
	platformRoleAssignment,
} from "@afenda/db";
import { afterAll, describe, expect, it } from "vitest";

import { assignOrgRoleWithAudit } from "../modules/identity/domain/assign-org-role-audited";
import { hasPermission } from "../modules/identity/domain/has-permission";
import { listPermissionCatalog } from "../modules/identity/domain/list-permission-catalog";
import { listUserPermissions } from "../modules/identity/domain/list-user-permissions";
import { revokeOrgRoleWithAudit } from "../modules/identity/domain/revoke-org-role-audited";
import { deleteRbacAuditRow } from "../modules/platform/domain/record-rbac-audit";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../..",
);

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

const ORG_ADMIN_TEMPLATE_ROLE_ID = "22527ba9-7a74-4217-8b2e-986f36e0b444";

describe("permission kernel guards (N10)", () => {
	it("hasPermission returns false for unknown codes", async () => {
		await expect(
			hasPermission({
				orgId: "org-n10",
				userId: "user-n10",
				code: "fft.orders.manage",
			}),
		).resolves.toBe(false);
	});

	it("listUserPermissions rejects empty orgId", async () => {
		await expect(listUserPermissions("  ", "user-a")).rejects.toThrow(
			/orgId/,
		);
	});

	it("listUserPermissions rejects empty userId", async () => {
		await expect(listUserPermissions("org-a", "")).rejects.toThrow(/userId/);
	});
});

describe.skipIf(!hasDatabase)("permission kernel product wiring (N10)", () => {
	const runId = `${Date.now()}`;
	const orgA = `org-n10-a-${runId}`;
	const orgB = `org-n10-b-${runId}`;
	const userId = `user-n10-iso-${runId}`;
	const grantedBy = `user-n10-actor-${runId}`;
	const createdAssignmentIds: Array<{ id: string; orgId: string }> = [];
	const createdAuditIds: Array<{ id: string; orgId: string }> = [];

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

	it("lists catalog codes that include ARCH-023 v1", async () => {
		await ensurePlatformPermissionCatalog(db);
		const catalog = await listPermissionCatalog();
		const codes = catalog.map((row) => row.code);
		for (const code of PLATFORM_PERMISSION_CODES_V1) {
			expect(codes).toContain(code);
		}
	});

	it("two-org: grant in A is not effective in B", async () => {
		const assign = await assignOrgRoleWithAudit({
			orgId: orgA,
			userId,
			roleId: ORG_ADMIN_TEMPLATE_ROLE_ID,
			grantedBy,
			actorUserId: grantedBy,
		});
		expect(assign.ok).toBe(true);
		if (!assign.ok) {
			return;
		}
		createdAssignmentIds.push({ id: assign.assignment.id, orgId: orgA });
		createdAuditIds.push({ id: assign.auditId, orgId: orgA });

		await expect(
			hasPermission({
				orgId: orgA,
				userId,
				code: "org.roles.manage",
				bootstrapRole: "client",
			}),
		).resolves.toBe(true);

		await expect(
			hasPermission({
				orgId: orgB,
				userId,
				code: "org.roles.manage",
				bootstrapRole: "client",
			}),
		).resolves.toBe(false);

		const permsA = await listUserPermissions(orgA, userId);
		const permsB = await listUserPermissions(orgB, userId);
		expect(permsA).toContain("org.roles.manage");
		expect(permsA).toContain("fft.access");
		expect(permsB).toEqual([]);

		const revoked = await revokeOrgRoleWithAudit({
			orgId: orgA,
			assignmentId: assign.assignment.id,
			actorUserId: grantedBy,
		});
		if (revoked.ok) {
			createdAuditIds.push({ id: revoked.auditId, orgId: orgA });
		}
	});
});
