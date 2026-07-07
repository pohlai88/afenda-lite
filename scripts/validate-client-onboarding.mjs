/**
 * Validates client onboarding lifecycle against Neon Auth + portal DB.
 * Run: node --env-file=.env scripts/validate-client-onboarding.mjs
 */
import pg from "pg";
import { getPgPoolConfig } from "./db-pool-config.mjs";
import { loadEnvFile, getEnv } from "./lib/load-env.mjs";
import { findNeonAuthUser } from "./lib/neon-auth-seed.mjs";

const env = loadEnvFile();
const APP_URL = getEnv("APP_URL", env) ?? "https://iam-check.vercel.app";
const databaseUrl = getEnv("DATABASE_URL", env);
const authBaseUrl = getEnv("NEON_AUTH_BASE_URL", env);
const cookieSecret = getEnv("NEON_AUTH_COOKIE_SECRET", env);

function fail(message, detail) {
  return { ok: false, message, detail };
}

function pass(message, detail) {
  return { ok: true, message, detail };
}

async function checkEnv() {
  const missing = [
    !databaseUrl && "DATABASE_URL",
    !authBaseUrl && "NEON_AUTH_BASE_URL",
    !cookieSecret && "NEON_AUTH_COOKIE_SECRET",
  ].filter(Boolean);

  if (missing.length) {
    return fail(`Missing env: ${missing.join(", ")}`);
  }

  return pass("Environment variables present");
}

async function checkSchema(pool) {
  const required = [
    "client_invitations",
    "client_profiles",
    "client_assignments",
    "audit_events",
    "schema_migrations",
  ];

  const result = await pool.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = ANY($1::text[])`,
    [required],
  );

  const found = new Set(result.rows.map((row) => row.table_name));
  const missing = required.filter((name) => !found.has(name));

  if (missing.length) {
    return fail(`Missing portal tables: ${missing.join(", ")}`);
  }

  const neonAuth = await pool.query(
    `SELECT COUNT(*)::int AS tables
     FROM information_schema.tables
     WHERE table_schema = 'neon_auth'`,
  );

  if ((neonAuth.rows[0]?.tables ?? 0) === 0) {
    return fail("neon_auth schema is missing — provision Neon Auth on this branch");
  }

  const migrations = await pool.query(
    `SELECT filename FROM schema_migrations ORDER BY filename`,
  );

  return pass("Portal schema present", {
    tables: [...found],
    neonAuthTables: neonAuth.rows[0]?.tables,
    migrations: migrations.rows.map((row) => row.filename),
  });
}

async function checkAuthUsers(pool) {
  const usersResult = await pool.query(
    `SELECT id, email, name, role, "emailVerified"
     FROM neon_auth."user"
     ORDER BY email`,
  );

  const users = usersResult.rows.map((user) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    verified: user.emailVerified,
    name: user.name,
  }));

  const adminEmail = getEnv("SHARED_ADMIN_EMAIL", env)?.toLowerCase();
  const previewEmail = getEnv("PREVIEW_CLIENT_EMAIL", env)?.toLowerCase();

  const adminUser = users.find((user) => user.email?.toLowerCase() === adminEmail);
  const previewUser = users.find(
    (user) => user.email?.toLowerCase() === previewEmail,
  );

  const issues = [];
  if (!adminUser) {
    issues.push("Shared admin user not found in neon_auth.user");
  } else if (adminUser.role !== "admin") {
    issues.push("Shared admin missing role=admin (run npm run seed:admin)");
  }

  if (previewEmail && !previewUser) {
    issues.push("Preview client user not found in neon_auth.user");
  }

  if (issues.length) {
    return fail(issues.join("; "), { users });
  }

  return pass("Neon Auth users configured", { users });
}

async function checkAuthEndpoint() {
  const jwksUrl = new URL(
    ".well-known/jwks.json",
    authBaseUrl.endsWith("/") ? authBaseUrl : `${authBaseUrl}/`,
  );
  const response = await fetch(jwksUrl, { method: "GET" });
  if (!response.ok) {
    return fail(`Neon Auth JWKS endpoint returned ${response.status}`);
  }

  return pass("Neon Auth JWKS reachable", { url: jwksUrl.toString() });
}

async function checkOnboardingState(pool) {
  const profiles = await pool.query(
    `SELECT user_id, onboarding_complete
     FROM client_profiles
     ORDER BY updated_at DESC
     LIMIT 20`,
  );

  return pass("Client profiles readable", {
    profiles: profiles.rows,
    appUrl: APP_URL,
  });
}

async function main() {
  const checks = [];
  checks.push(["env", await checkEnv()]);

  if (!databaseUrl) {
    printReport(checks);
    process.exit(1);
  }

  const pool = new pg.Pool(getPgPoolConfig(databaseUrl));
  try {
    checks.push(["schema", await checkSchema(pool)]);
    checks.push(["auth-users", await checkAuthUsers(pool)]);
    checks.push(["auth-endpoint", await checkAuthEndpoint()]);
    checks.push(["onboarding", await checkOnboardingState(pool)]);

    const adminEmail = getEnv("SHARED_ADMIN_EMAIL", env);
    if (adminEmail) {
      const admin = await findNeonAuthUser(pool, adminEmail);
      checks.push([
        "admin-lookup",
        admin
          ? pass("Admin user resolvable by email", { id: admin.id })
          : fail("Admin user not found by email lookup"),
      ]);
    }
  } finally {
    await pool.end();
  }

  printReport(checks);
  const failed = checks.some(([, result]) => !result.ok);
  process.exit(failed ? 1 : 0);
}

function printReport(checks) {
  console.log("\nClient onboarding validation\n");
  for (const [name, result] of checks) {
    const icon = result.ok ? "OK" : "FAIL";
    console.log(`${icon}  ${name}: ${result.message}`);
    if (result.detail) {
      console.log(JSON.stringify(result.detail, null, 2));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
