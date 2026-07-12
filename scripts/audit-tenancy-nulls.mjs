/**
 * Audit tenant-root NULL organization_id + allowlisted sales missing fft.access.
 * Exit 1 when any gate fails (blocks hard cutover / migration 027).
 *
 * Usage: node --env-file=.env scripts/audit-tenancy-nulls.mjs
 */
import pg from "pg";
import { getPgPoolConfig } from "./db-pool-config.mjs";
import { loadEnvFile, getEnv } from "./lib/load-env.mjs";

const env = loadEnvFile();
const databaseUrl = getEnv("DATABASE_URL", env);
if (!databaseUrl) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const TABLES = [
  "surveys",
  "client_invitations",
  "client_profiles",
  "client_assignments",
  "fft_event",
  "fft_sales_member",
  "fft_role",
  "fft_role_assignment",
];

const pool = new pg.Pool(getPgPoolConfig(databaseUrl));

async function main() {
  const nullCounts = [];
  for (const table of TABLES) {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS nulls FROM ${table} WHERE organization_id IS NULL`,
    );
    nullCounts.push({ table, nulls: result.rows[0].nulls });
  }

  const missingAccess = await pool.query(
    `SELECT COUNT(*)::int AS missing
     FROM fft_sales_member sm
     WHERE sm.active = TRUE
       AND sm.user_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
         FROM platform_role_assignment a
         JOIN platform_role_permission rp ON rp.role_id = a.role_id
         WHERE a.user_id = sm.user_id::text
           AND a.active = TRUE
           AND rp.permission_code = 'fft.access'
       )`,
  );

  const report = {
    nullCounts,
    salesMissingFftAccess: missingAccess.rows[0].missing,
  };
  console.log(JSON.stringify(report, null, 2));

  const badNulls = nullCounts.filter((row) => row.nulls > 0);
  if (badNulls.length > 0 || missingAccess.rows[0].missing > 0) {
    console.error("Tenancy audit FAILED");
    process.exit(1);
  }
  console.log("Tenancy audit PASSED");
}

try {
  await main();
} finally {
  await pool.end();
}
