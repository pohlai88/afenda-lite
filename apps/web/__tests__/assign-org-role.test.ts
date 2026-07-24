/**
 * GUIDE-018 I3.1 — assign org role Zod + hard-tenancy audited write (N12 Path-to-100%).
 */

import { deleteRbacAuditRow } from "@afenda/admin/audit";
import { and, db, eq, platformRoleAssignment, withOrg } from "@afenda/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assignOrgRoleWithAudit } from "../modules/identity/domain/assign-org-role-audited";
import { parseAssignOrgRoleCommand } from "../modules/identity/schemas/assign-org-role";
import {
	hasDatabase,
	resolveSystemTemplateRoleId,
} from "./helpers/identity-database";

const createdAssignmentIds: Array<{ id: string; orgId: string }> = [];
const createdAuditIds: Array<{ id: string; orgId: string }> = [];
const SAMPLE_ROLE_ID = "00000000-0000-4000-8000-000000000001";

describe("parseAssignOrgRoleCommand (I3.1)", () => {
	it("accepts trimmed userId and uuid roleId", () => {
		expect(
			parseAssignOrgRoleCommand({
				userId: "  user-abc  ",
				roleId: SAMPLE_ROLE_ID,
			}),
		).toEqual({
			userId: "user-abc",
			roleId: SAMPLE_ROLE_ID,
		});
	});

	it("rejects empty userId", () => {
		expect(() =>
			parseAssignOrgRoleCommand({
				userId: "   ",
				roleId: SAMPLE_ROLE_ID,
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
		let orgAdminRoleId = "";

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

		it("assigns a system template role under hard organization_id with auditId", async () => {
			const result = await assignOrgRoleWithAudit({
				orgId: orgA,
				userId,
				roleId: orgAdminRoleId,
				grantedBy,
				actorUserId: grantedBy,
				correlationId: "test-correlation-id",
			});
			if (!result.ok) {
				expect.fail(`${result.code}: ${result.message}`);
			}

			createdAssignmentIds.push({ id: result.assignment.id, orgId: orgA });
			createdAuditIds.push({ id: result.auditId, orgId: orgA });
			expect(result.assignment.organizationId).toBe(orgA);
			expect(result.assignment.roleId).toBe(orgAdminRoleId);
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
				roleId: orgAdminRoleId,
				grantedBy,
				actorUserId: grantedBy,
				correlationId: "test-correlation-id",
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
				correlationId: "test-correlation-id",
			});
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.code).toBe("NOT_FOUND");
			}
		});
	},
);
