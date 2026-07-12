/**
 * Audit GitHub Actions secret *names* (no values) vs CI workflow requirements.
 *
 * Usage: npm run audit:github-actions-secrets
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  GITHUB_ACTIONS_CI_KEYS,
  GITHUB_ACTIONS_LEGACY_NEON_KEYS,
  GITHUB_ACTIONS_STALE_KEYS,
} from "./lib/github-actions-ci-keys.mjs";

function ghJson(args) {
  const result = spawnSync("gh", args, {
    encoding: "utf8",
    shell: false,
    env: { ...process.env, GITHUB_TOKEN: undefined },
  });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }
  return JSON.parse(result.stdout);
}

function main() {
  const raw = ghJson([
    "api",
    "repos/pohlai88/afenda-lite/actions/secrets",
    "--jq",
    ".secrets | map(.name)",
  ]);
  const presentSet = new Set(Array.isArray(raw) ? raw : []);
  const missing = GITHUB_ACTIONS_CI_KEYS.filter((k) => !presentSet.has(k));
  const stale = GITHUB_ACTIONS_STALE_KEYS.filter((k) => presentSet.has(k));
  const legacyPresent = GITHUB_ACTIONS_LEGACY_NEON_KEYS.filter((k) => presentSet.has(k));

  console.log("GitHub Actions secrets audit (afenda-lite)\n");
  console.log(`Present (${presentSet.size}): ${[...presentSet].sort().join(", ") || "(none)"}`);
  console.log(`Required for CI (${GITHUB_ACTIONS_CI_KEYS.length}): ${GITHUB_ACTIONS_CI_KEYS.join(", ")}\n`);

  if (missing.length === 0) {
    console.log("OK — all required CI secret names present.");
  } else {
    console.log(`MISSING (${missing.length}): ${missing.join(", ")}`);
    console.log("Fix: npm run sync:github-actions-secrets:production");
    console.log("Note: E2E_* must match production Neon branch (modules/identity/auth/neon-auth.manifest.json).");
  }

  if (legacyPresent.length > 0) {
    console.log(
      `\nLEGACY (optional — ci.yml uses E2E_* instead): ${legacyPresent.join(", ")}`,
    );
  }

  if (stale.length > 0) {
    console.log(`\nSTALE (remove manually): ${stale.join(", ")}`);
  }

  process.exit(missing.length > 0 ? 1 : 0);
}

const isMain =
  process.argv[1] &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (isMain) {
  main();
}
