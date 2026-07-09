/**
 * Pre-sync validation: local env.config + env.secret vs production requirements.
 * Usage: node scripts/validate-env-for-sync.mjs
 */
import {
  composeEnv,
  getEnvValue,
  LOCAL_ONLY_KEYS,
  STALE_VERCEL_KEYS,
  VERCEL_PRODUCTION_KEYS,
} from "./lib/env-files.mjs";
import { listVercelEnvKeys } from "./lib/vercel-env.mjs";

const env = composeEnv({ write: false });
const checks = [];

function pass(id, detail) {
  checks.push({ id, status: "pass", detail });
}

function fail(id, detail) {
  checks.push({ id, status: "fail", detail });
}

function warn(id, detail) {
  checks.push({ id, status: "warn", detail });
}

function validateUrl(key) {
  const value = getEnvValue(key, env);
  if (!value) return { ok: false, reason: "missing" };
  try {
    new URL(value);
    return { ok: true };
  } catch {
    return { ok: false, reason: "invalid URL" };
  }
}

function validateEmail(key) {
  const value = getEnvValue(key, env);
  if (!value) return { ok: false, reason: "missing" };
  return { ok: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? true : false, reason: "invalid email" };
}

function main() {
  // 1. All Vercel production keys set locally
  const missingLocal = VERCEL_PRODUCTION_KEYS.filter((key) => !getEnvValue(key, env)?.trim());
  if (missingLocal.length) {
    fail("local-keys", `Missing locally: ${missingLocal.join(", ")}`);
  } else {
    pass("local-keys", `All ${VERCEL_PRODUCTION_KEYS.length} production keys set locally`);
  }

  // 2. Local-only keys not in sync list (sanity)
  const leaked = VERCEL_PRODUCTION_KEYS.filter((key) => LOCAL_ONLY_KEYS.has(key));
  if (leaked.length) {
    fail("local-only-leak", `Local-only keys in sync list: ${leaked.join(", ")}`);
  } else {
    pass("local-only-leak", "No local-only keys in Vercel sync list");
  }

  // 3. Schema-style validation
  const dbUrl = getEnvValue("DATABASE_URL", env);
  if (!dbUrl) {
    fail("database-url", "DATABASE_URL missing");
  } else {
    try {
      const url = new URL(dbUrl);
      const pooler =
        url.hostname.includes("-pooler") ||
        url.port === "6543" ||
        url.hostname.includes("pooler.");
      if (pooler) {
        pass("database-url", `Pooler host: ${url.hostname}`);
      } else {
        warn("database-url", `Non-pooler host (${url.hostname}) — serverless may degrade`);
      }
    } catch {
      fail("database-url", "DATABASE_URL is not a valid URL");
    }
  }

  const authUrl = validateUrl("NEON_AUTH_BASE_URL");
  if (authUrl.ok) pass("neon-auth-url", "NEON_AUTH_BASE_URL valid");
  else fail("neon-auth-url", `NEON_AUTH_BASE_URL: ${authUrl.reason}`);

  const cookieSecret = getEnvValue("NEON_AUTH_COOKIE_SECRET", env);
  if (!cookieSecret || cookieSecret.length < 32) {
    fail("neon-auth-secret", "NEON_AUTH_COOKIE_SECRET missing or < 32 chars");
  } else {
    pass("neon-auth-secret", "NEON_AUTH_COOKIE_SECRET length OK");
  }

  const clientPwd = getEnvValue("CLIENT_DEFAULT_PASSWORD", env);
  if (!clientPwd || clientPwd.length < 8) {
    fail("client-default-password", "CLIENT_DEFAULT_PASSWORD missing or < 8 chars");
  } else {
    pass("client-default-password", "CLIENT_DEFAULT_PASSWORD length OK");
  }

  for (const key of ["SHARED_ADMIN_EMAIL", "PREVIEW_CLIENT_EMAIL"]) {
    const r = validateEmail(key);
    if (r.ok) pass(key, "valid email");
    else fail(key, r.reason ?? "invalid");
  }

  const appUrl = getEnvValue("APP_URL", env);
  if (appUrl === "https://iam-check.vercel.app") {
    pass("app-url", "APP_URL matches production alias");
  } else {
    warn("app-url", `APP_URL is ${appUrl ?? "unset"} (expected https://iam-check.vercel.app)`);
  }

  // 4. Playground stays local
  const playgroundEnabled = getEnvValue("PLAYGROUND_ENABLED", env);
  if (playgroundEnabled === "true") {
    pass("playground-local", "PLAYGROUND_ENABLED=true (local only — excluded from sync)");
  } else {
    pass("playground-local", `PLAYGROUND_ENABLED=${playgroundEnabled ?? "unset"}`);
  }

  // 5. Vercel remote key audit
  let remote;
  try {
    remote = listVercelEnvKeys("production");
    pass("vercel-cli", "vercel env ls production succeeded");
  } catch (error) {
    fail("vercel-cli", String(error));
    remote = new Set();
  }

  const staleOnVercel = STALE_VERCEL_KEYS.filter((key) => remote.has(key));
  if (staleOnVercel.length) {
    fail("vercel-stale", `Stale keys on Vercel: ${staleOnVercel.join(", ")}`);
  } else {
    pass("vercel-stale", "No stale Supabase/SMTP/MailerSend keys on Vercel");
  }

  const playgroundOnVercel = [...LOCAL_ONLY_KEYS].filter(
    (key) => key.startsWith("PLAYGROUND_") && remote.has(key),
  );
  if (playgroundOnVercel.length) {
    fail("vercel-playground", `Playground keys on Vercel: ${playgroundOnVercel.join(", ")}`);
  } else {
    pass("vercel-playground", "No PLAYGROUND_* keys on Vercel");
  }

  const missingOnVercel = VERCEL_PRODUCTION_KEYS.filter((key) => !remote.has(key));
  if (missingOnVercel.length) {
    warn("vercel-missing", `Keys absent on Vercel (sync will add): ${missingOnVercel.join(", ")}`);
  } else {
    pass("vercel-missing", "All production keys present on Vercel");
  }

  // Report
  console.log("=== Pre-sync validation ===\n");
  for (const check of checks) {
    const icon = check.status === "pass" ? "✓" : check.status === "warn" ? "!" : "✗";
    console.log(`${icon} [${check.id}] ${check.detail}`);
  }

  const failures = checks.filter((c) => c.status === "fail");
  const warnings = checks.filter((c) => c.status === "warn");

  console.log(`\nSummary: ${checks.filter((c) => c.status === "pass").length} pass, ${warnings.length} warn, ${failures.length} fail`);

  if (failures.length) {
    console.error("\nValidation FAILED — fix issues before sync.");
    process.exit(1);
  }

  console.log("\nValidation PASSED — safe to sync.");
  process.exit(0);
}

main();
