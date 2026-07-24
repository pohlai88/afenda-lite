/**
 * N10 — Permission kernel: catalog gate, list ports, two-org authz isolation.
 * Assign/revoke via WithAudit (N12 Path-to-100%).
 */

import { deleteRbacAuditRow } from "@afenda/admin/audit";
import {
	and,
	db,
	eq,
	PLATFORM_PERMISSION_CODES_V1,
	platformRoleAssignment,
} from "@afenda/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assignOrgRoleWithAudit } from "../modules/identity/domain/assign-org-role-audited";
import { hasPermission } from "../modules/identity/domain/has-permission";
import { listPermissionCatalog } from "../modules/identity/domain/list-permission-catalog";
import { listUserPermissions } from "../modules/identity/domain/list-user-permissions";
import { revokeOrgRoleWithAudit } from "../modules/identity/domain/revoke-org-role-audited";
import {
	hasDatabase,
	resolveSystemTemplateRoleId,
} from "./helpers/identity-database";

describe("permission kernel guards (N10)", () => {
	it("hasPermission returns false for unknown codes", async () => {
		await expect(
			hasPermission({
				orgId: "org-n10",
				userId: "user-n10",
				code: "unknown.permission.code",
			}),
		).resolves.toBe(false);
	});

	it("listUserPermissions rejects empty orgId", async () => {
		await expect(listUserPermissions("  ", "user-a")).rejects.toThrow(/orgId/);
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
	let orgAdminRoleId = "";
	const createdAssignmentIds: Array<{ id: string; orgId: string }> = [];
	const createdAuditIds: Array<{ id: string; orgId: string }> = [];

	beforeAll(async () => {
		orgAdminRoleId = await resolveSystemTemplateRoleId("org_admin");
	});

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
			roleId: orgAdminRoleId,
			grantedBy,
			actorUserId: grantedBy,
			correlationId: "test-correlation-id",
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
		expect(permsA).toContain("clients.invite");
		expect(permsA).toContain("account.self");
		expect(permsB).toEqual([]);

		const revoked = await revokeOrgRoleWithAudit({
			orgId: orgA,
			assignmentId: assign.assignment.id,
			actorUserId: grantedBy,
			correlationId: "test-correlation-id",
		});
		if (revoked.ok) {
			createdAuditIds.push({ id: revoked.auditId, orgId: orgA });
		}
	});
});
