/**
 * Reset portal data (keeps schema_migrations). Removes non-admin Supabase Auth users.
 * Usage: node --env-file=.env scripts/db-reset.mjs [--keep-preview-client]
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { getPgPoolConfig } from "./db-pool-config.mjs";

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env");
  try {
    const content = readFileSync(envPath, "utf8");
    const env = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
    }
    return env;
  } catch {
    return {};
  }
}

const env = { ...loadEnvFile(), ...process.env };
const keepPreview = process.argv.includes("--keep-preview-client");
const databaseUrl = env.DATABASE_URL;
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = (env.SHARED_ADMIN_EMAIL ?? "").trim().toLowerCase();
const previewEmail = (env.PREVIEW_CLIENT_EMAIL ?? "").trim().toLowerCase();

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

async function purgeAuthUsers() {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw error;
  }

  let removed = 0;
  for (const user of data.users) {
    const email = user.email?.trim().toLowerCase();
    if (!email || PRESERVED_EMAILS.has(email)) {
      continue;
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.warn(`Could not delete auth user ${email}: ${deleteError.message}`);
      continue;
    }
    removed += 1;
    console.log(`Removed auth user: ${email}`);
  }

  return removed;
}

function runSeed(script) {
  const result = spawnSync("node", ["--env-file=.env", script], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    throw new Error(`${script} failed with exit code ${result.status}`);
  }
}

async function main() {
  if (!databaseUrl || !supabaseUrl || !serviceRoleKey || !adminEmail) {
    throw new Error(
      "Missing DATABASE_URL, Supabase env vars, or SHARED_ADMIN_EMAIL",
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

  console.log("Purging non-admin Supabase Auth users…");
  const removed = await purgeAuthUsers();
  console.log(`Removed ${removed} auth user(s). Preserved: ${[...PRESERVED_EMAILS].join(", ")}`);

  console.log("Re-seeding admin…");
  runSeed("scripts/seed-admin.mjs");

  if (keepPreview) {
    console.log("Re-seeding preview client…");
    runSeed("scripts/seed-preview-client.mjs");
  }

  console.log("\nDatabase reset complete.");
  console.log("Next: register clients from /dashboard/clients (full user management UI comes post-deploy).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
