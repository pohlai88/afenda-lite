#!/usr/bin/env node
/**
 * Pre-promotion audit for Feed Farm Trade phases 2B–2D.
 * Checks migration files, env manifest keys, and optional DB tables when DATABASE_URL is set.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredMigrations = [
  "015_fft_deposit.sql",
  "016_fft_pickup_ops.sql",
  "017_fft_import.sql",
  "018_fft_notifications.sql",
  "019_fft_erp_sync.sql",
  "020_fft_notification_extended.sql",
  "023_fft_notification_deferred_triggers.sql",
];

const requiredFlags = [
  "FFT_DEPOSIT_ENABLED",
  "FFT_PICKUP_OPS_ENABLED",
  "FFT_NOTIFICATIONS_ENABLED",
  "FFT_ERP_SYNC_ENABLED",
  "FFT_ERP_VENDOR",
  "FFT_ERP_BASE_URL",
];

const requiredTables = [
  "fft_deposit",
  "fft_pickup_window",
  "fft_import_batch",
  "fft_notification_delivery",
  "fft_sync_job",
];

const issues = [];

async function checkMigrations() {
  const dir = path.join(root, "db", "migrations");
  const files = await readdir(dir);
  for (const name of requiredMigrations) {
    if (!files.includes(name)) {
      issues.push(`missing migration file: ${name}`);
    }
  }
}

async function checkManifest() {
  // Feed Farm Trade / modular monolith: env SSOT is modules/platform/env (not legacy lib/env).
  const manifest = await readFile(
    path.join(root, "modules", "platform", "env", "manifest.ts"),
    "utf8",
  );
  for (const key of requiredFlags) {
    if (!manifest.includes(`key: "${key}"`)) {
      issues.push(`manifest missing env key: ${key}`);
    }
  }
}

async function checkDatabase() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.log("DATABASE_URL unset — skipping live DB table check");
    return;
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    for (const table of requiredTables) {
      const result = await client.query(
        `SELECT to_regclass($1) AS reg`,
        [`public.${table}`],
      );
      if (!result.rows[0]?.reg) {
        issues.push(`missing DB table: ${table} (run npm run db:migrate)`);
      }
    }
  } finally {
    await client.end();
  }
}

await checkMigrations();
await checkManifest();
await checkDatabase();

if (issues.length > 0) {
  console.error("Feed Farm Trade prod promotion audit FAILED:");
  for (const issue of issues) console.error(`  - ${issue}`);
  process.exit(1);
}

console.log(
  JSON.stringify({
    ok: true,
    migrations: requiredMigrations.length,
    manifestFlags: requiredFlags.length,
    message: "Ready for ordered flag promotion — see docs/fft/ops/gate-register.md",
  }),
);
