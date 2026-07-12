import { Client } from "pg";
import type { OperatorCreds } from "@/testing/e2e/credentials";

/**
 * Ensure the operator can enter Feed Farm Trade in @journey specs.
 * Seeds allowlist roster + platform `fft.access` (module entry SoT).
 */
export async function ensureTradeAllowlistForOperator(
  creds: OperatorCreds
): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required to seed fft_sales_member for trade journeys"
    );
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(
      `INSERT INTO fft_sales_member (email, user_id, active)
       VALUES ($1, NULL, TRUE)
       ON CONFLICT (email) DO UPDATE SET active = TRUE`,
      [creds.email.trim().toLowerCase()]
    );

    const user = await client.query(
      `SELECT id FROM neon_auth."user" WHERE lower(email) = lower($1) LIMIT 1`,
      [creds.email.trim().toLowerCase()]
    );
    const userId = user.rows[0]?.id as string | undefined;
    if (!userId) {
      return;
    }

    await client.query(
      "UPDATE fft_sales_member SET user_id = $2 WHERE lower(email) = lower($1)",
      [creds.email.trim().toLowerCase(), userId]
    );

    // Prefer explicit fixture org; else sole membership for this user.
    // Never stamp neon_auth.organization ORDER BY … LIMIT 1 (multi-org unsafe).
    const explicitOrg =
      process.env.PORTAL_ORGANIZATION_ID?.trim() ||
      process.env.E2E_ORGANIZATION_ID?.trim();
    let organizationId = explicitOrg || undefined;
    if (!organizationId) {
      const memberships = await client.query(
        `SELECT "organizationId" AS id
         FROM neon_auth.member
         WHERE "userId" = $1
         ORDER BY "createdAt" ASC NULLS LAST`,
        [userId]
      );
      if (memberships.rows.length === 0) {
        return;
      }
      if (memberships.rows.length > 1) {
        throw new Error(
          "fft-allowlist: user has multiple Auth orgs — set PORTAL_ORGANIZATION_ID or E2E_ORGANIZATION_ID"
        );
      }
      organizationId = memberships.rows[0]?.id as string | undefined;
    }
    if (!organizationId) {
      return;
    }

    await client.query(
      `INSERT INTO platform_permission (code, module, description, sensitive)
       VALUES ('fft.access', 'fft', 'Enter Feed Farm Trade module and see FFT nav', FALSE)
       ON CONFLICT (code) DO NOTHING`
    );
    await client.query(
      `INSERT INTO platform_permission (code, module, description, sensitive)
       VALUES ('account.self', 'account', 'Manage own account settings', FALSE)
       ON CONFLICT (code) DO NOTHING`
    );

    const role = await client.query(
      `SELECT id FROM platform_role WHERE template_key = 'fft_member' LIMIT 1`
    );
    let roleId = role.rows[0]?.id as string | undefined;
    if (!roleId) {
      const inserted = await client.query(
        `INSERT INTO platform_role
           (organization_id, name, description, active, is_system_template, template_key)
         VALUES (NULL, 'FFT Member', 'Enter Feed Farm Trade module', TRUE, TRUE, 'fft_member')
         RETURNING id`
      );
      roleId = inserted.rows[0].id as string;
      for (const code of ["fft.access", "account.self"]) {
        await client.query(
          `INSERT INTO platform_role_permission (role_id, permission_code)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleId, code]
        );
      }
    }

    await client.query(
      `INSERT INTO platform_role_assignment
         (user_id, organization_id, role_id, scope_type, scope_id, active, granted_by)
       VALUES ($1, $2, $3, 'organization', $2, TRUE, $1)
       ON CONFLICT DO NOTHING`,
      [userId, organizationId, roleId]
    );
  } finally {
    await client.end();
  }
}
