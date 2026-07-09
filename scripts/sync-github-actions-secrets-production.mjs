/**
 * Push CI secrets aligned with production Neon branch + materialized manifest.
 *
 * Usage:
 *   Set production DATABASE_URL + NEON_AUTH_COOKIE_SECRET in env.secret (Gate 7 values).
 *   Set env.config NEON_AUTH_BASE_URL + NEON_BRANCH_ID to production branch.
 *   npm run env:compose
 *   npm run sync:github-actions-secrets:production
 *
 * Or pass DATABASE_URL once (not stored in repo):
 *   $env:CI_PRODUCTION_DATABASE_URL="postgresql://..."
 *   npm run sync:github-actions-secrets:production
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { composeEnv, getEnvValue } from "./lib/env-files.mjs";
import {
  SANDBOX_INVITE_TOKEN,
  SANDBOX_SURVEY_SLUG,
} from "./lib/production-fixtures.mjs";
import { GITHUB_ACTIONS_CI_KEYS } from "./lib/github-actions-ci-keys.mjs";

function gh(args) {
  const result = spawnSync("gh", args, {
    encoding: "utf8",
    shell: false,
    env: { ...process.env, GITHUB_TOKEN: undefined },
  });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }
}

function loadManifest() {
  const path = resolve("lib/auth/neon-auth.manifest.json");
  return JSON.parse(readFileSync(path, "utf8"));
}

function main() {
  const manifest = loadManifest();
  const env = composeEnv({ write: false });
  const branchId = getEnvValue("NEON_BRANCH_ID", env);
  const manifestBranch = manifest.project?.branchId;

  const databaseUrl =
    process.env.CI_PRODUCTION_DATABASE_URL || getEnvValue("DATABASE_URL", env);
  const authBaseUrl = manifest.integration?.baseUrl;
  const cookieSecret = getEnvValue("NEON_AUTH_COOKIE_SECRET", env);

  console.log("Syncing GitHub Actions CI secrets for PRODUCTION alignment…\n");
  console.log(`Manifest branch: ${manifestBranch} (${manifest.project?.branchName})`);
  console.log(`Local NEON_BRANCH_ID: ${branchId || "(unset)"}`);

  if (branchId && manifestBranch && branchId !== manifestBranch) {
    console.warn(
      "\nWARN: env.config NEON_BRANCH_ID does not match materialized manifest.",
    );
    console.warn(
      "Set production DATABASE_URL + NEON_AUTH in env.* per env.config comment, or pass CI_PRODUCTION_DATABASE_URL.\n",
    );
  }

  const values = {
    DATABASE_URL: databaseUrl,
    NEON_AUTH_BASE_URL: authBaseUrl,
    NEON_AUTH_COOKIE_SECRET: cookieSecret,
    SHARED_ADMIN_EMAIL: getEnvValue("SHARED_ADMIN_EMAIL", env),
    SHARED_ADMIN_PASSWORD: getEnvValue("SHARED_ADMIN_PASSWORD", env),
    CLIENT_DEFAULT_PASSWORD: getEnvValue("CLIENT_DEFAULT_PASSWORD", env),
    PREVIEW_CLIENT_EMAIL: getEnvValue("PREVIEW_CLIENT_EMAIL", env),
    PREVIEW_CLIENT_PASSWORD: getEnvValue("PREVIEW_CLIENT_PASSWORD", env),
    E2E_SURVEY_SLUG: getEnvValue("E2E_SURVEY_SLUG", env) || SANDBOX_SURVEY_SLUG,
    E2E_INVITE_TOKEN: getEnvValue("E2E_INVITE_TOKEN", env) || SANDBOX_INVITE_TOKEN,
  };

  for (const key of GITHUB_ACTIONS_CI_KEYS) {
    const value = values[key];
    if (!value) {
      console.error(`Missing ${key} — cannot sync production CI secrets.`);
      process.exit(1);
    }
    if (key === "DATABASE_URL" && !value.includes("ep-dawn-bird")) {
      console.warn(`WARN: DATABASE_URL does not look like production pooler (ep-dawn-bird).`);
    }
    console.log(`Setting ${key}…`);
    gh(["secret", "set", key, "--body", value]);
  }

  console.log("\nProduction-aligned CI secrets synced.");
  console.log("Audit: npm run audit:github-actions-secrets");
  console.log("Trigger CI: git commit --allow-empty -m 'ci: re-run' && git push");
}

main();
