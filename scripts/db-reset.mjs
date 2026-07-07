/**
 * Reset portal data (keeps schema_migrations). Removes non-admin Neon Auth users.
 * Usage: node --env-file=.env scripts/db-reset.mjs [--keep-preview-client]
 */
import { spawnSync } from "node:child_process";
import pg from "pg";
import { getPgPoolConfig } from "./db-pool-config.mjs";
import { loadEnvFile, getEnv } from "./lib/load-env.mjs";
import { purgeNeonAuthUsers } from "./lib/neon-auth-seed.mjs";

const env = loadEnvFile();
const keepPreview = process.argv.includes("--keep-preview-client");
const databaseUrl = getEnv("DATABASE_URL", env);
const adminEmail = (getEnv("SHARED_ADMIN_EMAIL", env) ?? "").trim().toLowerCase();
const adminPassword = getEnv("SHARED_ADMIN_PASSWORD", env);
const previewEmail = (getEnv("PREVIEW_CLIENT_EMAIL", env) ?? "").trim().toLowerCase();
const authBaseUrl = getEnv("NEON_AUTH_BASE_URL", env);
const cookieSecret = getEnv("NEON_AUTH_COOKIE_SECRET", env);

const PRESERVED_EMAILS = new Set(
  [adminEmail, keepPreview ? previewEmail : null].filter(Boolean),
);

const PORTAL_TABLES = [
  "audit_events",
  "evidence_records",
  "survey_responses",
  "survey_questions",
  "survey_invite_tokens",
  "survey_invitations",
  "client_assignments",
  "client_invitations",
  "client_profiles",
  "surveys",
];

async function resetPortalTables(pool) {
  await pool.query(
    `TRUNCATE TABLE ${PORTAL_TABLES.join(", ")} RESTART IDENTITY CASCADE`,
  );
}

function runSeed(script, extraArgs = []) {
  const result = spawnSync("node", ["--env-file=.env", script, ...extraArgs], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    throw new Error(`${script} failed with exit code ${result.status}`);
  }
}

async function main() {
  if (
    !databaseUrl ||
    !adminEmail ||
    !adminPassword ||
    !authBaseUrl ||
    !cookieSecret
  ) {
    throw new Error(
      "Missing DATABASE_URL, SHARED_ADMIN_*, NEON_AUTH_BASE_URL, or NEON_AUTH_COOKIE_SECRET",
    );
  }

  console.log("Resetting portal database tables…");
  const pool = new pg.Pool(getPgPoolConfig(databaseUrl));

  try {
    await resetPortalTables(pool);
    console.log(`Truncated: ${PORTAL_TABLES.join(", ")}`);
  } finally {
    await pool.end();
  }

  console.log("Purging non-admin Neon Auth users…");
  const resetPool = new pg.Pool(getPgPoolConfig(databaseUrl));
  try {
    const removed = await purgeNeonAuthUsers({
      pool: resetPool,
      adminEmail,
      adminPassword,
      preserveEmails: PRESERVED_EMAILS,
    });
    console.log(
      `Removed ${removed} auth user(s). Preserved: ${[...PRESERVED_EMAILS].join(", ")}`,
    );
  } finally {
    await resetPool.end();
  }

  console.log("Re-seeding admin…");
  runSeed("scripts/seed-admin.mjs");

  if (keepPreview) {
    console.log("Re-seeding production baseline (admin + preview + sandbox)…");
    runSeed("scripts/seed-production.mjs");
    runSeed("scripts/seed-production.mjs", ["--write-env"]);
  }

  console.log("\nDatabase reset complete.");
  console.log(
    "Next: register clients from /dashboard/clients (full user management UI comes post-deploy).",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
