/**
 * GUIDE-018 I3.1 — revoke org role Zod + hard-tenancy soft-revoke with audit (N12 Path-to-100%).
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, db, eq, platformRoleAssignment } from "@afenda/db";
import { afterAll, describe, expect, it } from "vitest";

import { assignOrgRoleWithAudit } from "../modules/identity/domain/assign-org-role-audited";
import { revokeOrgRoleWithAudit } from "../modules/identity/domain/revoke-org-role-audited";
import { parseRevokeOrgRoleCommand } from "../modules/identity/schemas/revoke-org-role";
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

const VIEWER_TEMPLATE_ROLE_ID = "d9305ced-bbd5-493b-9b78-80ebb78c6450";

describe("parseRevokeOrgRoleCommand (I3.1)", () => {
	it("accepts uuid assignmentId", () => {
		expect(
			parseRevokeOrgRoleCommand({
				assignmentId: "9b42b710-000d-44fb-816e-a0b1cd946ac1",
			}),
		).toEqual({ assignmentId: "9b42b710-000d-44fb-816e-a0b1cd946ac1" });
	});

	it("rejects non-uuid assignmentId", () => {
		expect(() =>
			parseRevokeOrgRoleCommand({ assignmentId: "not-a-uuid" }),
		).toThrow();
	});
});

describe.skipIf(!hasDatabase)("revokeOrgRoleWithAudit tenancy (I3.1)", () => {
	const runId = `${Date.now()}`;
	const orgA = `org-i31-revoke-a-${runId}`;
	const orgB = `org-i31-revoke-b-${runId}`;
	const userId = `user-i31-revoke-target-${runId}`;
	const grantedBy = `user-i31-revoke-actor-${runId}`;

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

	it("soft-revokes only when id and organization_id match", async () => {
		const assigned = await assignOrgRoleWithAudit({
			orgId: orgA,
			userId,
			roleId: VIEWER_TEMPLATE_ROLE_ID,
			grantedBy,
			actorUserId: grantedBy,
			correlationId: "test-correlation-id",
		});
		expect(assigned.ok).toBe(true);
		if (!assigned.ok) {
			return;
		}
		createdAssignmentIds.push({ id: assigned.assignment.id, orgId: orgA });
		createdAuditIds.push({ id: assigned.auditId, orgId: orgA });

		const wrongOrg = await revokeOrgRoleWithAudit({
			orgId: orgB,
			assignmentId: assigned.assignment.id,
			actorUserId: grantedBy,
			correlationId: "test-correlation-id",
		});
		expect(wrongOrg.ok).toBe(false);
		if (!wrongOrg.ok) {
			expect(wrongOrg.code).toBe("NOT_FOUND");
		}

		const revoked = await revokeOrgRoleWithAudit({
			orgId: orgA,
			assignmentId: assigned.assignment.id,
			actorUserId: grantedBy,
			correlationId: "test-correlation-id",
		});
		expect(revoked.ok).toBe(true);
		if (!revoked.ok) {
			return;
		}
		createdAuditIds.push({ id: revoked.auditId, orgId: orgA });
		expect(revoked.assignment.active).toBe(false);
		expect(revoked.auditId).toBeTruthy();

		const second = await revokeOrgRoleWithAudit({
			orgId: orgA,
			assignmentId: assigned.assignment.id,
			actorUserId: grantedBy,
			correlationId: "test-correlation-id",
		});
		expect(second.ok).toBe(false);
		if (!second.ok) {
			expect(second.code).toBe("NOT_FOUND");
		}

		const reactivated = await assignOrgRoleWithAudit({
			orgId: orgA,
			userId,
			roleId: VIEWER_TEMPLATE_ROLE_ID,
			grantedBy,
			actorUserId: grantedBy,
			correlationId: "test-correlation-id",
		});
		expect(reactivated.ok).toBe(true);
		if (!reactivated.ok) {
			return;
		}
		createdAuditIds.push({ id: reactivated.auditId, orgId: orgA });
		expect(reactivated.reactivated).toBe(true);
		expect(reactivated.assignment.id).toBe(assigned.assignment.id);

		const finalRevoke = await revokeOrgRoleWithAudit({
			orgId: orgA,
			assignmentId: reactivated.assignment.id,
			actorUserId: grantedBy,
			correlationId: "test-correlation-id",
		});
		if (finalRevoke.ok) {
			createdAuditIds.push({ id: finalRevoke.auditId, orgId: orgA });
		}
	});
});
