/**
 * Backfill platform `fft.access` for Feed Farm Trade entry.
 *
 * Grants the FFT Member template to:
 * - active fft_sales_member rows with a user_id
 * - users with an active FFT role assignment
 *
 * Organization id comes from the row when set. Rows without organization_id
 * use --organization-id / PORTAL_ORGANIZATION_ID (required when any row needs it).
 * Never stamps an arbitrary "first org" from neon_auth (M4 / D6).
 *
 * Usage:
 *   node --env-file=.env scripts/backfill-fft-access.mjs [--dry-run] \
 *     --organization-id=<neon-auth-org-uuid>
 *   PORTAL_ORGANIZATION_ID=... node --env-file=.env scripts/backfill-fft-access.mjs
 */
import pg from "pg";
import { getPgPoolConfig } from "./db-pool-config.mjs";
import { loadEnvFile, getEnv } from "./lib/load-env.mjs";

const env = loadEnvFile();
const dryRun = process.argv.includes("--dry-run");
const databaseUrl = getEnv("DATABASE_URL", env);

function readOrganizationIdArg() {
  const flag = process.argv.find((arg) => arg.startsWith("--organization-id="));
  if (flag) {
    return flag.slice("--organization-id=".length).trim() || null;
  }
  const idx = process.argv.indexOf("--organization-id");
  if (idx >= 0 && process.argv[idx + 1]) {
    return process.argv[idx + 1].trim() || null;
  }
  return (
    getEnv("PORTAL_ORGANIZATION_ID", env)?.trim() ||
    getEnv("PORTAL_ORG_ID", env)?.trim() ||
    null
  );
}

const fallbackOrganizationId = readOrganizationIdArg();

if (!databaseUrl) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const pool = new pg.Pool(getPgPoolConfig(databaseUrl));

async function ensurePermissionCatalog() {
  await pool.query(
    `INSERT INTO platform_permission (code, module, description, sensitive)
     VALUES ('fft.access', 'fft', 'Enter Feed Farm Trade module and see FFT nav', FALSE)
     ON CONFLICT (code) DO NOTHING`,
  );
  await pool.query(
    `INSERT INTO platform_permission (code, module, description, sensitive)
     VALUES ('account.self', 'account', 'Manage own account settings', FALSE)
     ON CONFLICT (code) DO NOTHING`,
  );
}

async function ensureFftMemberRole(organizationId) {
  const existing = await pool.query(
    `SELECT id FROM platform_role
     WHERE template_key = 'fft_member'
       AND (organization_id IS NULL OR organization_id = $1)
     ORDER BY organization_id NULLS FIRST
     LIMIT 1`,
    [organizationId],
  );
  if (existing.rows[0]?.id) {
    return existing.rows[0].id;
  }

  if (dryRun) {
    return null;
  }

  const inserted = await pool.query(
    `INSERT INTO platform_role
       (organization_id, name, description, active, is_system_template, template_key)
     VALUES (NULL, 'FFT Member', 'Enter Feed Farm Trade module (platform control plane)', TRUE, TRUE, 'fft_member')
     ON CONFLICT (organization_id, template_key) WHERE template_key IS NOT NULL DO UPDATE SET
       name = EXCLUDED.name,
       active = TRUE,
       updated_at = NOW()
     RETURNING id`,
  );
  const roleId = inserted.rows[0].id;
  for (const code of ["fft.access", "account.self"]) {
    await pool.query(
      `INSERT INTO platform_role_permission (role_id, permission_code)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [roleId, code],
    );
  }
  return roleId;
}

async function grantFftAccess(userId, organizationId, actorUserId) {
  const hasAccess = await pool.query(
    `SELECT 1
     FROM platform_role_assignment a
     JOIN platform_role_permission rp ON rp.role_id = a.role_id
     WHERE a.user_id = $1
       AND a.organization_id = $2
       AND a.active = TRUE
       AND rp.permission_code = 'fft.access'
     LIMIT 1`,
    [userId, organizationId],
  );
  if (hasAccess.rows.length > 0) {
    return "skipped";
  }

  if (dryRun) {
    return "would_grant";
  }

  const roleId = await ensureFftMemberRole(organizationId);
  if (!roleId) {
    return "error";
  }
  await pool.query(
    `INSERT INTO platform_role_assignment
       (user_id, organization_id, role_id, scope_type, scope_id, active, granted_by)
     VALUES ($1, $2, $3, 'organization', $2, TRUE, $4)
     ON CONFLICT DO NOTHING`,
    [userId, organizationId, roleId, actorUserId],
  );
  return "granted";
}

async function main() {
  await ensurePermissionCatalog();

  const candidates = await pool.query(
    `
    SELECT DISTINCT user_id, organization_id, source FROM (
      SELECT sm.user_id::text AS user_id,
             sm.organization_id::text AS organization_id,
             'sales_member' AS source
      FROM fft_sales_member sm
      WHERE sm.active = TRUE AND sm.user_id IS NOT NULL

      UNION ALL

      SELECT ra.user_id::text AS user_id,
             ra.organization_id::text AS organization_id,
             'fft_assignment' AS source
      FROM fft_role_assignment ra
      WHERE ra.active = TRUE
    ) t
    WHERE user_id IS NOT NULL
    `,
  );

  const needsFallback = candidates.rows.some((row) => !row.organization_id);
  if (needsFallback && !fallbackOrganizationId) {
    console.error(
      "Rows missing organization_id require --organization-id=<id> or PORTAL_ORGANIZATION_ID (M4: no first-org fallback).",
    );
    process.exit(1);
  }

  let granted = 0;
  let skipped = 0;
  let wouldGrant = 0;
  let missingOrg = 0;

  for (const row of candidates.rows) {
    const organizationId = row.organization_id ?? fallbackOrganizationId;
    if (!organizationId) {
      missingOrg += 1;
      console.warn(`skip ${row.user_id}: no organization_id (${row.source})`);
      continue;
    }
    const result = await grantFftAccess(
      row.user_id,
      organizationId,
      row.user_id,
    );
    if (result === "granted") granted += 1;
    else if (result === "skipped") skipped += 1;
    else if (result === "would_grant") wouldGrant += 1;
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        fallbackOrganizationId,
        candidates: candidates.rows.length,
        granted,
        skipped,
        wouldGrant,
        missingOrg,
      },
      null,
      2,
    ),
  );
}

try {
  await main();
} finally {
  await pool.end();
}
