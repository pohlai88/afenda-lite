/**
 * E2E helpers for client portal acknowledgement and assignment lookup.
 *
 * Usage:
 *   node --env-file=.env scripts/e2e-client-portal-state.mjs assignment-id <email>
 *   node --env-file=.env scripts/e2e-client-portal-state.mjs set-ack <email> cleared|seeded
 */
import pg from "pg";
import { getPgPoolConfig } from "./db-pool-config.mjs";
import { getEnv, loadEnvFile } from "./lib/load-env.mjs";

const ACK_VERSION = "2026-01";

function usage() {
  console.error(
    "Usage: e2e-client-portal-state.mjs assignment-id <email> | set-ack <email> cleared|seeded",
  );
  process.exit(1);
}

const [command, emailArg, ackMode] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase();

if (!command || !email) {
  usage();
}

const env = loadEnvFile();
const databaseUrl = getEnv("DATABASE_URL", env);
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new pg.Pool(getPgPoolConfig(databaseUrl));

async function getAssignmentId() {
  const pending = await pool.query(
    `SELECT a.id
     FROM client_assignments a
     WHERE lower(a.client_email) = lower($1)
       AND NOT EXISTS (
         SELECT 1
         FROM survey_responses r
         WHERE r.assignment_id = a.id
       )
     ORDER BY a.created_at DESC
     LIMIT 1`,
    [email],
  );

  const assignmentId = pending.rows[0]?.id;
  if (!assignmentId) {
    console.error(
      JSON.stringify({ success: false, error: "pending_assignment_not_found" }),
    );
    process.exit(1);
  }

  console.log(JSON.stringify({ success: true, assignmentId }));
}

async function setAcknowledgement(mode) {
  const user = await pool.query(
    `SELECT u.id AS user_id
     FROM neon_auth."user" u
     WHERE lower(u.email) = lower($1)
     LIMIT 1`,
    [email],
  );

  const userId = user.rows[0]?.user_id;
  if (!userId) {
    console.error(JSON.stringify({ success: false, error: "user_not_found" }));
    process.exit(1);
  }

  if (mode === "cleared") {
    await pool.query(
      `UPDATE client_profiles
       SET portal_ack_at = NULL, portal_ack_version = NULL, updated_at = NOW()
       WHERE user_id = $1`,
      [userId],
    );
  } else if (mode === "seeded") {
    await pool.query(
      `UPDATE client_profiles
       SET portal_ack_at = NOW(), portal_ack_version = $2, updated_at = NOW()
       WHERE user_id = $1`,
      [userId, ACK_VERSION],
    );
  } else {
    usage();
  }

  console.log(JSON.stringify({ success: true, mode }));
}

try {
  if (command === "assignment-id") {
    await getAssignmentId();
  } else if (command === "set-ack") {
    await setAcknowledgement(ackMode);
  } else {
    usage();
  }
} finally {
  await pool.end();
}
