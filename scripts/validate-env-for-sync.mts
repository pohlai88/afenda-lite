/**
 * Pre-sync validation: local env.config + env.secret vs production requirements.
 * Runtime rules use modules/platform/env/schema.ts (same Zod schema as instrumentation.ts).
 *
 * Usage: npm run validate:env-sync
 */
import {
  CANONICAL_VERCEL_KEYS,
  composeEnv,
  getEnvValue,
  LOCAL_ONLY_KEYS,
  STALE_VERCEL_KEYS,
  SYNC_OPTIONAL_KEYS,
  VERCEL_PRODUCTION_KEYS,
} from "./lib/env-files.mjs";
import { listVercelEnvKeys } from "./lib/vercel-env.mjs";
import { parseServerEnv } from "../modules/platform/env/schema.ts";
import { deriveSyncRequiredEmailKeys } from "../modules/platform/env/manifest.ts";

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

function main() {
  // 1. Zod schema (shared with Next.js instrumentation)
  const parsed = parseServerEnv(env);
  if (parsed.success) {
    pass("runtime-schema", "Composed env passes modules/platform/env serverEnvSchema");
  } else {
    fail(
      "runtime-schema",
      parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; "),
    );
  }

  // 2. Canonical Vercel production keys set locally (excludes syncOptional tenant keys)
  const missingLocal = CANONICAL_VERCEL_KEYS.filter(
    (key) => !getEnvValue(key, env)?.trim(),
  );
  if (missingLocal.length) {
    fail("local-keys", `Missing locally: ${missingLocal.join(", ")}`);
  } else {
    pass(
      "local-keys",
      `All ${CANONICAL_VERCEL_KEYS.length} canonical production keys set locally`,
    );
  }

  const unsetOptional = [...SYNC_OPTIONAL_KEYS].filter(
    (key) => !getEnvValue(key, env)?.trim(),
  );
  if (unsetOptional.length) {
    pass(
      "sync-optional",
      `Tenant-owned unset (OK): ${unsetOptional.join(", ")}`,
    );
  } else {
    pass("sync-optional", "Tenant-owned syncOptional keys are set locally");
  }

  // 2b. When ERP sync is enabled, vendor + base URL become required
  const erpSyncOn = getEnvValue("FFT_ERP_SYNC_ENABLED", env) === "true";
  if (erpSyncOn) {
    const missingErp = ["FFT_ERP_VENDOR", "FFT_ERP_BASE_URL"].filter(
      (key) => !getEnvValue(key, env)?.trim(),
    );
    if (missingErp.length) {
      fail(
        "fft-erp-config",
        `FFT_ERP_SYNC_ENABLED=true requires: ${missingErp.join(", ")} (tenant/vendor pack)`,
      );
    } else {
      pass("fft-erp-config", "ERP sync on with vendor + base URL set");
    }
  } else {
    pass("fft-erp-config", "FFT_ERP_SYNC_ENABLED off — vendor/base URL not required");
  }

  // 3. Local-only keys not in sync list (sanity)
  const leaked = VERCEL_PRODUCTION_KEYS.filter((key) => LOCAL_ONLY_KEYS.has(key));
  if (leaked.length) {
    fail("local-only-leak", `Local-only keys in sync list: ${leaked.join(", ")}`);
  } else {
    pass("local-only-leak", "No local-only keys in Vercel sync list");
  }

  // 4. Deployment hints (not in Zod)
  const dbUrl = getEnvValue("DATABASE_URL", env);
  if (dbUrl) {
    try {
      const url = new URL(dbUrl);
      const pooler =
        url.hostname.includes("-pooler") ||
        url.port === "6543" ||
        url.hostname.includes("pooler.");
      if (pooler) {
        pass("database-url", `Pooler host: ${url.hostname}`);
      } else {
        warn(
          "database-url",
          `Non-pooler host (${url.hostname}) — serverless may degrade`,
        );
      }
    } catch {
      fail("database-url", "DATABASE_URL is not a valid URL");
    }
  }

  for (const key of deriveSyncRequiredEmailKeys()) {
    const value = getEnvValue(key, env)?.trim();
    if (value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      pass(key, "valid email");
    } else {
      fail(key, value ? "invalid email" : "missing");
    }
  }

  const appUrl = getEnvValue("APP_URL", env);
  const canonicalAppUrl = "https://afenda-lite.vercel.app";
  const legacyAppUrlAlias = "https://iam-check.vercel.app";
  if (appUrl === canonicalAppUrl) {
    pass("app-url", "APP_URL matches Afenda-Lite production");
  } else if (appUrl === legacyAppUrlAlias) {
    warn(
      "app-url",
      `APP_URL is legacy alias ${legacyAppUrlAlias} (canonical: ${canonicalAppUrl})`,
    );
  } else {
    warn(
      "app-url",
      `APP_URL is ${appUrl ?? "unset"} (expected ${canonicalAppUrl})`,
    );
  }

  const playgroundEnabled = getEnvValue("PLAYGROUND_ENABLED", env);
  if (playgroundEnabled === "true") {
    pass(
      "playground-local",
      "PLAYGROUND_ENABLED=true (local only — excluded from sync)",
    );
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
    fail(
      "vercel-playground",
      `Playground keys on Vercel: ${playgroundOnVercel.join(", ")}`,
    );
  } else {
    pass("vercel-playground", "No PLAYGROUND_* keys on Vercel");
  }

  const missingOnVercel = CANONICAL_VERCEL_KEYS.filter((key) => !remote.has(key));
  if (missingOnVercel.length) {
    warn(
      "vercel-missing",
      `Keys absent on Vercel (sync will add): ${missingOnVercel.join(", ")}`,
    );
  } else {
    pass("vercel-missing", "All canonical production keys present on Vercel");
  }

  console.log("=== Pre-sync validation ===\n");
  for (const check of checks) {
    const icon = check.status === "pass" ? "✓" : check.status === "warn" ? "!" : "✗";
    console.log(`${icon} [${check.id}] ${check.detail}`);
  }

  const failures = checks.filter((c) => c.status === "fail");
  const warnings = checks.filter((c) => c.status === "warn");

  console.log(
    `\nSummary: ${checks.filter((c) => c.status === "pass").length} pass, ${warnings.length} warn, ${failures.length} fail`,
  );

  if (failures.length) {
    console.error("\nValidation FAILED — fix issues before sync.");
    process.exit(1);
  }

  console.log("\nValidation PASSED — safe to sync.");
  process.exit(0);
}

main();
