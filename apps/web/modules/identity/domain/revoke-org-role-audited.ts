/**
 * Identity — soft-revoke org role + platform RBAC audit in one Neon HTTP
 * transaction (N12 residual · ARCH-025 · ARCH-023).
 */

import { ROLE_REVOKE_AUDIT_ACTION } from "@afenda/admin/audit";
import {
	and,
	db,
	eq,
	platformRoleAssignment,
	runNeonHttpTransaction,
} from "@afenda/db";
import { errorIngress, errorResult } from "@afenda/errors";

import type {
	RevokeOrgRoleInput,
	RevokeOrgRoleResult,
} from "@/modules/identity/domain/revoke-org-role";
import { requireTrimmed } from "@/modules/platform/domain/require-trimmed";

export type RevokeOrgRoleWithAuditInput = RevokeOrgRoleInput & {
	actorUserId: string;
	/** API-007 — stamped on `platform_rbac_audit.correlation_id`. */
	correlationId: string;
	ipAddress?: string;
	userAgent?: string;
};

export interface RevokeOrgRoleWithAuditOk {
	assignment: typeof platformRoleAssignment.$inferSelect;
	auditId: string;
	ok: true;
}

export type RevokeOrgRoleWithAuditResult =
	| RevokeOrgRoleWithAuditOk
	| Extract<RevokeOrgRoleResult, { ok: false }>;

interface RevokeAuditedSqlRow {
	active: boolean;
	audit_id: string;
	created_at: string | Date;
	granted_by: string | null;
	id: string;
	organization_id: string;
	role_id: string;
	scope_id: string | null;
	scope_type: string;
	updated_at: string | Date;
	user_id: string;
}

function mapAssignmentRow(
	row: RevokeAuditedSqlRow,
): typeof platformRoleAssignment.$inferSelect {
	return {
		id: row.id,
		userId: row.user_id,
		organizationId: row.organization_id,
		roleId: row.role_id,
		scopeType: row.scope_type,
		scopeId: row.scope_id,
		active: row.active,
		grantedBy: row.granted_by,
		createdAt:
			row.created_at instanceof Date
				? row.created_at
				: new Date(row.created_at),
		updatedAt:
			row.updated_at instanceof Date
				? row.updated_at
				: new Date(row.updated_at),
	};
}

/**
 * Soft-revoke an active assignment and stamp `role.revoke` audit atomically
 * via Neon HTTP `sql.transaction` (ReadCommitted). Mutate + audit share one
 * CTE statement so an empty mutate cannot leave an orphan audit row.
 */
export async function revokeOrgRoleWithAudit(
	input: RevokeOrgRoleWithAuditInput,
): Promise<RevokeOrgRoleWithAuditResult> {
	const orgId = requireTrimmed(input.orgId, "orgId", "revokeOrgRoleWithAudit");
	const assignmentId = requireTrimmed(
		input.assignmentId,
		"assignmentId",
		"revokeOrgRoleWithAudit",
	);
	const actorUserId = requireTrimmed(
		input.actorUserId,
		"actorUserId",
		"revokeOrgRoleWithAudit",
	);
	const correlationId = requireTrimmed(
		input.correlationId,
		"correlationId",
		"revokeOrgRoleWithAudit",
	);
	const ipAddress = input.ipAddress?.trim() || null;
	const userAgent = input.userAgent?.trim() || null;

	const [active] = await db
		.select()
		.from(platformRoleAssignment)
		.where(
			and(
				eq(platformRoleAssignment.id, assignmentId),
				eq(platformRoleAssignment.organizationId, orgId),
				eq(platformRoleAssignment.active, true),
			),
		)
		.limit(1);

	if (!active) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Active assignment not found for this organization.",
		});
	}

	const oldValueJson = JSON.stringify({
		userId: active.userId,
		roleId: active.roleId,
		scopeType: active.scopeType,
		active: true,
	});
	const newValueJson = JSON.stringify({ active: false });

	const [rows] = await runNeonHttpTransaction((sql) => [
		sql`
				WITH mutated AS (
					UPDATE platform_role_assignment
					SET
						active = false,
						updated_at = now()
					WHERE id = ${assignmentId}
						AND organization_id = ${orgId}
						AND active = true
					RETURNING *
				),
				audited AS (
					INSERT INTO platform_rbac_audit (
						action,
						actor_user_id,
						organization_id,
						target_type,
						target_id,
						role_id,
						old_value,
						new_value,
						correlation_id,
						ip_address,
						user_agent
					)
					SELECT
						${ROLE_REVOKE_AUDIT_ACTION},
						${actorUserId},
						${orgId},
						${"role_assignment"},
						mutated.id,
						mutated.role_id,
						${oldValueJson}::jsonb,
						${newValueJson}::jsonb,
						${correlationId},
						${ipAddress},
						${userAgent}
					FROM mutated
					RETURNING id, organization_id
				)
				SELECT
					mutated.*,
					audited.id AS audit_id
				FROM mutated
				INNER JOIN audited ON audited.organization_id = mutated.organization_id
			`,
	]);

	const [row] = rows;
	if (!row) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Active assignment not found for this organization.",
		});
	}

	if (row.organization_id !== orgId) {
		throw errorIngress.code("INTERNAL_ERROR", {
			operation: "identity.role.revoke",
		});
	}

	return {
		ok: true,
		assignment: mapAssignmentRow(row),
		auditId: row.audit_id,
	};
}
