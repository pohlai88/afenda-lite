/**
 * Smoke test: register client + assignment (no Supabase email).
 * Run: node --env-file=.env scripts/smoke-invite-client.mjs [email] [fullName]
 */
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { getPgPoolConfig } from "./db-pool-config.mjs";

const recipientEmail = (process.argv[2] ?? "jackwee2020@gmail.com").trim().toLowerCase();
const fullName = (process.argv[3] ?? "Jack Wee").trim();
const appUrl = (process.env.APP_URL ?? "https://iam-check.vercel.app").replace(/\/$/, "");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;
const adminEmail = process.env.SHARED_ADMIN_EMAIL?.trim().toLowerCase();
const defaultPassword = process.env.CLIENT_DEFAULT_PASSWORD;

function createInviteTokenValue() {
  return crypto.randomUUID().replace(/-/g, "");
}

async function ensureAuthUser(admin, email, name, password) {
  const { data: existingUsers } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const existing = existingUsers.users.find(
    (user) => user.email?.toLowerCase() === email,
  );

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: name, name },
    });
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, name },
  });
  if (error) throw error;
  return data.user.id;
}

async function main() {
  if (!supabaseUrl || !serviceRoleKey || !databaseUrl || !defaultPassword) {
    throw new Error(
      "Missing Supabase, DATABASE_URL, or CLIENT_DEFAULT_PASSWORD env vars",
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const pool = new pg.Pool(getPgPoolConfig(databaseUrl));

  try {
    const adminUserResult = await pool.query(
      `SELECT id FROM auth.users WHERE lower(email) = lower($1) LIMIT 1`,
      [adminEmail ?? "admin@iam-check.com"],
    );
    const invitedBy = adminUserResult.rows[0]?.id;
    if (!invitedBy) {
      throw new Error("Shared admin user not found in auth.users");
    }

    const surveyResult = await pool.query(
      `SELECT id, title FROM surveys ORDER BY created_at DESC LIMIT 1`,
    );
    const survey = surveyResult.rows[0];
    if (!survey) {
      throw new Error("No surveys found — create a declaration first");
    }

    await ensureAuthUser(admin, recipientEmail, fullName, defaultPassword);

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
          channel: "provision_no_email",
          recipientEmail,
          invitationId: invitation.id,
          surveyId: survey.id,
          signInUrl: appUrl,
          temporaryPassword: defaultPassword,
          accessMessage: [
            "Client Declaration Portal",
            "",
            `Sign in: ${appUrl}`,
            `Email: ${recipientEmail}`,
            `Temporary password: ${defaultPassword}`,
            "",
            "First visit: complete onboarding, then open your assigned declaration.",
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
