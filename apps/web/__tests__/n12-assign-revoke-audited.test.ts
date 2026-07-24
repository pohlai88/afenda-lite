/**
 * N12 — assign/revoke + audit atomic domain entry points (Neon HTTP tx).
 */

import {
	deleteRbacAuditRow,
	ROLE_ASSIGN_AUDIT_ACTION,
	ROLE_REVOKE_AUDIT_ACTION,
} from "@afenda/admin/audit";
import {
	and,
	db,
	eq,
	platformRbacAudit,
	platformRoleAssignment,
	withOrg,
} from "@afenda/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assignOrgRoleWithAudit } from "../modules/identity/domain/assign-org-role-audited";
import { revokeOrgRoleWithAudit } from "../modules/identity/domain/revoke-org-role-audited";
import {
	hasDatabase,
	resolveSystemTemplateRoleId,
} from "./helpers/identity-database";

const createdAssignmentIds: Array<{ id: string; orgId: string }> = [];
const createdAuditIds: Array<{ id: string; orgId: string }> = [];

describe.skipIf(!hasDatabase)("assign/revoke WithAudit atomicity (N12)", () => {
	const runId = `${Date.now()}`;
	let orgAdminRoleId = "";

	beforeAll(async () => {
		orgAdminRoleId = await resolveSystemTemplateRoleId("org_admin");
	});

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
			roleId: orgAdminRoleId,
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
			roleId: orgAdminRoleId,
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
