import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = resolve(process.cwd(), ".env");
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("DATABASE_URL=")) {
      return trimmed.slice("DATABASE_URL=".length);
    }
  }
  throw new Error("DATABASE_URL not found");
}

const pool = new pg.Pool({ connectionString: loadDatabaseUrl() });

const existing = [
  "001_portal_schema.sql",
  "002_backfill_questions.sql",
  "003_drop_rating_comment.sql",
  "004_audit_events.sql",
];

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

console.log("Backfilled schema_migrations for existing migrations.");
await pool.end();
