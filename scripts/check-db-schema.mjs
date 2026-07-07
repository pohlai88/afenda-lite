import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import pg from "pg";

const ROOT = process.cwd();
const MIGRATIONS_DIR = join(ROOT, "db", "migrations");

function normalizeDatabaseUrl(url) {
  try {
    const parsed = new URL(url);
    const sslmode = parsed.searchParams.get("sslmode");
    if (
      sslmode === "prefer" ||
      sslmode === "require" ||
      sslmode === "verify-ca"
    ) {
      parsed.searchParams.set("sslmode", "verify-full");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function isPoolerConnection(url) {
  if (!url) return false;
  try {
    return new URL(url).hostname.includes("-pooler");
  } catch {
    return false;
  }
}

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const envPath = join(ROOT, ".env");
  try {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("DATABASE_URL=")) {
        return trimmed.slice("DATABASE_URL=".length);
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function listMigrationFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

async function main() {
  const migrationFiles = listMigrationFiles();
  console.log(`check:db-schema OK (${migrationFiles.length} migration files present)`);

  const databaseUrl = loadDatabaseUrl();
  if (!databaseUrl) {
    console.log("check:db-schema skipped live checks (DATABASE_URL not set).");
    return;
  }

  if (process.env.NODE_ENV === "production" && !isPoolerConnection(databaseUrl)) {
    throw new Error(
      "DATABASE_URL must use the Neon pooler host (-pooler) in production.",
    );
  }

  const pool = new pg.Pool({
    connectionString: normalizeDatabaseUrl(databaseUrl),
    max: 1,
    connectionTimeoutMillis: 5_000,
  });

  try {
    const applied = await pool.query(
      "SELECT filename FROM schema_migrations ORDER BY filename",
    );
    const appliedFiles = applied.rows.map((row) => String(row.filename));
    const missing = migrationFiles.filter((file) => !appliedFiles.includes(file));

    if (missing.length > 0) {
      throw new Error(
        `Database is missing migrations: ${missing.join(", ")}. Run npm run db:migrate.`,
      );
    }

    console.log(
      `check:db-schema live OK (${appliedFiles.length}/${migrationFiles.length} applied, pooler=${isPoolerConnection(databaseUrl)})`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    `check:db-schema failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
