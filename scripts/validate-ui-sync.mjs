/**
 * Validates DB prerequisites for UI surfaces (config + data materialization).
 */
import pg from "pg";
import { getPgPoolConfig } from "./db-pool-config.mjs";
import { loadEnvFile, getEnv } from "./lib/load-env.mjs";
import {
  SANDBOX_INVITE_TOKEN,
  SANDBOX_SURVEY_SLUG,
} from "./lib/production-fixtures.mjs";

const env = loadEnvFile();
const databaseUrl = getEnv("DATABASE_URL", env);
const previewEmail = (getEnv("PREVIEW_CLIENT_EMAIL", env) ?? "").trim().toLowerCase();
const adminEmail = (getEnv("SHARED_ADMIN_EMAIL", env) ?? "").trim().toLowerCase();
const playgroundSurveyId = getEnv("PLAYGROUND_SURVEY_ID", env);
const playgroundAssignmentId = getEnv("PLAYGROUND_ASSIGNMENT_ID", env);
const playgroundSlug = getEnv("PLAYGROUND_SURVEY_SLUG", env);

const checks = [];

function pass(surfaceId, detail) {
  checks.push({ surfaceId, status: "pass", detail });
}

function fail(surfaceId, detail) {
  checks.push({ surfaceId, status: "fail", detail });
}

async function main() {
  if (!databaseUrl) {
    console.error("validate-ui-sync: DATABASE_URL not set");
    process.exit(1);
  }

  const pool = new pg.Pool(getPgPoolConfig(databaseUrl));

  try {
    const surveyCount = await pool.query(`SELECT COUNT(*)::int AS n FROM surveys`);
    const sandboxSurvey = await pool.query(
      `SELECT id, slug, title FROM surveys WHERE slug = $1 LIMIT 1`,
      [SANDBOX_SURVEY_SLUG],
    );
    const sandbox = sandboxSurvey.rows[0];

    if (Number(surveyCount.rows[0]?.n) >= 1) {
      pass("admin-dashboard", `surveys=${surveyCount.rows[0].n}`);
    } else {
      fail("admin-dashboard", "no surveys — run npm run seed:production");
    }

    if (sandbox?.id) {
      pass("admin-declaration-detail", `sandbox survey ${sandbox.id}`);
    } else {
      fail("admin-declaration-detail", `missing slug ${SANDBOX_SURVEY_SLUG}`);
    }

    if (playgroundSurveyId && sandbox?.id === playgroundSurveyId) {
      pass("admin-survey-detail-playground", "PLAYGROUND_SURVEY_ID matches sandbox");
    } else if (playgroundSurveyId && sandbox?.id) {
      fail(
        "admin-survey-detail-playground",
        `PLAYGROUND_SURVEY_ID mismatch (env=${playgroundSurveyId}, db=${sandbox.id})`,
      );
    } else {
      fail("admin-survey-detail-playground", "PLAYGROUND_SURVEY_ID unset or sandbox missing");
    }

    const questionTypes = sandbox?.id
      ? await pool.query(
          `SELECT type, COUNT(*)::int AS n FROM survey_questions WHERE survey_id = $1 GROUP BY type`,
          [sandbox.id],
        )
      : { rows: [] };

    const types = new Set(questionTypes.rows.map((row) => row.type));
    if (types.has("yes_no") && types.has("text") && types.has("file")) {
      pass("client-declare", "sandbox has yes_no, text, file questions");
    } else {
      fail("client-declare", `question types: ${[...types].join(", ") || "none"}`);
    }

    const previewProfile = previewEmail
      ? await pool.query(
          `SELECT cp.user_id, cp.full_legal_name, cp.onboarding_complete, u.name AS auth_name
           FROM neon_auth."user" u
           LEFT JOIN client_profiles cp ON cp.user_id = u.id
           WHERE lower(u.email) = lower($1)`,
          [previewEmail],
        )
      : { rows: [] };

    const preview = previewProfile.rows[0];
    if (preview?.user_id && preview.onboarding_complete) {
      pass("client-dashboard", `preview profile onboarded (${previewEmail})`);
      if (
        preview.full_legal_name &&
        preview.auth_name &&
        preview.full_legal_name.trim() === preview.auth_name.trim()
      ) {
        pass("user-menu", "preview auth name matches profile legal name");
      } else {
        fail(
          "user-menu",
          `name drift: auth="${preview.auth_name ?? ""}" profile="${preview.full_legal_name ?? ""}"`,
        );
      }
    } else {
      fail("client-dashboard", "preview client profile missing or not onboarded");
      fail("user-menu", "cannot verify member sync without preview profile");
    }

    const assignment = previewEmail && sandbox?.id
      ? await pool.query(
          `SELECT id FROM client_assignments
           WHERE lower(client_email) = lower($1) AND survey_id = $2
           LIMIT 1`,
          [previewEmail, sandbox.id],
        )
      : { rows: [] };

    if (assignment.rows[0]?.id) {
      pass("client-declare-assignment", `assignment ${assignment.rows[0].id}`);
      if (
        playgroundAssignmentId &&
        playgroundAssignmentId === assignment.rows[0].id
      ) {
        pass("client-declare-playground", "PLAYGROUND_ASSIGNMENT_ID matches");
      } else if (playgroundAssignmentId) {
        fail(
          "client-declare-playground",
          `PLAYGROUND_ASSIGNMENT_ID mismatch (env=${playgroundAssignmentId})`,
        );
      } else {
        fail("client-declare-playground", "PLAYGROUND_ASSIGNMENT_ID unset");
      }
    } else {
      fail("client-declare-assignment", "preview client has no sandbox assignment");
      fail("client-declare-playground", "no assignment for playground");
    }

    const token = await pool.query(
      `SELECT token FROM survey_invite_tokens WHERE token = $1 LIMIT 1`,
      [SANDBOX_INVITE_TOKEN],
    );
    if (token.rows[0]) {
      pass("public-secure-link", `/f/${SANDBOX_INVITE_TOKEN}`);
    } else {
      fail("public-secure-link", "sandbox invite token missing");
    }

    if (playgroundSlug && playgroundSlug === SANDBOX_SURVEY_SLUG) {
      pass("public-survey-slug", `PLAYGROUND_SURVEY_SLUG=${playgroundSlug}`);
    } else if (sandbox?.slug) {
      fail(
        "public-survey-slug",
        `PLAYGROUND_SURVEY_SLUG mismatch (env=${playgroundSlug ?? ""}, db=${sandbox.slug})`,
      );
    }

    const admin = adminEmail
      ? await pool.query(
          `SELECT id, role FROM neon_auth."user" WHERE lower(email) = lower($1)`,
          [adminEmail],
        )
      : { rows: [] };
    if (admin.rows[0]?.role === "admin") {
      pass("shell-dashboard", `operator admin ${adminEmail}`);
    } else {
      fail("shell-dashboard", "SHARED_ADMIN_EMAIL not an admin in neon_auth");
    }

    const orphans = await pool.query(
      `SELECT q.id FROM survey_questions q
       WHERE NOT EXISTS (SELECT 1 FROM surveys s WHERE s.id = q.survey_id)
       UNION ALL
       SELECT a.id FROM client_assignments a
       WHERE NOT EXISTS (SELECT 1 FROM surveys s WHERE s.id = a.survey_id)`,
    );
    if (orphans.rows.length === 0) {
      pass("data-integrity", "no orphaned questions or assignments");
    } else {
      fail("data-integrity", `${orphans.rows.length} orphaned rows`);
    }
  } finally {
    await pool.end();
  }

  const failures = checks.filter((entry) => entry.status === "fail");
  console.log("UI sync validation\n");
  for (const entry of checks) {
    const mark = entry.status === "pass" ? "OK" : "FAIL";
    console.log(`${mark.padEnd(5)} ${entry.surfaceId.padEnd(32)} ${entry.detail}`);
  }

  if (failures.length > 0) {
    console.error(`\nvalidate-ui-sync failed (${failures.length} checks)`);
    process.exit(1);
  }

  console.log(`\nvalidate-ui-sync OK (${checks.length} checks)`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
