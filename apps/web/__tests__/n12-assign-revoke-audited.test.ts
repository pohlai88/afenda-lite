/**
 * N12 — assign/revoke + audit atomic domain entry points (Neon HTTP tx).
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	and,
	db,
	eq,
	platformRbacAudit,
	platformRoleAssignment,
	withOrg,
} from "@afenda/db";
import { afterAll, describe, expect, it } from "vitest";

import { assignOrgRoleWithAudit } from "../modules/identity/domain/assign-org-role-audited";
import { revokeOrgRoleWithAudit } from "../modules/identity/domain/revoke-org-role-audited";
import {
	deleteRbacAuditRow,
	ROLE_ASSIGN_AUDIT_ACTION,
	ROLE_REVOKE_AUDIT_ACTION,
} from "../modules/platform/domain/record-rbac-audit";

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

describe.skipIf(!hasDatabase)("assign/revoke WithAudit atomicity (N12)", () => {
	const runId = `${Date.now()}`;
	const orgA = `org-n12-audited-a-${runId}`;
	const userId = `user-n12-audited-target-${runId}`;
	const actorUserId = `user-n12-audited-actor-${runId}`;

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

	it("assignOrgRoleWithAudit returns auditId and both rows under same org", async () => {
		const result = await assignOrgRoleWithAudit({
			orgId: orgA,
			userId,
			roleId: ORG_ADMIN_TEMPLATE_ROLE_ID,
			grantedBy: actorUserId,
			actorUserId,
			correlationId: "test-correlation-id",
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		createdAssignmentIds.push({ id: result.assignment.id, orgId: orgA });
		createdAuditIds.push({ id: result.auditId, orgId: orgA });

		expect(result.assignment.organizationId).toBe(orgA);
		expect(result.reactivated).toBe(false);
		expect(result.auditId).toBeTruthy();

		const assignments = await withOrg(platformRoleAssignment, orgA);
		expect(assignments.some((row) => row.id === result.assignment.id)).toBe(
			true,
		);

		const audits = await db
			.select()
			.from(platformRbacAudit)
			.where(
				and(
					eq(platformRbacAudit.id, result.auditId),
					eq(platformRbacAudit.organizationId, orgA),
					eq(platformRbacAudit.action, ROLE_ASSIGN_AUDIT_ACTION),
				),
			);
		expect(audits).toHaveLength(1);
		expect(audits[0]?.targetId).toBe(result.assignment.id);
		expect(audits[0]?.correlationId).toBe("test-correlation-id");
	});

	it("revokeOrgRoleWithAudit returns auditId and soft-revokes under same org", async () => {
		const assigned = await assignOrgRoleWithAudit({
			orgId: orgA,
			userId: `${userId}-revoke`,
			roleId: ORG_ADMIN_TEMPLATE_ROLE_ID,
			grantedBy: actorUserId,
			actorUserId,
			correlationId: "test-correlation-id",
		});
		expect(assigned.ok).toBe(true);
		if (!assigned.ok) {
			return;
		}

		createdAssignmentIds.push({ id: assigned.assignment.id, orgId: orgA });
		createdAuditIds.push({ id: assigned.auditId, orgId: orgA });

		const revoked = await revokeOrgRoleWithAudit({
			orgId: orgA,
			assignmentId: assigned.assignment.id,
			actorUserId,
			correlationId: "test-correlation-id",
		});
		expect(revoked.ok).toBe(true);
		if (!revoked.ok) {
			return;
		}

		createdAuditIds.push({ id: revoked.auditId, orgId: orgA });
		expect(revoked.assignment.active).toBe(false);
		expect(revoked.assignment.organizationId).toBe(orgA);

		const audits = await db
			.select()
			.from(platformRbacAudit)
			.where(
				and(
					eq(platformRbacAudit.id, revoked.auditId),
					eq(platformRbacAudit.organizationId, orgA),
					eq(platformRbacAudit.action, ROLE_REVOKE_AUDIT_ACTION),
				),
			);
		expect(audits).toHaveLength(1);
		expect(audits[0]?.targetId).toBe(assigned.assignment.id);
	});
});
