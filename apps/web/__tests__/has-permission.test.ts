/**
 * GUIDE-018 I3.1 — Tier-2 hasPermission + admin bootstrap (N12 Path-to-100% WithAudit).
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, db, eq, platformRoleAssignment } from "@afenda/db";
import { afterAll, describe, expect, it } from "vitest";

import { assignOrgRoleWithAudit } from "../modules/identity/domain/assign-org-role-audited";
import { hasPermission } from "../modules/identity/domain/has-permission";
import { revokeOrgRoleWithAudit } from "../modules/identity/domain/revoke-org-role-audited";
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

const ORG_ADMIN_TEMPLATE_ROLE_ID = "22527ba9-7a74-4217-8b2e-986f36e0b444";
const VIEWER_TEMPLATE_ROLE_ID = "d9305ced-bbd5-493b-9b78-80ebb78c6450";

describe("hasPermission guards (I3.1 / N10)", () => {
	it("rejects empty orgId before touching the database", async () => {
		await expect(
			hasPermission({
				orgId: "   ",
				userId: "user-a",
				code: "org.roles.manage",
			}),
		).rejects.toThrow(/orgId/);
	});

	it("rejects empty permission code", async () => {
		await expect(
			hasPermission({
				orgId: "org-a",
				userId: "user-a",
				code: "",
			}),
		).rejects.toThrow(/code/);
	});

	it("returns false for unknown (non-v1) permission codes", async () => {
		await expect(
			hasPermission({
				orgId: "org-a",
				userId: "user-a",
				code: "invented.permission",
				bootstrapRole: "admin",
			}),
		).resolves.toBe(false);
	});
});

describe.skipIf(!hasDatabase)("hasPermission product wiring (I3.1)", () => {
	const runId = `${Date.now()}`;
	const orgId = `org-i31-perm-a-${runId}`;
	const grantedBy = `user-i31-perm-actor-${runId}`;

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

	it("bootstraps admin only when the actor has zero active assignments", async () => {
		const unassignedUser = `user-i31-perm-bootstrap-${runId}`;

		await expect(
			hasPermission({
				orgId,
				userId: unassignedUser,
				code: "org.roles.manage",
				bootstrapRole: "admin",
			}),
		).resolves.toBe(true);

		await expect(
			hasPermission({
				orgId,
				userId: unassignedUser,
				code: "org.roles.manage",
				bootstrapRole: "operator",
			}),
		).resolves.toBe(false);
	});

	it("grants via assignment → role_permission and denies without the code", async () => {
		const adminUser = `user-i31-perm-admin-${runId}`;
		const viewerUser = `user-i31-perm-viewer-${runId}`;

		const adminAssign = await assignOrgRoleWithAudit({
			orgId,
			userId: adminUser,
			roleId: ORG_ADMIN_TEMPLATE_ROLE_ID,
			grantedBy,
			actorUserId: grantedBy,
			correlationId: "test-correlation-id",
		});
		expect(adminAssign.ok).toBe(true);
		if (!adminAssign.ok) {
			return;
		}
		createdAssignmentIds.push({ id: adminAssign.assignment.id, orgId });
		createdAuditIds.push({ id: adminAssign.auditId, orgId });

		const viewerAssign = await assignOrgRoleWithAudit({
			orgId,
			userId: viewerUser,
			roleId: VIEWER_TEMPLATE_ROLE_ID,
			grantedBy,
			actorUserId: grantedBy,
			correlationId: "test-correlation-id",
		});
		expect(viewerAssign.ok).toBe(true);
		if (!viewerAssign.ok) {
			return;
		}
		createdAssignmentIds.push({ id: viewerAssign.assignment.id, orgId });
		createdAuditIds.push({ id: viewerAssign.auditId, orgId });

		await expect(
			hasPermission({
				orgId,
				userId: adminUser,
				code: "org.roles.manage",
				bootstrapRole: "client",
			}),
		).resolves.toBe(true);

		await expect(
			hasPermission({
				orgId,
				userId: viewerUser,
				code: "org.roles.manage",
				bootstrapRole: "admin",
			}),
		).resolves.toBe(false);

		await expect(
			hasPermission({
				orgId,
				userId: viewerUser,
				code: "declarations.read",
			}),
		).resolves.toBe(true);

		await expect(
			hasPermission({
				orgId: `${orgId}-other`,
				userId: viewerUser,
				code: "declarations.read",
				bootstrapRole: "client",
			}),
		).resolves.toBe(false);

		const adminRevoke = await revokeOrgRoleWithAudit({
			orgId,
			assignmentId: adminAssign.assignment.id,
			actorUserId: grantedBy,
			correlationId: "test-correlation-id",
		});
		if (adminRevoke.ok) {
			createdAuditIds.push({ id: adminRevoke.auditId, orgId });
		}
		const viewerRevoke = await revokeOrgRoleWithAudit({
			orgId,
			assignmentId: viewerAssign.assignment.id,
			actorUserId: grantedBy,
			correlationId: "test-correlation-id",
		});
		if (viewerRevoke.ok) {
			createdAuditIds.push({ id: viewerRevoke.auditId, orgId });
		}
	});
});
