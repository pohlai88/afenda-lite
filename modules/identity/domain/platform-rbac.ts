/**
 * Platform RBAC domain ports (ADR-002).
 * Pure SQL + catalog — no Request / cookies / UI.
 */

import "server-only";

import { pool } from "@/modules/platform/db";
import {
  PLATFORM_PERMISSION_CATALOG,
  PLATFORM_ROLE_TEMPLATES,
  isPlatformPermissionCode,
  isPlatformSensitivePermission,
  type PlatformPermissionCode,
  type PlatformScopeType,
} from "@/modules/identity/domain/platform-rbac-catalog";
import type {
  CreatePlatformRoleInput,
  OrganizationId,
  PlatformRoleId,
  UpdatePlatformRoleInput,
} from "@/modules/identity/schemas/platform-rbac";
import { asPlatformRoleId } from "@/modules/identity/schemas/platform-rbac";

export type PlatformRoleRow = {
  id: PlatformRoleId;
  organizationId: string | null;
  name: string;
  description: string | null;
  active: boolean;
  isSystemTemplate: boolean;
  templateKey: string | null;
  permissionCodes: PlatformPermissionCode[];
};

export type PlatformRoleAssignmentRow = {
  id: string;
  userId: string;
  organizationId: string;
  roleId: PlatformRoleId;
  roleName: string;
  templateKey: string | null;
  scopeType: PlatformScopeType;
  scopeId: string | null;
  active: boolean;
  permissionCodes: PlatformPermissionCode[];
};

export type PlatformPermissionCheckResult = {
  allowed: boolean;
  reason?: string;
};

async function recordPlatformRbacAudit(input: {
  action: string;
  actorUserId?: string | null;
  organizationId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  roleId?: string | null;
  permissionCode?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
}) {
  await pool.query(
    `INSERT INTO platform_rbac_audit
      (action, actor_user_id, organization_id, target_type, target_id,
       role_id, permission_code, old_value, new_value, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10)`,
    [
      input.action,
      input.actorUserId ?? null,
      input.organizationId ?? null,
      input.targetType ?? null,
      input.targetId ?? null,
      input.roleId ?? null,
      input.permissionCode ?? null,
      JSON.stringify(input.oldValue ?? {}),
      JSON.stringify(input.newValue ?? {}),
      input.reason ?? null,
    ],
  );
}

function mapRoleRow(row: {
  id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
  active: boolean;
  is_system_template: boolean;
  template_key: string | null;
  permission_codes: string[] | null;
}): PlatformRoleRow {
  const codes = (row.permission_codes ?? []).filter(isPlatformPermissionCode);
  return {
    id: asPlatformRoleId(row.id),
    organizationId: row.organization_id,
    name: row.name,
    description: row.description,
    active: row.active,
    isSystemTemplate: row.is_system_template,
    templateKey: row.template_key,
    permissionCodes: codes,
  };
}

export async function seedPlatformRbacCatalog(actorUserId?: string) {
  for (const perm of PLATFORM_PERMISSION_CATALOG) {
    await pool.query(
      `INSERT INTO platform_permission (code, module, description, sensitive)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE SET
         module = EXCLUDED.module,
         description = EXCLUDED.description,
         sensitive = EXCLUDED.sensitive`,
      [perm.code, perm.module, perm.description, perm.sensitive],
    );
  }

  for (const template of PLATFORM_ROLE_TEMPLATES) {
    const roleResult = await pool.query(
      `INSERT INTO platform_role
         (name, description, active, is_system_template, template_key, created_by, organization_id)
       VALUES ($1, $2, TRUE, TRUE, $3, $4, NULL)
       ON CONFLICT (template_key) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         active = TRUE,
         is_system_template = TRUE,
         updated_at = NOW()
       RETURNING id`,
      [
        template.name,
        template.description,
        template.templateKey,
        actorUserId ?? null,
      ],
    );
    const roleId = roleResult.rows[0].id as string;
    const desired = new Set<string>(template.permissionCodes);

    const current = await pool.query(
      `SELECT permission_code FROM platform_role_permission WHERE role_id = $1`,
      [roleId],
    );
    const currentCodes = new Set(
      current.rows.map((row) => row.permission_code as string),
    );

    for (const code of currentCodes) {
      if (!desired.has(code)) {
        await pool.query(
          `DELETE FROM platform_role_permission
           WHERE role_id = $1 AND permission_code = $2`,
          [roleId, code],
        );
      }
    }

    for (const code of desired) {
      if (currentCodes.has(code)) continue;
      await pool.query(
        `INSERT INTO platform_role_permission (role_id, permission_code, granted_by)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [roleId, code, actorUserId ?? null],
      );
      if (isPlatformSensitivePermission(code)) {
        await recordPlatformRbacAudit({
          action: "role.permission_grant",
          actorUserId,
          targetType: "role",
          targetId: roleId,
          roleId,
          permissionCode: code,
          newValue: { templateKey: template.templateKey, sensitive: true },
          reason: "template_seed",
        });
      }
    }
  }
}

export async function listPlatformRoles(organizationId?: string | null) {
  await seedPlatformRbacCatalog();
  const result = await pool.query(
    `SELECT r.id, r.organization_id, r.name, r.description, r.active,
            r.is_system_template, r.template_key,
            COALESCE(
              (SELECT array_agg(rp.permission_code ORDER BY rp.permission_code)
               FROM platform_role_permission rp WHERE rp.role_id = r.id),
              ARRAY[]::text[]
            ) AS permission_codes
     FROM platform_role r
     WHERE r.active = TRUE
       AND (
         r.is_system_template = TRUE
         OR r.organization_id IS NULL
         OR ($1::text IS NOT NULL AND r.organization_id = $1)
       )
     ORDER BY r.is_system_template DESC, r.name ASC`,
    [organizationId ?? null],
  );
  return result.rows.map(mapRoleRow);
}

export async function getPlatformRole(roleId: PlatformRoleId) {
  const result = await pool.query(
    `SELECT r.id, r.organization_id, r.name, r.description, r.active,
            r.is_system_template, r.template_key,
            COALESCE(
              (SELECT array_agg(rp.permission_code ORDER BY rp.permission_code)
               FROM platform_role_permission rp WHERE rp.role_id = r.id),
              ARRAY[]::text[]
            ) AS permission_codes
     FROM platform_role r
     WHERE r.id = $1`,
    [roleId],
  );
  if (!result.rows[0]) return null;
  return mapRoleRow(result.rows[0]);
}

/**
 * Org operators may mutate only roles stamped to their organization.
 * NULL-org rows (templates / legacy globals) are read-only at the org edge.
 */
function assertOrgOwnedRoleMutable(
  existing: PlatformRoleRow,
  organizationId: OrganizationId,
  options?: { templateMessage?: string },
): { error: "FORBIDDEN"; message?: string } | null {
  if (existing.isSystemTemplate) {
    return {
      error: "FORBIDDEN",
      message:
        options?.templateMessage ?? "System templates are read-only.",
    };
  }
  if (!existing.organizationId) {
    return {
      error: "FORBIDDEN",
      message: "Global roles cannot be mutated from an organization.",
    };
  }
  if (existing.organizationId !== organizationId) {
    return { error: "FORBIDDEN" };
  }
  return null;
}

export async function createPlatformRole(input: {
  organizationId: OrganizationId;
  data: CreatePlatformRoleInput;
  actorUserId: string;
}) {
  await seedPlatformRbacCatalog(input.actorUserId);
  const inserted = await pool.query(
    `INSERT INTO platform_role
       (organization_id, name, description, active, is_system_template, created_by)
     VALUES ($1, $2, $3, TRUE, FALSE, $4)
     RETURNING id`,
    [
      input.organizationId,
      input.data.name,
      input.data.description ?? null,
      input.actorUserId,
    ],
  );
  const roleId = asPlatformRoleId(inserted.rows[0].id as string);

  for (const code of input.data.permissionCodes) {
    await pool.query(
      `INSERT INTO platform_role_permission (role_id, permission_code, granted_by)
       VALUES ($1, $2, $3)`,
      [roleId, code, input.actorUserId],
    );
  }

  await recordPlatformRbacAudit({
    action: "role.create",
    actorUserId: input.actorUserId,
    organizationId: input.organizationId,
    targetType: "role",
    targetId: roleId,
    roleId,
    newValue: input.data,
  });

  return getPlatformRole(roleId);
}

export async function updatePlatformRole(input: {
  organizationId: OrganizationId;
  data: UpdatePlatformRoleInput;
  actorUserId: string;
}) {
  const existing = await getPlatformRole(input.data.roleId);
  if (!existing) {
    return { error: "NOT_FOUND" as const };
  }
  const denied = assertOrgOwnedRoleMutable(existing, input.organizationId);
  if (denied) {
    return denied;
  }

  await pool.query(
    `UPDATE platform_role
     SET name = $2, description = $3, updated_by = $4, updated_at = NOW()
     WHERE id = $1`,
    [
      input.data.roleId,
      input.data.name,
      input.data.description ?? null,
      input.actorUserId,
    ],
  );

  await pool.query(`DELETE FROM platform_role_permission WHERE role_id = $1`, [
    input.data.roleId,
  ]);
  for (const code of input.data.permissionCodes) {
    await pool.query(
      `INSERT INTO platform_role_permission (role_id, permission_code, granted_by)
       VALUES ($1, $2, $3)`,
      [input.data.roleId, code, input.actorUserId],
    );
  }

  await recordPlatformRbacAudit({
    action: "role.update",
    actorUserId: input.actorUserId,
    organizationId: input.organizationId,
    targetType: "role",
    targetId: input.data.roleId,
    roleId: input.data.roleId,
    oldValue: existing,
    newValue: input.data,
  });

  return { ok: true as const, role: await getPlatformRole(input.data.roleId) };
}

export async function deletePlatformRole(input: {
  organizationId: OrganizationId;
  roleId: PlatformRoleId;
  actorUserId: string;
}) {
  const existing = await getPlatformRole(input.roleId);
  if (!existing) {
    return { error: "NOT_FOUND" as const };
  }
  const denied = assertOrgOwnedRoleMutable(existing, input.organizationId, {
    templateMessage: "System templates cannot be deleted.",
  });
  if (denied) {
    return denied;
  }

  await pool.query(
    `UPDATE platform_role SET active = FALSE, updated_by = $2, updated_at = NOW()
     WHERE id = $1`,
    [input.roleId, input.actorUserId],
  );

  await recordPlatformRbacAudit({
    action: "role.delete",
    actorUserId: input.actorUserId,
    organizationId: input.organizationId,
    targetType: "role",
    targetId: input.roleId,
    roleId: input.roleId,
    oldValue: existing,
  });

  return { ok: true as const };
}

export async function setPlatformRolePermission(input: {
  organizationId: OrganizationId;
  roleId: PlatformRoleId;
  permissionCode: PlatformPermissionCode;
  granted: boolean;
  actorUserId: string;
}) {
  const existing = await getPlatformRole(input.roleId);
  if (!existing) {
    return { error: "NOT_FOUND" as const };
  }
  const denied = assertOrgOwnedRoleMutable(existing, input.organizationId);
  if (denied) {
    return denied;
  }

  if (input.granted) {
    await pool.query(
      `INSERT INTO platform_role_permission (role_id, permission_code, granted_by)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [input.roleId, input.permissionCode, input.actorUserId],
    );
  } else {
    await pool.query(
      `DELETE FROM platform_role_permission
       WHERE role_id = $1 AND permission_code = $2`,
      [input.roleId, input.permissionCode],
    );
  }

  await recordPlatformRbacAudit({
    action: input.granted ? "role.permission_grant" : "role.permission_revoke",
    actorUserId: input.actorUserId,
    organizationId: input.organizationId,
    targetType: "role",
    targetId: input.roleId,
    roleId: input.roleId,
    permissionCode: input.permissionCode,
    newValue: { granted: input.granted },
  });

  return { ok: true as const, role: await getPlatformRole(input.roleId) };
}

export async function listPlatformRoleAssignmentsForUser(
  userId: string,
  organizationId?: string | null,
) {
  const result = await pool.query(
    `SELECT a.id, a.user_id, a.organization_id, a.role_id, a.scope_type, a.scope_id, a.active,
            r.name AS role_name,
            r.template_key AS template_key,
            COALESCE(
              (SELECT array_agg(rp.permission_code ORDER BY rp.permission_code)
               FROM platform_role_permission rp WHERE rp.role_id = a.role_id),
              ARRAY[]::text[]
            ) AS permission_codes
     FROM platform_role_assignment a
     JOIN platform_role r ON r.id = a.role_id
     WHERE a.user_id = $1
       AND a.active = TRUE
       AND ($2::text IS NULL OR a.organization_id = $2)`,
    [userId, organizationId ?? null],
  );

  return result.rows.map(
    (row): PlatformRoleAssignmentRow => ({
      id: row.id as string,
      userId: row.user_id as string,
      organizationId: row.organization_id as string,
      roleId: asPlatformRoleId(row.role_id as string),
      roleName: row.role_name as string,
      templateKey: (row.template_key as string | null) ?? null,
      scopeType: row.scope_type as PlatformScopeType,
      scopeId: (row.scope_id as string | null) ?? null,
      active: Boolean(row.active),
      permissionCodes: ((row.permission_codes as string[]) ?? []).filter(
        isPlatformPermissionCode,
      ),
    }),
  );
}

function assignmentCoversOrg(
  assignment: PlatformRoleAssignmentRow,
  organizationId: string,
): boolean {
  if (!assignment.active) return false;
  if (assignment.scopeType === "platform") return true;
  if (assignment.scopeType === "organization") {
    return (
      assignment.organizationId === organizationId &&
      assignment.scopeId === organizationId
    );
  }
  return false;
}

/**
 * Permission check. Neon admin bootstrap: when no assignments exist for the user,
 * callers may pass `neonAdminBootstrap: true` to allow sensitive org.* codes.
 */
export async function hasPlatformPermission(input: {
  userId: string;
  organizationId: string;
  code: string;
  neonAdminBootstrap?: boolean;
}): Promise<PlatformPermissionCheckResult> {
  if (!isPlatformPermissionCode(input.code)) {
    return { allowed: false, reason: "unknown_permission" };
  }

  try {
    await seedPlatformRbacCatalog();
  } catch {
    // Tables may not exist yet during migrate race — fall through to bootstrap.
  }

  let assignments: PlatformRoleAssignmentRow[] = [];
  try {
    assignments = await listPlatformRoleAssignmentsForUser(
      input.userId,
      input.organizationId,
    );
  } catch {
    assignments = [];
  }

  const matching = assignments.filter((a) =>
    assignmentCoversOrg(a, input.organizationId),
  );

  if (matching.some((a) => a.permissionCodes.includes(input.code))) {
    return { allowed: true };
  }

  // No assignments yet: allow self-service account access for any signed-in member.
  if (matching.length === 0 && input.code === "account.self") {
    return { allowed: true, reason: "self_bootstrap" };
  }

  if (matching.length === 0 && input.neonAdminBootstrap) {
    return { allowed: true, reason: "neon_admin_bootstrap" };
  }

  return { allowed: false, reason: "missing_permission" };
}

export async function assignPlatformRole(input: {
  userId: string;
  organizationId: OrganizationId;
  roleId: PlatformRoleId;
  scopeType: PlatformScopeType;
  actorUserId: string;
}) {
  const role = await getPlatformRole(input.roleId);
  if (!role || !role.active) {
    return { error: "NOT_FOUND" as const };
  }

  const scopeId =
    input.scopeType === "organization" ? input.organizationId : null;

  const inserted = await pool.query(
    `INSERT INTO platform_role_assignment
       (user_id, organization_id, role_id, scope_type, scope_id, active, granted_by)
     VALUES ($1, $2, $3, $4, $5, TRUE, $6)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [
      input.userId,
      input.organizationId,
      input.roleId,
      input.scopeType,
      scopeId,
      input.actorUserId,
    ],
  );

  const assignmentId = inserted.rows[0]?.id as string | undefined;

  await recordPlatformRbacAudit({
    action: "assignment.create",
    actorUserId: input.actorUserId,
    organizationId: input.organizationId,
    targetType: "user",
    targetId: input.userId,
    roleId: input.roleId,
    newValue: {
      scopeType: input.scopeType,
      scopeId,
      assignmentId,
    },
  });

  return { ok: true as const, assignmentId };
}

/**
 * Ensure Neon org-admin users hold the Org Admin template assignment.
 * Idempotent — skips when Org Admin template is already assigned (other roles may coexist).
 */
export async function ensureNeonAdminOrgAdminAssignment(input: {
  userId: string;
  organizationId: OrganizationId;
  actorUserId?: string;
}) {
  await seedPlatformRbacCatalog(input.actorUserId ?? input.userId);

  const existing = await listPlatformRoleAssignmentsForUser(
    input.userId,
    input.organizationId,
  );
  if (existing.some((assignment) => assignment.templateKey === "org_admin")) {
    return { ok: true as const, skipped: true as const };
  }

  const roles = await listPlatformRoles(input.organizationId);
  const orgAdmin = roles.find((role) => role.templateKey === "org_admin");
  if (!orgAdmin) {
    return { error: "NOT_FOUND" as const };
  }

  return assignPlatformRole({
    userId: input.userId,
    organizationId: input.organizationId,
    roleId: orgAdmin.id,
    scopeType: "organization",
    actorUserId: input.actorUserId ?? input.userId,
  });
}

export async function revokePlatformRoleAssignment(input: {
  assignmentId: string;
  organizationId: OrganizationId;
  actorUserId: string;
}) {
  const existing = await pool.query(
    `SELECT id, user_id, role_id, organization_id
     FROM platform_role_assignment
     WHERE id = $1 AND active = TRUE`,
    [input.assignmentId],
  );
  if (!existing.rows[0]) {
    return { error: "NOT_FOUND" as const };
  }
  if (existing.rows[0].organization_id !== input.organizationId) {
    return { error: "FORBIDDEN" as const };
  }

  await pool.query(
    `UPDATE platform_role_assignment
     SET active = FALSE, updated_at = NOW()
     WHERE id = $1`,
    [input.assignmentId],
  );

  await recordPlatformRbacAudit({
    action: "assignment.revoke",
    actorUserId: input.actorUserId,
    organizationId: input.organizationId,
    targetType: "user",
    targetId: existing.rows[0].user_id as string,
    roleId: existing.rows[0].role_id as string,
    oldValue: { assignmentId: input.assignmentId },
  });

  return {
    ok: true as const,
    userId: existing.rows[0].user_id as string,
  };
}

export function listPlatformPermissionCatalog() {
  return PLATFORM_PERMISSION_CATALOG;
}
