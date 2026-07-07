/**
 * One-time backfill for databases migrated before schema_migrations tracking.
 * Marks all migration files as applied without running SQL.
 * Usage: node scripts/db-backfill-migrations.mjs --confirm
 */
import pg from "pg";
import { getPgPoolConfig } from "./db-pool-config.mjs";
import { loadDatabaseUrl } from "./lib/load-database-url.mjs";
import { listMigrationFiles } from "./lib/list-migration-files.mjs";

if (!process.argv.includes("--confirm")) {
  console.error(
    "Refusing to run without --confirm. Only use on legacy DBs that already have the full schema.",
  );
  process.exit(1);
}

const databaseUrl = loadDatabaseUrl();
if (!databaseUrl) {
  throw new Error("DATABASE_URL not found");
}

const pool = new pg.Pool(getPgPoolConfig(databaseUrl));
const existing = listMigrationFiles();

await pool.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

for (const filename of existing) {
  await pool.query(
    "INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING",
    [filename],
  );
}

console.log(`Backfilled schema_migrations (${existing.length} files).`);
await pool.end();
