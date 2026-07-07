import { join } from "node:path";
import process from "node:process";
import pg from "pg";
import {
  PORTAL_TABLES,
  REQUIRED_COLUMNS,
  REQUIRED_CONSTRAINTS,
  REQUIRED_INDEXES,
} from "../db/schema-manifest.mjs";
import { getPgPoolConfig, isPoolerConnection } from "./db-pool-config.mjs";
import { loadDatabaseUrl } from "./lib/load-database-url.mjs";
import { listMigrationFiles } from "./lib/list-migration-files.mjs";

async function assertTables(pool) {
  const result = await pool.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  const present = new Set(result.rows.map((row) => String(row.tablename)));
  const missing = PORTAL_TABLES.filter((table) => !present.has(table));
  if (missing.length > 0) {
    throw new Error(`Missing portal tables: ${missing.join(", ")}`);
  }
}

async function assertIndexes(pool) {
  const result = await pool.query(
    `SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`,
  );
  const present = new Set(result.rows.map((row) => String(row.indexname)));
  const missing = REQUIRED_INDEXES.filter((index) => !present.has(index));
  if (missing.length > 0) {
    throw new Error(`Missing portal indexes: ${missing.join(", ")}`);
  }
}

async function assertColumns(pool) {
  for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
    const result = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1`,
      [table],
    );
    const present = new Set(result.rows.map((row) => String(row.column_name)));
    const missing = columns.filter((column) => !present.has(column));
    if (missing.length > 0) {
      throw new Error(`Missing ${table} columns: ${missing.join(", ")}`);
    }
  }
}

async function assertConstraints(pool) {
  const result = await pool.query(
    `SELECT conname
     FROM pg_constraint
     WHERE connamespace = 'public'::regnamespace`,
  );
  const present = new Set(result.rows.map((row) => String(row.conname)));
  const missing = REQUIRED_CONSTRAINTS.filter(
    (constraint) => !present.has(constraint),
  );
  if (missing.length > 0) {
    throw new Error(`Missing portal constraints: ${missing.join(", ")}`);
  }
}

async function main() {
  const migrationFiles = listMigrationFiles();
  console.log(
    `check:db-schema OK (${migrationFiles.length} migration files present)`,
  );

  const databaseUrl = loadDatabaseUrl();
  if (!databaseUrl) {
    console.log("check:db-schema skipped live checks (DATABASE_URL not set).");
    return;
  }

  if (process.env.NODE_ENV === "production" && !isPoolerConnection(databaseUrl)) {
    throw new Error(
      "DATABASE_URL must use a pooler endpoint (-pooler host or port 6543) in production.",
    );
  }

  const pool = new pg.Pool(getPgPoolConfig(databaseUrl));

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

    await assertTables(pool);
    await assertColumns(pool);
    await assertIndexes(pool);
    await assertConstraints(pool);

    console.log(
      `check:db-schema live OK (${appliedFiles.length}/${migrationFiles.length} applied, pooler=${isPoolerConnection(databaseUrl)}, tables=${PORTAL_TABLES.length}, indexes=${REQUIRED_INDEXES.length}, constraints=${REQUIRED_CONSTRAINTS.length})`,
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
