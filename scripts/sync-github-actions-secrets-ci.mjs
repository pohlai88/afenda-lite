/**
 * Push CI-only Neon branch secrets to GitHub Actions (Option 1 — S17).
 *
 * Does NOT change Vercel production env. Sets E2E_* Neon keys used by ci.yml.
 *
 * Usage:
 *   npm run configure:neon-auth-ci
 *   npm run sync:github-actions-secrets:ci
 */
import { spawnSync } from "node:child_process";
import { composeEnv, getEnvValue } from "./lib/env-files.mjs";
import {
  SANDBOX_INVITE_TOKEN,
  SANDBOX_SURVEY_SLUG,
} from "./lib/production-fixtures.mjs";
import {
  GITHUB_ACTIONS_CI_CREDENTIAL_KEYS,
  GITHUB_ACTIONS_E2E_NEON_KEYS,
} from "./lib/github-actions-ci-keys.mjs";
import { CI_NEON_BRANCH, fetchCiBranchDatabaseUrl } from "./lib/ci-neon-branch.mjs";

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

function resolveCredential(key, env) {
  if (key === "E2E_SURVEY_SLUG") {
    return getEnvValue(key, env) || SANDBOX_SURVEY_SLUG;
  }
  if (key === "E2E_INVITE_TOKEN") {
    return getEnvValue(key, env) || SANDBOX_INVITE_TOKEN;
  }
  return getEnvValue(key, env);
}

async function main() {
  const env = composeEnv({ write: false });
  const apiKey = getEnvValue("NEON_API_KEY", env);
  const cookieSecret = getEnvValue("NEON_AUTH_COOKIE_SECRET", env);

  console.log("Syncing GitHub Actions CI secrets (dedicated ci Neon branch)…\n");
  console.log(`CI branch: ${CI_NEON_BRANCH.name} (${CI_NEON_BRANCH.branchId})`);
  console.log("Does NOT change Vercel production env.\n");

  let databaseUrl = process.env.CI_E2E_DATABASE_URL;
  if (!databaseUrl) {
    if (!apiKey) {
      console.error("Missing NEON_API_KEY — set CI_E2E_DATABASE_URL or add NEON_API_KEY to env.secret.");
      process.exit(1);
    }
    databaseUrl = await fetchCiBranchDatabaseUrl(apiKey);
  }

  if (!cookieSecret) {
    console.error("Missing NEON_AUTH_COOKIE_SECRET in env.secret.");
    process.exit(1);
  }

  const neonValues = {
    E2E_DATABASE_URL: databaseUrl,
    E2E_NEON_AUTH_BASE_URL: CI_NEON_BRANCH.authBaseUrl,
    E2E_NEON_AUTH_COOKIE_SECRET: cookieSecret,
  };

  for (const key of GITHUB_ACTIONS_E2E_NEON_KEYS) {
    const value = neonValues[key];
    console.log(`Setting ${key}…`);
    gh(["secret", "set", key, "--body", value]);
  }

  for (const key of GITHUB_ACTIONS_CI_CREDENTIAL_KEYS) {
    const value = resolveCredential(key, env);
    if (!value) {
      console.warn(`Skipping ${key} — not set in env.config/env.secret`);
      continue;
    }
    console.log(`Setting ${key}…`);
    gh(["secret", "set", key, "--body", value]);
  }

  console.log("\nCI Neon secrets synced (E2E_* keys).");
  console.log("Legacy DATABASE_URL / NEON_AUTH_* on GitHub are unused by ci.yml.");
  console.log("Audit: npm run audit:github-actions-secrets");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
