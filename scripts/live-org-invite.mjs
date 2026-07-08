/**
 * Live org invitation test — mirrors issueClientInviteAction without Next.js.
 * Run: node --env-file=.env scripts/live-org-invite.mjs [email] [fullName]
 */
import pg from "pg";
import { getPgPoolConfig } from "./db-pool-config.mjs";
import { loadEnvFile, getEnv } from "./lib/load-env.mjs";
import {
  ensurePortalOrganization,
  findNeonAuthUser,
  withAdminSession,
} from "./lib/neon-auth-seed.mjs";

const env = loadEnvFile();
const recipientEmail = (process.argv[2] ?? "").trim().toLowerCase();
const fullName = (process.argv[3] ?? "Portal Client").trim();

const databaseUrl = getEnv("DATABASE_URL", env);
const adminEmail = getEnv("SHARED_ADMIN_EMAIL", env)?.trim().toLowerCase();
const adminPassword = getEnv("SHARED_ADMIN_PASSWORD", env);
const authBaseUrl = getEnv("NEON_AUTH_BASE_URL", env);
const cookieSecret = getEnv("NEON_AUTH_COOKIE_SECRET", env);
const appUrl = (getEnv("APP_URL", env) ?? "https://iam-check.vercel.app").replace(
  /\/$/,
  "",
);

function createInviteTokenValue() {
  return crypto.randomUUID().replace(/-/g, "");
}

async function inviteOrganizationMember(cookie, { email, organizationId }) {
  const response = await fetch(`${authBaseUrl.replace(/\/$/, "")}/organization/invite-member`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: appUrl,
      Referer: `${appUrl}/`,
      Cookie: cookie,
    },
    body: JSON.stringify({
      email,
      role: "member",
      organizationId,
      resend: true,
    }),
  });

  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  if (!response.ok) {
    throw new Error(
      body?.message ??
        body?.error ??
        `organization/invite-member failed (${response.status}): ${text}`,
    );
  }

  return body;
}

async function main() {
  if (!recipientEmail) {
    throw new Error("Usage: node --env-file=.env scripts/live-org-invite.mjs <email> [fullName]");
  }

  if (!databaseUrl || !adminEmail || !adminPassword || !authBaseUrl || !cookieSecret) {
    throw new Error(
      "Missing DATABASE_URL, SHARED_ADMIN_*, or NEON_AUTH_* env vars",
    );
  }

  const pool = new pg.Pool(getPgPoolConfig(databaseUrl));

  try {
    const adminUser = await findNeonAuthUser(pool, adminEmail);
    if (!adminUser?.id) {
      throw new Error(`Admin user not found: ${adminEmail}`);
    }

    const surveyResult = await pool.query(
      `SELECT id, title FROM surveys ORDER BY created_at DESC LIMIT 1`,
    );
    const survey = surveyResult.rows[0];
    if (!survey) {
      throw new Error("No surveys found — create a declaration first");
    }

    const token = createInviteTokenValue();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const inserted = await pool.query(
      `INSERT INTO client_invitations (token, email, full_name, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, status`,
      [token, recipientEmail, fullName, adminUser.id, expiresAt.toISOString()],
    );
    const invitation = inserted.rows[0];

    await pool.query(
      `INSERT INTO client_assignments (survey_id, client_email, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [survey.id, recipientEmail, adminUser.id],
    );

    const inviteResult = await withAdminSession(adminEmail, adminPassword, async (cookie) => {
      const organization = await ensurePortalOrganization({ cookie });
      const delivery = await inviteOrganizationMember(cookie, {
        email: recipientEmail,
        organizationId: organization.id,
      });
      return { organization, delivery };
    });

    console.log(
      JSON.stringify(
        {
          success: true,
          channel: "neon_auth_organization",
          recipientEmail,
          fullName,
          invitationId: invitation.id,
          survey: { id: survey.id, title: survey.title },
          organization: {
            id: inviteResult.organization.id,
            slug: inviteResult.organization.slug,
          },
          acceptInvitationUrl: `${appUrl}/join`,
          signInUrl: appUrl,
          neonAuthResponse: inviteResult.delivery,
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
