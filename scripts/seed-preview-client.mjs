import { loadEnvFile, getEnv } from "./lib/load-env.mjs";
import pg from "pg";
import { getPgPoolConfig } from "./db-pool-config.mjs";
import {
  ensureNeonClientUser,
  findNeonAuthUser,
} from "./lib/neon-auth-seed.mjs";

const env = loadEnvFile();

const email = getEnv("PREVIEW_CLIENT_EMAIL", env);
const password =
  process.env.CLIENT_DEFAULT_PASSWORD ??
  getEnv("PREVIEW_CLIENT_PASSWORD", env);
const name = getEnv("PREVIEW_CLIENT_NAME", env) ?? "Preview Client";
const adminEmail = getEnv("SHARED_ADMIN_EMAIL", env);
const adminPassword = getEnv("SHARED_ADMIN_PASSWORD", env);
const databaseUrl = getEnv("DATABASE_URL", env);
const authBaseUrl = getEnv("NEON_AUTH_BASE_URL", env);
const cookieSecret = getEnv("NEON_AUTH_COOKIE_SECRET", env);

if (
  !email ||
  !password ||
  !databaseUrl ||
  !adminEmail ||
  !adminPassword ||
  !authBaseUrl ||
  !cookieSecret
) {
  console.error(
    "Missing PREVIEW_CLIENT_EMAIL, PREVIEW_CLIENT_PASSWORD (or CLIENT_DEFAULT_PASSWORD), DATABASE_URL, SHARED_ADMIN_*, NEON_AUTH_BASE_URL, or NEON_AUTH_COOKIE_SECRET",
  );
  process.exit(1);
}

const pool = new pg.Pool(getPgPoolConfig(databaseUrl));

async function main() {
  const userId = await ensureNeonClientUser({
    pool,
    adminEmail,
    adminPassword,
    email,
    password,
    name,
  });

  await pool.query(
    `INSERT INTO client_profiles (
       user_id, full_legal_name, nationality, country_of_residence,
       additional_residence_countries, passport_issuing_country, passport_number,
       phone, entity_name, jurisdiction, notes, identity_consent_at,
       onboarding_complete, portal_ack_at, portal_ack_version, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), true, NOW(), $12, NOW())
     ON CONFLICT (user_id) DO UPDATE
     SET full_legal_name = EXCLUDED.full_legal_name,
         nationality = EXCLUDED.nationality,
         country_of_residence = EXCLUDED.country_of_residence,
         additional_residence_countries = EXCLUDED.additional_residence_countries,
         passport_issuing_country = EXCLUDED.passport_issuing_country,
         passport_number = EXCLUDED.passport_number,
         phone = EXCLUDED.phone,
         entity_name = EXCLUDED.entity_name,
         jurisdiction = EXCLUDED.jurisdiction,
         notes = EXCLUDED.notes,
         identity_consent_at = EXCLUDED.identity_consent_at,
         onboarding_complete = true,
         portal_ack_at = NOW(),
         portal_ack_version = EXCLUDED.portal_ack_version,
         updated_at = NOW()`,
    [
      userId,
      "Preview Client",
      "SG",
      "SG",
      [],
      "SG",
      "E1234567",
      "+1 555 0199",
      "Preview Holdings Ltd",
      "Singapore",
      "Sandbox account for operator client-portal preview.",
      "2026-01",
    ],
  );

  const admin = await findNeonAuthUser(pool, adminEmail);
  const assignedBy = admin?.id ?? userId;
  const survey = await pool.query(
    `SELECT id, title, slug FROM surveys ORDER BY created_at ASC LIMIT 1`,
  );

  if (!survey.rows[0]) {
    console.warn(
      "No declarations found. Create a declaration in the dashboard, then re-run seed:preview-client to attach a sample assignment.",
    );
    return;
  }

  const surveyId = survey.rows[0].id;
  const surveySlug = survey.rows[0].slug ?? "";

  const assignment = await pool.query(
    `SELECT id FROM client_assignments
     WHERE lower(client_email) = lower($1) AND survey_id = $2
     LIMIT 1`,
    [email, surveyId],
  );

  let assignmentId;

  if (!assignment.rows[0]) {
    const inserted = await pool.query(
      `INSERT INTO client_assignments (survey_id, client_email, assigned_by, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING id`,
      [surveyId, email.toLowerCase(), assignedBy],
    );
    assignmentId = inserted.rows[0]?.id;
    console.log(
      `Assigned preview client to declaration "${survey.rows[0].title}"`,
    );
  } else {
    assignmentId = assignment.rows[0].id;
    console.log("Preview client assignment already exists.");
  }

  console.log("\nPlayground fixture IDs (copy to .env):");
  console.log(`PLAYGROUND_SURVEY_ID=${surveyId}`);
  console.log(`PLAYGROUND_ASSIGNMENT_ID=${assignmentId ?? ""}`);
  console.log(`PLAYGROUND_SURVEY_SLUG=${surveySlug}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
