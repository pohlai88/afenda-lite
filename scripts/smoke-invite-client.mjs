/**
 * Smoke test: register client + assignment (Neon Auth provision).
 * Run: node --env-file=.env scripts/smoke-invite-client.mjs [email] [fullName]
 */
import pg from "pg";
import { getPgPoolConfig } from "./db-pool-config.mjs";
import { loadEnvFile, getEnv } from "./lib/load-env.mjs";
import {
  ensureNeonClientUser,
  findNeonAuthUser,
} from "./lib/neon-auth-seed.mjs";

const env = loadEnvFile();
const recipientEmail = (process.argv[2] ?? "jackwee2020@gmail.com")
  .trim()
  .toLowerCase();
const fullName = (process.argv[3] ?? "Jack Wee").trim();
const appUrl = (getEnv("APP_URL", env) ?? "https://iam-check.vercel.app").replace(
  /\/$/,
  "",
);

const databaseUrl = getEnv("DATABASE_URL", env);
const adminEmail = getEnv("SHARED_ADMIN_EMAIL", env)?.trim().toLowerCase();
const adminPassword = getEnv("SHARED_ADMIN_PASSWORD", env);
const defaultPassword = getEnv("CLIENT_DEFAULT_PASSWORD", env);
const authBaseUrl = getEnv("NEON_AUTH_BASE_URL", env);
const cookieSecret = getEnv("NEON_AUTH_COOKIE_SECRET", env);

function createInviteTokenValue() {
  return crypto.randomUUID().replace(/-/g, "");
}

async function main() {
  if (
    !databaseUrl ||
    !defaultPassword ||
    !adminEmail ||
    !adminPassword ||
    !authBaseUrl ||
    !cookieSecret
  ) {
    throw new Error(
      "Missing DATABASE_URL, CLIENT_DEFAULT_PASSWORD, SHARED_ADMIN_*, or NEON_AUTH_* env vars",
    );
  }

  const pool = new pg.Pool(getPgPoolConfig(databaseUrl));

  try {
    const adminUser = await findNeonAuthUser(pool, adminEmail ?? "admin@iam-check.com");
    const invitedBy = adminUser?.id;
    if (!invitedBy) {
      throw new Error("Shared admin user not found in neon_auth.user");
    }

    const surveyResult = await pool.query(
      `SELECT id, title FROM surveys ORDER BY created_at DESC LIMIT 1`,
    );
    const survey = surveyResult.rows[0];
    if (!survey) {
      throw new Error("No surveys found — create a declaration first");
    }

    await ensureNeonClientUser({
      pool,
      adminEmail,
      adminPassword,
      email: recipientEmail,
      password: defaultPassword,
      name: fullName,
    });

    const token = createInviteTokenValue();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const inserted = await pool.query(
      `INSERT INTO client_invitations (token, email, full_name, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, token, email, full_name, status`,
      [token, recipientEmail, fullName, invitedBy, expiresAt.toISOString()],
    );
    const invitation = inserted.rows[0];

    await pool.query(
      `INSERT INTO client_assignments (survey_id, client_email, assigned_by)
       VALUES ($1, $2, $3)`,
      [survey.id, recipientEmail, invitedBy],
    );

    console.log(
      JSON.stringify(
        {
          success: true,
          channel: "neon_auth_provision_smoke",
          recipientEmail,
          invitationId: invitation.id,
          surveyId: survey.id,
          joinUrl: `${appUrl}/join?invitationId=${invitation.id}`,
          signInUrl: `${appUrl}/client/login`,
          note:
            "Production invites use Neon Auth organization email. This smoke script seeds auth user + DB rows for local testing only.",
          accessMessage: [
            "Client Declaration Portal",
            "",
            `Sign in: ${appUrl}/client/login`,
            `Email: ${recipientEmail}`,
            "",
            "New clients: register under Client invitations — use the organization invitation email to set your password.",
            "Returning clients: sign in, then open your assigned declaration.",
          ].join("\n"),
        },
        null,
        2,
      ),
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
