import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import pg from "pg";
import { hashPassword } from "../node_modules/@neondatabase/auth/node_modules/better-auth/dist/crypto/index.mjs";

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

const email =
  process.env.PREVIEW_CLIENT_EMAIL ?? env.PREVIEW_CLIENT_EMAIL;
const password =
  process.env.PREVIEW_CLIENT_PASSWORD ?? env.PREVIEW_CLIENT_PASSWORD;
const name =
  process.env.PREVIEW_CLIENT_NAME ??
  env.PREVIEW_CLIENT_NAME ??
  "Preview Client";
const adminEmail =
  process.env.SHARED_ADMIN_EMAIL ?? env.SHARED_ADMIN_EMAIL;
const databaseUrl = process.env.DATABASE_URL ?? env.DATABASE_URL;

if (!email || !password || !databaseUrl) {
  console.error(
    "Missing PREVIEW_CLIENT_EMAIL, PREVIEW_CLIENT_PASSWORD, or DATABASE_URL",
  );
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: databaseUrl.replace(
    /([?&]sslmode=)(prefer|require|verify-ca)(?=(&|$))/,
    "$1verify-full",
  ),
});

async function main() {
  const existing = await pool.query(
    `SELECT id FROM neon_auth."user" WHERE lower(email) = lower($1) LIMIT 1`,
    [email],
  );

  let userId = existing.rows[0]?.id;

  if (!userId) {
    userId = randomUUID();
    const passwordHash = await hashPassword(password);

    await pool.query("BEGIN");
    try {
      await pool.query(
        `INSERT INTO neon_auth."user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt", role)
         VALUES ($1, $2, $3, true, NULL, NOW(), NOW(), NULL)`,
        [userId, name, email],
      );

      await pool.query(
        `INSERT INTO neon_auth.account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
         VALUES ($1, $2, 'credential', $3, $4, NOW(), NOW())`,
        [randomUUID(), userId, userId, passwordHash],
      );

      await pool.query("COMMIT");
      console.log(`Created preview client account for ${email}`);
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  } else {
    const passwordHash = await hashPassword(password);
    await pool.query(
      `UPDATE neon_auth."user"
       SET role = NULL, "emailVerified" = true, name = $2
       WHERE id = $1`,
      [userId, name],
    );

    const account = await pool.query(
      `SELECT id FROM neon_auth.account
       WHERE "userId" = $1 AND "providerId" = 'credential'
       LIMIT 1`,
      [userId],
    );

    if (account.rows[0]) {
      await pool.query(
        `UPDATE neon_auth.account SET password = $2, "updatedAt" = NOW() WHERE id = $1`,
        [account.rows[0].id, passwordHash],
      );
    } else {
      await pool.query(
        `INSERT INTO neon_auth.account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
         VALUES ($1, $2, 'credential', $3, $4, NOW(), NOW())`,
        [randomUUID(), userId, userId, passwordHash],
      );
    }

    console.log(`Updated preview client account for ${email}`);
  }

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

  const admin = adminEmail
    ? await pool.query(
        `SELECT id FROM neon_auth."user" WHERE lower(email) = lower($1) LIMIT 1`,
        [adminEmail],
      )
    : { rows: [] };

  const assignedBy = admin.rows[0]?.id ?? userId;
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
