import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import { getPgPoolConfig } from "./db-pool-config.mjs";
import { loadDatabaseUrl } from "./lib/load-database-url.mjs";
import { listMigrationFiles } from "./lib/list-migration-files.mjs";
import { splitSqlStatements, stripSqlLineComments } from "./lib/sql-split.mjs";

const databaseUrl = loadDatabaseUrl();

if (!databaseUrl) {
  console.log("Skipping migrations: DATABASE_URL not set.");
  process.exit(0);
}

const migrationsDir = resolve(process.cwd(), "db/migrations");
const files = listMigrationFiles();

const pool = new pg.Pool(getPgPoolConfig(databaseUrl));

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const appliedBefore = await pool.query(
    "SELECT filename FROM schema_migrations ORDER BY filename",
  );
  const appliedSet = new Set(
    appliedBefore.rows.map((row) => String(row.filename)),
  );

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`Skipping ${file} (already applied).`);
      continue;
    }

    const sql = readFileSync(resolve(migrationsDir, file), "utf8");
    const statements = splitSqlStatements(stripSqlLineComments(sql));

    console.log(`Applying ${file} (${statements.length} statements)...`);

    for (const statement of statements) {
      await pool.query(statement);
    }

    await pool.query(
      "INSERT INTO schema_migrations (filename) VALUES ($1)",
      [file],
    );
  }

  console.log("Migrations applied.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
