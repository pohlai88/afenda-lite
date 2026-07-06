import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

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

const env = loadEnvFile();
const databaseUrl = process.env.DATABASE_URL || env.DATABASE_URL;

if (!databaseUrl) {
  console.log("Skipping migrations: DATABASE_URL not set.");
  process.exit(0);
}

const migrationsDir = resolve(process.cwd(), "db/migrations");
const files = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const pool = new pg.Pool({ connectionString: databaseUrl });

function stripLineComments(sql) {
  return sql
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const file of files) {
    const applied = await pool.query(
      "SELECT 1 FROM schema_migrations WHERE filename = $1 LIMIT 1",
      [file],
    );

    if (applied.rowCount && applied.rowCount > 0) {
      console.log(`Skipping ${file} (already applied).`);
      continue;
    }

    const sql = readFileSync(resolve(migrationsDir, file), "utf8");
    const statements = stripLineComments(sql)
      .split(";")
      .map((statement) => statement.trim())
      .filter(Boolean);

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
