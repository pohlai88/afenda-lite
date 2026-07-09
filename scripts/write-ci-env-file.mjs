/**
 * Write .env from process.env for CI jobs that use --env-file=.env in scripts.
 */
import { writeFileSync } from "node:fs";
import { GITHUB_ACTIONS_CI_KEYS } from "./lib/github-actions-ci-keys.mjs";

const extra = [
  "APP_URL",
  "SHARED_ADMIN_NAME",
  "NEON_AUTH_MANIFEST_PROFILE",
  "PLAYGROUND_SURVEY_SLUG",
  "PLAYGROUND_SURVEY_ID",
  "PLAYGROUND_ASSIGNMENT_ID",
];

const envAliases = {
  E2E_DATABASE_URL: "DATABASE_URL",
  E2E_NEON_AUTH_BASE_URL: "NEON_AUTH_BASE_URL",
  E2E_NEON_AUTH_COOKIE_SECRET: "NEON_AUTH_COOKIE_SECRET",
};

const lines = [];

for (const key of GITHUB_ACTIONS_CI_KEYS) {
  const value = process.env[key];
  if (value) {
    lines.push(`${key}=${value}`);
    const alias = envAliases[key];
    if (alias) {
      lines.push(`${alias}=${value}`);
    }
  }
}

for (const key of extra) {
  const value = process.env[key];
  if (value) {
    lines.push(`${key}=${value}`);
  }
}

if (lines.length === 0) {
  console.error("No env vars to write — is this running in CI with secrets?");
  process.exit(1);
}

writeFileSync(".env", `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote .env with ${lines.length} lines for CI script compatibility.`);
