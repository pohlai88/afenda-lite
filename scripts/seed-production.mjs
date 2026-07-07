/**
 * Production baseline seed: admin, preview client profile, sandbox declaration,
 * assignment, secure link token, and playground env IDs.
 *
 * Usage: node --env-file=.env scripts/seed-production.mjs [--write-env]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import { getPgPoolConfig } from "./db-pool-config.mjs";
import { loadEnvFile, getEnv } from "./lib/load-env.mjs";
import {
  ensureNeonAdminUser,
  ensureNeonClientUser,
  withAdminSession,
  adminUpdateUser,
} from "./lib/neon-auth-seed.mjs";
import {
  SANDBOX_ACK_VERSION,
  SANDBOX_INVITE_TOKEN,
  SANDBOX_QUESTIONS,
  SANDBOX_SURVEY,
  SANDBOX_SURVEY_SLUG,
} from "./lib/production-fixtures.mjs";

const env = loadEnvFile();
const writeEnv = process.argv.includes("--write-env");

const databaseUrl = getEnv("DATABASE_URL", env);
const adminEmail = getEnv("SHARED_ADMIN_EMAIL", env);
const adminPassword = getEnv("SHARED_ADMIN_PASSWORD", env);
const adminName = getEnv("SHARED_ADMIN_NAME", env) ?? "Portal Operator";
const previewEmail = getEnv("PREVIEW_CLIENT_EMAIL", env);
const previewPassword =
  process.env.CLIENT_DEFAULT_PASSWORD ??
  getEnv("PREVIEW_CLIENT_PASSWORD", env);
const previewName = getEnv("PREVIEW_CLIENT_NAME", env) ?? "Preview Client";
const authBaseUrl = getEnv("NEON_AUTH_BASE_URL", env);
const cookieSecret = getEnv("NEON_AUTH_COOKIE_SECRET", env);

if (
  !databaseUrl ||
  !adminEmail ||
  !adminPassword ||
  !previewEmail ||
  !previewPassword ||
  !authBaseUrl ||
  !cookieSecret
) {
  console.error(
    "Missing DATABASE_URL, SHARED_ADMIN_*, PREVIEW_CLIENT_*, NEON_AUTH_BASE_URL, or NEON_AUTH_COOKIE_SECRET",
  );
  process.exit(1);
}

const pool = new pg.Pool(getPgPoolConfig(databaseUrl));

async function ensureSandboxDeclaration(adminUserId) {
  const existing = await pool.query(
    `SELECT id FROM surveys WHERE slug = $1 LIMIT 1`,
    [SANDBOX_SURVEY_SLUG],
  );

  let surveyId = existing.rows[0]?.id;

  if (surveyId) {
    await pool.query(
      `UPDATE surveys
       SET title = $2,
           question = $3,
           user_id = $4,
           reference_number = $5,
           case_number = $6,
           effective_date = CURRENT_DATE,
           submit_before = NOW() + INTERVAL '90 days',
           surveyor_name = $7,
           surveyor_org = $8,
           surveyee_individual = $9,
           surveyee_org = $10,
           purpose = $11,
           categories = $12
       WHERE id = $1`,
      [
        surveyId,
        SANDBOX_SURVEY.title,
        SANDBOX_SURVEY.question,
        adminUserId,
        SANDBOX_SURVEY.referenceNumber,
        SANDBOX_SURVEY.caseNumber,
        SANDBOX_SURVEY.surveyorName,
        SANDBOX_SURVEY.surveyorOrg,
        SANDBOX_SURVEY.surveyeeIndividual,
        SANDBOX_SURVEY.surveyeeOrg,
        SANDBOX_SURVEY.purpose,
        SANDBOX_SURVEY.categories,
      ],
    );
    console.log(`Updated sandbox declaration (${SANDBOX_SURVEY_SLUG})`);
  } else {
    const inserted = await pool.query(
      `INSERT INTO surveys (
         slug, title, question, user_id,
         reference_number, case_number, effective_date, submit_before,
         surveyor_name, surveyor_org, surveyee_individual, surveyee_org,
         purpose, categories
       )
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, NOW() + INTERVAL '90 days',
               $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        SANDBOX_SURVEY_SLUG,
        SANDBOX_SURVEY.title,
        SANDBOX_SURVEY.question,
        adminUserId,
        SANDBOX_SURVEY.referenceNumber,
        SANDBOX_SURVEY.caseNumber,
        SANDBOX_SURVEY.surveyorName,
        SANDBOX_SURVEY.surveyorOrg,
        SANDBOX_SURVEY.surveyeeIndividual,
        SANDBOX_SURVEY.surveyeeOrg,
        SANDBOX_SURVEY.purpose,
        SANDBOX_SURVEY.categories,
      ],
    );
    surveyId = inserted.rows[0].id;
    console.log(`Created sandbox declaration (${SANDBOX_SURVEY_SLUG})`);
  }

  await pool.query(`DELETE FROM survey_questions WHERE survey_id = $1`, [surveyId]);

  for (const question of SANDBOX_QUESTIONS) {
    await pool.query(
      `INSERT INTO survey_questions (survey_id, prompt, type, required, sort_order, config)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        surveyId,
        question.prompt,
        question.type,
        question.required,
        question.sortOrder,
        JSON.stringify(question.config),
      ],
    );
  }

  console.log(`Seeded ${SANDBOX_QUESTIONS.length} sandbox questions`);

  return surveyId;
}

async function ensurePreviewAssignment(surveyId, adminUserId, clientEmail) {
  const existing = await pool.query(
    `SELECT id FROM client_assignments
     WHERE lower(client_email) = lower($1) AND survey_id = $2
     LIMIT 1`,
    [clientEmail, surveyId],
  );

  if (existing.rows[0]?.id) {
    console.log("Preview client assignment already exists.");
    return existing.rows[0].id;
  }

  const inserted = await pool.query(
    `INSERT INTO client_assignments (survey_id, client_email, assigned_by, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING id`,
    [surveyId, clientEmail.toLowerCase(), adminUserId],
  );

  console.log("Assigned preview client to sandbox declaration");
  return inserted.rows[0].id;
}

async function ensureInviteToken(surveyId, adminUserId) {
  const existing = await pool.query(
    `SELECT id FROM survey_invite_tokens WHERE token = $1 LIMIT 1`,
    [SANDBOX_INVITE_TOKEN],
  );

  if (existing.rows[0]?.id) {
    await pool.query(
      `UPDATE survey_invite_tokens SET survey_id = $2, created_by = $3 WHERE token = $1`,
      [SANDBOX_INVITE_TOKEN, surveyId, adminUserId],
    );
    return;
  }

  await pool.query(
    `INSERT INTO survey_invite_tokens (token, survey_id, created_by)
     VALUES ($1, $2, $3)`,
    [SANDBOX_INVITE_TOKEN, surveyId, adminUserId],
  );
  console.log(`Created secure invite token (${SANDBOX_INVITE_TOKEN})`);
}

async function ensurePreviewProfile(userId) {
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
      previewName,
      "SG",
      "SG",
      [],
      "SG",
      "E1234567",
      "+1 555 0199",
      "Preview Holdings Ltd",
      "Singapore",
      "Sandbox account for operator client-portal preview.",
      SANDBOX_ACK_VERSION,
    ],
  );
}

function upsertEnvKeys(updates) {
  const envPath = resolve(process.cwd(), ".env");
  let content;
  try {
    content = readFileSync(envPath, "utf8");
  } catch {
    console.warn(".env not found — skipping write");
    return;
  }

  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    if (pattern.test(content)) {
      content = content.replace(pattern, line);
    } else {
      content = `${content.trimEnd()}\n${line}\n`;
    }
  }

  writeFileSync(envPath, content, "utf8");
  console.log(`Updated .env: ${Object.keys(updates).join(", ")}`);
}

async function main() {
  console.log("Seeding production baseline…\n");

  const adminUserId = await ensureNeonAdminUser({
    pool,
    email: adminEmail,
    password: adminPassword,
    name: adminName,
  });

  const previewUserId = await ensureNeonClientUser({
    pool,
    adminEmail,
    adminPassword,
    email: previewEmail,
    password: previewPassword,
    name: previewName,
  });

  await ensurePreviewProfile(previewUserId);

  await withAdminSession(adminEmail, adminPassword, async (cookie) => {
    await adminUpdateUser(cookie, {
      userId: previewUserId,
      data: { name: previewName },
    });
  });

  const surveyId = await ensureSandboxDeclaration(adminUserId);
  const assignmentId = await ensurePreviewAssignment(
    surveyId,
    adminUserId,
    previewEmail,
  );
  await ensureInviteToken(surveyId, adminUserId);

  const fixtureOutput = {
    PLAYGROUND_SURVEY_ID: surveyId,
    PLAYGROUND_ASSIGNMENT_ID: assignmentId,
    PLAYGROUND_SURVEY_SLUG: SANDBOX_SURVEY_SLUG,
  };

  console.log("\nPlayground fixture IDs:");
  for (const [key, value] of Object.entries(fixtureOutput)) {
    console.log(`${key}=${value}`);
  }
  console.log(`\nSecure link smoke path: /f/${SANDBOX_INVITE_TOKEN}`);
  console.log(`Public survey smoke path: /survey/${SANDBOX_SURVEY_SLUG}`);

  if (writeEnv) {
    upsertEnvKeys(fixtureOutput);
  } else {
    console.log("\nTip: re-run with --write-env to update .env PLAYGROUND_* keys.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
