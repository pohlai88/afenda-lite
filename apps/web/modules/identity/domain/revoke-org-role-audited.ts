/**
 * Identity — soft-revoke org role + platform RBAC audit in one Neon HTTP
 * transaction (N12 residual · ARCH-025 · ARCH-023).
 */
import {
	and,
	db,
	eq,
	platformRoleAssignment,
	runNeonHttpTransaction,
} from "@afenda/db";

import type {
	RevokeOrgRoleInput,
	RevokeOrgRoleResult,
} from "@/modules/identity/domain/revoke-org-role";
import { ROLE_REVOKE_AUDIT_ACTION } from "@/modules/platform/domain/record-rbac-audit";

export type RevokeOrgRoleWithAuditInput = RevokeOrgRoleInput & {
	actorUserId: string;
};

export type RevokeOrgRoleWithAuditOk = {
	ok: true;
	assignment: typeof platformRoleAssignment.$inferSelect;
	auditId: string;
};

export type RevokeOrgRoleWithAuditResult =
	| RevokeOrgRoleWithAuditOk
	| Extract<RevokeOrgRoleResult, { ok: false }>;

type RevokeAuditedSqlRow = {
	id: string;
	user_id: string;
	organization_id: string;
	role_id: string;
	scope_type: string;
	scope_id: string | null;
	active: boolean;
	granted_by: string | null;
	created_at: string | Date;
	updated_at: string | Date;
	audit_id: string;
};

function requireTrimmed(value: string, field: string, context: string): string {
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		throw new Error(`${context} requires non-empty ${field}`);
	}
	return trimmed;
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
		return {
			ok: false,
			code: "NOT_FOUND",
			message: "Active assignment not found for this organization.",
		};
	}

	const oldValueJson = JSON.stringify({
		userId: active.userId,
		roleId: active.roleId,
		scopeType: active.scopeType,
		active: true,
	});
	const newValueJson = JSON.stringify({ active: false });

	const [rows] = await runNeonHttpTransaction<[RevokeAuditedSqlRow[]]>(
		(sql) => [
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
						new_value
					)
					SELECT
						${ROLE_REVOKE_AUDIT_ACTION},
						${actorUserId},
						${orgId},
						${"role_assignment"},
						mutated.id,
						mutated.role_id,
						${oldValueJson}::jsonb,
						${newValueJson}::jsonb
					FROM mutated
					RETURNING id, organization_id
				)
				SELECT
					mutated.*,
					audited.id AS audit_id
				FROM mutated
				INNER JOIN audited ON audited.organization_id = mutated.organization_id
			`,
		],
	);

	const row = rows[0];
	if (!row) {
		return {
			ok: false,
			code: "NOT_FOUND",
			message: "Active assignment not found for this organization.",
		};
	}

	if (row.organization_id !== orgId) {
		throw new Error(
			"revokeOrgRoleWithAudit: assignment organization_id mismatch after commit",
		);
	}

	return {
		ok: true,
		assignment: mapAssignmentRow(row),
		auditId: row.audit_id,
	};
}
