/**
 * Write .env from process.env for CI jobs that use --env-file=.env in scripts.
 * GitHub Actions injects secrets as env vars; env.config/env.secret are not in the repo.
 */
import { writeFileSync } from "node:fs";
import { GITHUB_ACTIONS_CI_KEYS } from "./lib/github-actions-ci-keys.mjs";

const extra = [
  "APP_URL",
  "SHARED_ADMIN_NAME",
  "PLAYGROUND_SURVEY_SLUG",
  "PLAYGROUND_SURVEY_ID",
  "PLAYGROUND_ASSIGNMENT_ID",
];

const keys = [...new Set([...GITHUB_ACTIONS_CI_KEYS, ...extra])];
const lines = [];

for (const key of keys) {
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
console.log(`Wrote .env with ${lines.length} keys for CI script compatibility.`);
