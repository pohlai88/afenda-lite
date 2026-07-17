/**
 * Identity — assign org role + platform RBAC audit in one Neon HTTP transaction
 * (N12 residual · ARCH-025 · ARCH-023).
 */
import {
	and,
	db,
	eq,
	isNull,
	platformRole,
	platformRoleAssignment,
	runNeonHttpTransaction,
} from "@afenda/db";

import {
	type AssignOrgRoleInput,
	type AssignOrgRoleResult,
	ORGANIZATION_SCOPE,
} from "@/modules/identity/domain/assign-org-role";
import { ROLE_ASSIGN_AUDIT_ACTION } from "@/modules/platform/domain/record-rbac-audit";
import { requireTrimmed } from "@/modules/platform/domain/require-trimmed";

export type AssignOrgRoleWithAuditInput = AssignOrgRoleInput & {
	actorUserId: string;
	/** API-007 — stamped on `platform_rbac_audit.correlation_id`. */
	correlationId: string;
};

export type AssignOrgRoleWithAuditOk = {
	ok: true;
	assignment: typeof platformRoleAssignment.$inferSelect;
	reactivated: boolean;
	auditId: string;
};

export type AssignOrgRoleWithAuditResult =
	| AssignOrgRoleWithAuditOk
	| Extract<AssignOrgRoleResult, { ok: false }>;

type AssignAuditedSqlRow = {
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

function mapAssignmentRow(
	row: AssignAuditedSqlRow,
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

async function findAssignableRole(roleId: string, orgId: string) {
	const [template] = await db
		.select()
		.from(platformRole)
		.where(
			and(
				eq(platformRole.id, roleId),
				eq(platformRole.active, true),
				eq(platformRole.isSystemTemplate, true),
				isNull(platformRole.organizationId),
			),
		)
		.limit(1);

	if (template) {
		return template;
	}

	const [orgRole] = await db
		.select()
		.from(platformRole)
		.where(
			and(
				eq(platformRole.id, roleId),
				eq(platformRole.active, true),
				eq(platformRole.organizationId, orgId),
			),
		)
		.limit(1);

	return orgRole ?? null;
}

/**
 * Assign (or reactivate) a role and stamp `role.assign` audit atomically
 * via Neon HTTP `sql.transaction` (ReadCommitted). Mutate + audit share one
 * CTE statement so an empty mutate cannot leave an orphan audit row.
 */
export async function assignOrgRoleWithAudit(
	input: AssignOrgRoleWithAuditInput,
): Promise<AssignOrgRoleWithAuditResult> {
	const orgId = requireTrimmed(input.orgId, "orgId", "assignOrgRoleWithAudit");
	const userId = requireTrimmed(
		input.userId,
		"userId",
		"assignOrgRoleWithAudit",
	);
	const grantedBy = requireTrimmed(
		input.grantedBy,
		"grantedBy",
		"assignOrgRoleWithAudit",
	);
	const roleId = requireTrimmed(
		input.roleId,
		"roleId",
		"assignOrgRoleWithAudit",
	);
	const actorUserId = requireTrimmed(
		input.actorUserId,
		"actorUserId",
		"assignOrgRoleWithAudit",
	);
	const correlationId = requireTrimmed(
		input.correlationId,
		"correlationId",
		"assignOrgRoleWithAudit",
	);

	const role = await findAssignableRole(roleId, orgId);
	if (!role) {
		return {
			ok: false,
			code: "NOT_FOUND",
			message: "That role is not assignable in this organization.",
		};
	}

	const existing = await db
		.select()
		.from(platformRoleAssignment)
		.where(
			and(
				eq(platformRoleAssignment.organizationId, orgId),
				eq(platformRoleAssignment.userId, userId),
				eq(platformRoleAssignment.roleId, roleId),
				eq(platformRoleAssignment.scopeType, ORGANIZATION_SCOPE),
				eq(platformRoleAssignment.scopeId, orgId),
			),
		)
		.limit(1);

	const current = existing[0];
	if (current?.active) {
		return {
			ok: false,
			code: "CONFLICT",
			message: "That role is already assigned to this user.",
		};
	}

	const reactivated = Boolean(current && !current.active);
	const assignmentId = current?.id ?? crypto.randomUUID();
	const newValueJson = JSON.stringify({
		userId,
		roleId,
		scopeType: ORGANIZATION_SCOPE,
		reactivated,
	});

	const [rows] = await runNeonHttpTransaction<[AssignAuditedSqlRow[]]>(
		(sql) => {
			const statement = current
				? sql`
						WITH mutated AS (
							UPDATE platform_role_assignment
							SET
								active = true,
								granted_by = ${grantedBy},
								updated_at = now()
							WHERE id = ${assignmentId}
								AND organization_id = ${orgId}
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
								new_value,
								correlation_id
							)
							SELECT
								${ROLE_ASSIGN_AUDIT_ACTION},
								${actorUserId},
								${orgId},
								${"role_assignment"},
								mutated.id,
								mutated.role_id,
								${newValueJson}::jsonb,
								${correlationId}
							FROM mutated
							RETURNING id, organization_id
						)
						SELECT
							mutated.*,
							audited.id AS audit_id
						FROM mutated
						INNER JOIN audited ON audited.organization_id = mutated.organization_id
					`
				: sql`
						WITH mutated AS (
							INSERT INTO platform_role_assignment (
								id,
								user_id,
								organization_id,
								role_id,
								scope_type,
								scope_id,
								active,
								granted_by
							)
							VALUES (
								${assignmentId},
								${userId},
								${orgId},
								${roleId},
								${ORGANIZATION_SCOPE},
								${orgId},
								true,
								${grantedBy}
							)
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
								new_value,
								correlation_id
							)
							SELECT
								${ROLE_ASSIGN_AUDIT_ACTION},
								${actorUserId},
								${orgId},
								${"role_assignment"},
								mutated.id,
								mutated.role_id,
								${newValueJson}::jsonb,
								${correlationId}
							FROM mutated
							RETURNING id, organization_id
						)
						SELECT
							mutated.*,
							audited.id AS audit_id
						FROM mutated
						INNER JOIN audited ON audited.organization_id = mutated.organization_id
					`;

			return [statement];
		},
	);

	const row = rows[0];
	if (!row) {
		return {
			ok: false,
			code: "BAD_REQUEST",
			message: reactivated
				? "Assignment could not be reactivated."
				: "Assignment could not be created.",
		};
	}

	if (row.organization_id !== orgId) {
		throw new Error(
			"assignOrgRoleWithAudit: assignment organization_id mismatch after commit",
		);
	}

	return {
		ok: true,
		assignment: mapAssignmentRow(row),
		reactivated,
		auditId: row.audit_id,
	};
}
