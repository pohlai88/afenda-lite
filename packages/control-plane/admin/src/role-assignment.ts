import {
	database as afendaDatabase,
	and,
	eq,
	isNull,
	platformRole,
	platformRoleAssignment,
} from "@afenda/db";
import { errorIngress, errorResult, type ResultFailure } from "@afenda/errors";

import {
	type AssignRoleWithAuditCommand,
	assignRoleWithAuditCommandSchema,
	type RevokeRoleWithAuditCommand,
	ROLE_ASSIGN_AUDIT_ACTION,
	ROLE_REVOKE_AUDIT_ACTION,
	revokeRoleWithAuditCommandSchema,
} from "./schemas/audit";

const ORGANIZATION_SCOPE = "organization" as const;

interface AuditedAssignmentSqlRow {
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

export interface AuditedRoleAssignmentResult {
	assignment: typeof platformRoleAssignment.$inferSelect;
	auditId: string;
	ok: true;
	reactivated?: boolean;
}

export type AssignRoleWithAuditResult =
	| (AuditedRoleAssignmentResult & { reactivated: boolean })
	| ResultFailure;
export type RevokeRoleWithAuditResult =
	| AuditedRoleAssignmentResult
	| ResultFailure;

function mapAssignment(row: AuditedAssignmentSqlRow) {
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
	const [template] = await afendaDatabase.client
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
	const [organizationRole] = await afendaDatabase.client
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
	return organizationRole ?? null;
}

export async function assignRoleWithAudit(
	input: unknown,
): Promise<AssignRoleWithAuditResult> {
	const parsed = assignRoleWithAuditCommandSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Invalid audited role assignment input",
		});
	}
	const command: AssignRoleWithAuditCommand = parsed.data;
	const role = await findAssignableRole(command.roleId, command.orgId);
	if (!role) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "That role is not assignable in this organization.",
		});
	}

	const [current] = await afendaDatabase.client
		.select()
		.from(platformRoleAssignment)
		.where(
			and(
				eq(platformRoleAssignment.organizationId, command.orgId),
				eq(platformRoleAssignment.userId, command.userId),
				eq(platformRoleAssignment.roleId, command.roleId),
				eq(platformRoleAssignment.scopeType, ORGANIZATION_SCOPE),
				eq(platformRoleAssignment.scopeId, command.orgId),
			),
		)
		.limit(1);
	if (current?.active) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "That role is already assigned to this user.",
		});
	}

	const reactivated = Boolean(current && !current.active);
	const assignmentId = current?.id ?? crypto.randomUUID();
	const newValueJson = JSON.stringify({
		userId: command.userId,
		roleId: command.roleId,
		scopeType: ORGANIZATION_SCOPE,
		reactivated,
	});
	const ipAddress = command.ipAddress ?? null;
	const userAgent = command.userAgent ?? null;

	const [rows] = await afendaDatabase.transaction((sql) => {
		const statement = current
			? sql`
				WITH mutated AS (
					UPDATE platform_role_assignment SET active = true,
						granted_by = ${command.grantedBy}, updated_at = now()
					WHERE id = ${assignmentId} AND organization_id = ${command.orgId}
					RETURNING *
				), audited AS (
					INSERT INTO platform_rbac_audit (
						action, actor_user_id, organization_id, target_type,
						target_id, role_id, new_value, correlation_id, ip_address, user_agent
					)
					SELECT ${ROLE_ASSIGN_AUDIT_ACTION}, ${command.actorUserId}, ${command.orgId},
						${"role_assignment"}, mutated.id, mutated.role_id, ${newValueJson}::jsonb,
						${command.correlationId}, ${ipAddress}, ${userAgent}
					FROM mutated RETURNING id, organization_id
				)
				SELECT mutated.*, audited.id AS audit_id FROM mutated
				INNER JOIN audited ON audited.organization_id = mutated.organization_id
			`
			: sql`
				WITH mutated AS (
					INSERT INTO platform_role_assignment (
						id, user_id, organization_id, role_id, scope_type, scope_id, active, granted_by
					) VALUES (
						${assignmentId}, ${command.userId}, ${command.orgId}, ${command.roleId},
						${ORGANIZATION_SCOPE}, ${command.orgId}, true, ${command.grantedBy}
					) RETURNING *
				), audited AS (
					INSERT INTO platform_rbac_audit (
						action, actor_user_id, organization_id, target_type,
						target_id, role_id, new_value, correlation_id, ip_address, user_agent
					)
					SELECT ${ROLE_ASSIGN_AUDIT_ACTION}, ${command.actorUserId}, ${command.orgId},
						${"role_assignment"}, mutated.id, mutated.role_id, ${newValueJson}::jsonb,
						${command.correlationId}, ${ipAddress}, ${userAgent}
					FROM mutated RETURNING id, organization_id
				)
				SELECT mutated.*, audited.id AS audit_id FROM mutated
				INNER JOIN audited ON audited.organization_id = mutated.organization_id
			`;
		return [statement];
	});
	const [row] = rows;
	if (!row) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "The request is invalid",
		});
	}
	if (row.organization_id !== command.orgId) {
		throw errorIngress.code("INTERNAL_ERROR", {
			operation: "admin.role.assign",
		});
	}
	return {
		ok: true,
		assignment: mapAssignment(row),
		reactivated,
		auditId: row.audit_id,
	};
}

export async function revokeRoleWithAudit(
	input: unknown,
): Promise<RevokeRoleWithAuditResult> {
	const parsed = revokeRoleWithAuditCommandSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Invalid audited role revocation input",
		});
	}
	const command: RevokeRoleWithAuditCommand = parsed.data;
	const [active] = await afendaDatabase.client
		.select()
		.from(platformRoleAssignment)
		.where(
			and(
				eq(platformRoleAssignment.id, command.assignmentId),
				eq(platformRoleAssignment.organizationId, command.orgId),
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
	const ipAddress = command.ipAddress ?? null;
	const userAgent = command.userAgent ?? null;
	const [rows] = await afendaDatabase.transaction((sql) => [
		sql`
		WITH mutated AS (
			UPDATE platform_role_assignment SET active = false, updated_at = now()
			WHERE id = ${command.assignmentId} AND organization_id = ${command.orgId} AND active = true
			RETURNING *
		), audited AS (
			INSERT INTO platform_rbac_audit (
				action, actor_user_id, organization_id, target_type, target_id,
				role_id, old_value, new_value, correlation_id, ip_address, user_agent
			)
			SELECT ${ROLE_REVOKE_AUDIT_ACTION}, ${command.actorUserId}, ${command.orgId},
				${"role_assignment"}, mutated.id, mutated.role_id, ${oldValueJson}::jsonb,
				${newValueJson}::jsonb, ${command.correlationId}, ${ipAddress}, ${userAgent}
			FROM mutated RETURNING id, organization_id
		)
		SELECT mutated.*, audited.id AS audit_id FROM mutated
		INNER JOIN audited ON audited.organization_id = mutated.organization_id
	`,
	]);
	const [row] = rows;
	if (!row) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Active assignment not found for this organization.",
		});
	}
	if (row.organization_id !== command.orgId) {
		throw errorIngress.code("INTERNAL_ERROR", {
			operation: "admin.role.revoke",
		});
	}
	return { ok: true, assignment: mapAssignment(row), auditId: row.audit_id };
}
