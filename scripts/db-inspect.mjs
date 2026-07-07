import pg from "pg";
import { getPgPoolConfig } from "./db-pool-config.mjs";
import { loadDatabaseUrl } from "./lib/load-database-url.mjs";

const databaseUrl = loadDatabaseUrl();
if (!databaseUrl) {
  throw new Error("DATABASE_URL not found");
}

const pool = new pg.Pool(getPgPoolConfig(databaseUrl));

const tables = await pool.query(
  "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
);
console.log("TABLES:", tables.rows.map((r) => r.tablename).join(", "));

const indexes = await pool.query(
  "SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname",
);
console.log("\nINDEXES:");
for (const row of indexes.rows) {
  console.log(`${row.tablename} | ${row.indexname}`);
}

const migrations = await pool.query(
  "SELECT filename, applied_at FROM schema_migrations ORDER BY filename",
);
console.log("\nMIGRATIONS:");
for (const row of migrations.rows) {
  console.log(`${row.filename} @ ${row.applied_at}`);
}

const explainCases = [
  {
    name: "listClientAssignments",
    sql: `EXPLAIN (FORMAT JSON)
      SELECT a.id FROM client_assignments a
      JOIN surveys s ON s.id = a.survey_id
      WHERE a.client_email = $1 ORDER BY a.created_at DESC`,
    params: ["test@example.com"],
  },
  {
    name: "getActiveAssignment",
    sql: `EXPLAIN (FORMAT JSON)
      SELECT a.id FROM client_assignments a
      WHERE a.client_email = $1 AND a.survey_id = $2 AND a.status <> $3
      ORDER BY a.created_at DESC LIMIT 1`,
    params: [
      "test@example.com",
      "00000000-0000-0000-0000-000000000001",
      "submitted",
    ],
  },
  {
    name: "getInvitationByEmail",
    sql: `EXPLAIN (FORMAT JSON)
      SELECT id FROM client_invitations
      WHERE lower(email) = lower($1) ORDER BY created_at DESC LIMIT 1`,
    params: ["test@example.com"],
  },
  {
    name: "listQuestionsOrdered",
    sql: `EXPLAIN (FORMAT JSON)
      SELECT id FROM survey_questions
      WHERE survey_id = $1 ORDER BY sort_order ASC`,
    params: ["00000000-0000-0000-0000-000000000001"],
  },
  {
    name: "evidenceBatch",
    sql: `EXPLAIN (FORMAT JSON)
      SELECT id FROM evidence_records
      WHERE survey_id = $1 AND id = ANY($2::uuid[])`,
    params: [
      "00000000-0000-0000-0000-000000000001",
      ["00000000-0000-0000-0000-000000000002"],
    ],
  },
  {
    name: "pendingCount",
    sql: `EXPLAIN (FORMAT JSON)
      SELECT COUNT(*) FROM client_assignments WHERE status = $1`,
    params: ["pending"],
  },
];

function summarizePlan(plan) {
  const index = plan["Index Name"] ?? plan["Index Cond"] ?? "";
  return `${plan["Node Type"]}${index ? ` idx=${index}` : ""} cost=${plan["Total Cost"]}`;
}

console.log("\nQUERY PLANS:");
for (const testCase of explainCases) {
  const result = await pool.query(testCase.sql, testCase.params);
  const plan = result.rows[0]["QUERY PLAN"][0].Plan;
  console.log(`${testCase.name}: ${summarizePlan(plan)}`);
}

await pool.end();
