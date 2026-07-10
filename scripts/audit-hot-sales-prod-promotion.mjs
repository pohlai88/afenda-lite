#!/usr/bin/env node
/**
 * Pre-promotion audit for Hot Sales phases 2B–2D.
 * Checks migration files, env manifest keys, and optional DB tables when DATABASE_URL is set.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredMigrations = [
  "015_hot_sales_deposit.sql",
  "016_hot_sales_pickup_ops.sql",
  "017_hot_sales_import.sql",
  "018_hot_sales_notifications.sql",
  "019_hot_sales_erp_sync.sql",
  "020_hot_sales_notification_extended.sql",
  "023_hot_sales_notification_deferred_triggers.sql",
];

const requiredFlags = [
  "HOT_SALES_DEPOSIT_ENABLED",
  "HOT_SALES_PICKUP_OPS_ENABLED",
  "HOT_SALES_NOTIFICATIONS_ENABLED",
  "HOT_SALES_ERP_SYNC_ENABLED",
  "HOT_SALES_ERP_VENDOR",
  "HOT_SALES_ERP_BASE_URL",
];

const requiredTables = [
  "hot_sales_deposit",
  "hot_sales_pickup_window",
  "hot_sales_import_batch",
  "hot_sales_notification_delivery",
  "hot_sales_sync_job",
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
  const manifest = await readFile(path.join(root, "lib", "env", "manifest.ts"), "utf8");
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
  console.error("Hot Sales prod promotion audit FAILED:");
  for (const issue of issues) console.error(`  - ${issue}`);
  process.exit(1);
}

console.log(
  JSON.stringify({
    ok: true,
    migrations: requiredMigrations.length,
    manifestFlags: requiredFlags.length,
    message: "Ready for ordered flag promotion — see docs/hot-sales/ops/gate-register.md",
  }),
);
