import pg from "pg";
import { getPgPoolConfig } from "./db-pool-config.mjs";
import { loadDatabaseUrl } from "./lib/load-database-url.mjs";

const MIGRATION = "012_assignment_draft.sql";
const DRAFT_COLUMNS = [
  "draft_answers",
  "draft_step_index",
  "draft_saved_at",
];

async function main() {
  const databaseUrl = loadDatabaseUrl();
  if (!databaseUrl) {
    console.error("verify:draft-migration failed: DATABASE_URL not set.");
    process.exit(1);
  }

  const pool = new pg.Pool(getPgPoolConfig(databaseUrl));

  try {
    const applied = await pool.query(
      "SELECT filename, applied_at FROM schema_migrations WHERE filename = $1",
      [MIGRATION],
    );

    if (!applied.rows[0]) {
      throw new Error(`${MIGRATION} is not applied. Run npm run db:migrate.`);
    }

    const columns = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'client_assignments'
         AND column_name = ANY($1::text[])`,
      [DRAFT_COLUMNS],
    );

    const present = new Set(columns.rows.map((row) => String(row.column_name)));
    const missing = DRAFT_COLUMNS.filter((column) => !present.has(column));

    if (missing.length > 0) {
      throw new Error(
        `client_assignments missing draft columns: ${missing.join(", ")}`,
      );
    }

    console.log(
      `verify:draft-migration OK (${MIGRATION} applied at ${applied.rows[0].applied_at})`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    `verify:draft-migration failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
