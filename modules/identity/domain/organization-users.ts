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
 * Neon Auth user directory for organization-admin `/dashboard/users`.
 * Single-tenant DB — lists auth users (not filtered to neon_auth.member).
 */
export async function listOrganizationUsers(): Promise<
  OrganizationUserRecord[]
> {
  const result = await pool.query<OrganizationUserRow>(
    `SELECT id, email, name, role,
            "emailVerified" AS "emailVerified",
            COALESCE(banned, false) AS banned,
            "banReason" AS "banReason",
            "createdAt" AS "createdAt"
     FROM neon_auth."user"
     ORDER BY "createdAt" DESC`,
  );

  return result.rows.map(mapRow);
}

export async function getOrganizationUser(
  userId: string,
): Promise<OrganizationUserRecord | null> {
  const parsed = userIdSchema.safeParse(userId);
  if (!parsed.success) {
    return null;
  }

  const result = await pool.query<OrganizationUserRow>(
    `SELECT id, email, name, role,
            "emailVerified" AS "emailVerified",
            COALESCE(banned, false) AS banned,
            "banReason" AS "banReason",
            "createdAt" AS "createdAt"
     FROM neon_auth."user"
     WHERE id = $1
     LIMIT 1`,
    [parsed.data],
  );

  const row = result.rows[0];
  return row ? mapRow(row) : null;
}
