import "server-only";

import { pool } from "@/modules/platform/db";
import {
  asUserId,
  type UserId,
  userIdSchema,
} from "@/modules/identity/schemas/users";

export type OrganizationUserRecord = {
  id: UserId;
  email: string;
  name: string | null;
  role: string | null;
  emailVerified: boolean;
  banned: boolean;
  banReason: string | null;
  createdAt: Date;
};

type OrganizationUserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  emailVerified: boolean;
  banned: boolean;
  banReason: string | null;
  createdAt: Date;
};

function mapRow(row: OrganizationUserRow): OrganizationUserRecord {
  return {
    id: asUserId(row.id),
    email: row.email,
    name: row.name,
    role: row.role,
    emailVerified: Boolean(row.emailVerified),
    banned: Boolean(row.banned),
    banReason: row.banReason,
    createdAt: row.createdAt,
  };
}

/**
 * Neon Auth membership-scoped user directory for `/dashboard/users`.
 * SoT: neon_auth.member (organizationId + userId) — Tier 1 membership.
 */
export async function listOrganizationUsers(
  organizationId: string,
): Promise<OrganizationUserRecord[]> {
  const result = await pool.query<OrganizationUserRow>(
    `SELECT u.id, u.email, u.name, u.role,
            u."emailVerified" AS "emailVerified",
            COALESCE(u.banned, false) AS banned,
            u."banReason" AS "banReason",
            u."createdAt" AS "createdAt"
     FROM neon_auth."user" u
     INNER JOIN neon_auth.member m
       ON m."userId" = u.id
      AND m."organizationId" = $1::uuid
     ORDER BY u."createdAt" DESC`,
    [organizationId],
  );

  return result.rows.map(mapRow);
}

export async function getOrganizationUser(
  userId: string,
  organizationId: string,
): Promise<OrganizationUserRecord | null> {
  const parsed = userIdSchema.safeParse(userId);
  if (!parsed.success) {
    return null;
  }

  const result = await pool.query<OrganizationUserRow>(
    `SELECT u.id, u.email, u.name, u.role,
            u."emailVerified" AS "emailVerified",
            COALESCE(u.banned, false) AS banned,
            u."banReason" AS "banReason",
            u."createdAt" AS "createdAt"
     FROM neon_auth."user" u
     INNER JOIN neon_auth.member m
       ON m."userId" = u.id
      AND m."organizationId" = $2::uuid
     WHERE u.id = $1
     LIMIT 1`,
    [parsed.data, organizationId],
  );

  const row = result.rows[0];
  return row ? mapRow(row) : null;
}
