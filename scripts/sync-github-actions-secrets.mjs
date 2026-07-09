/**
 * Push CI-required secrets to GitHub Actions from composed .env.
 * Does NOT use vercel env pull. Unsets GITHUB_TOKEN so gh keyring auth is used.
 *
 * Usage:
 *   npm run env:compose
 *   npm run sync:github-actions-secrets
 *
 * E2E_* defaults come from production sandbox fixtures when unset in env.
 */
import { spawnSync } from "node:child_process";
import { composeEnv, getEnvValue } from "./lib/env-files.mjs";
import {
  SANDBOX_INVITE_TOKEN,
  SANDBOX_SURVEY_SLUG,
} from "./lib/production-fixtures.mjs";
import { GITHUB_ACTIONS_CI_KEYS } from "./lib/github-actions-ci-keys.mjs";

function gh(args, input) {
  const result = spawnSync("gh", args, {
    encoding: "utf8",
    input,
    shell: false,
    env: { ...process.env, GITHUB_TOKEN: undefined },
  });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }
  return result.stdout;
}

function resolveValue(key, env) {
  if (key === "E2E_SURVEY_SLUG") {
    return getEnvValue(key, env) || SANDBOX_SURVEY_SLUG;
  }
  if (key === "E2E_INVITE_TOKEN") {
    return getEnvValue(key, env) || SANDBOX_INVITE_TOKEN;
  }
  return getEnvValue(key, env);
}

function main() {
  const env = composeEnv({ write: false });
  console.log("Syncing GitHub Actions CI secrets from env.config + env.secret…\n");
  console.warn(
    "DEPRECATED for CI: use npm run sync:github-actions-secrets:ci (dedicated ci Neon branch).",
  );
  console.log(
    "This script sets legacy DATABASE_URL / NEON_AUTH_* — not used by ci.yml after S17 Option 1.\n",
  );

  let synced = 0;
  let skipped = 0;

  for (const key of GITHUB_ACTIONS_CI_KEYS) {
    const value = resolveValue(key, env);
    if (!value) {
      console.warn(`Skipping ${key} — not set in env.config/env.secret`);
      skipped += 1;
      continue;
    }
    console.log(`Setting ${key}…`);
    gh(["secret", "set", key, "--body", value]);
    synced += 1;
  }

  console.log(`\nSynced ${synced} secrets. Skipped ${skipped}.`);
  console.log("Audit: npm run audit:github-actions-secrets");
  console.log("Re-run CI: push empty commit or gh workflow run CI --ref main");
}

main();
