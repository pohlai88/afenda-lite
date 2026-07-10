/**
 * Enable localhost on the dedicated CI Neon branch (Option 1 — S17 CI authority).
 *
 * Usage:
 *   npm run configure:neon-auth-ci
 */
import { execFileSync } from "node:child_process";
import { loadComposedEnv, getEnvValue } from "./lib/env-files.mjs";
import { CI_NEON_BRANCH } from "./lib/ci-neon-branch.mjs";

const env = loadComposedEnv();
const apiKey = getEnvValue("NEON_API_KEY", env);

if (!apiKey) {
  console.error("Missing NEON_API_KEY in env.secret — cannot configure CI branch auth.");
  process.exit(1);
}

const neonArgs = [
  "--project-id",
  CI_NEON_BRANCH.projectId,
  "--branch",
  CI_NEON_BRANCH.branchId,
  "-o",
  "json",
];

function runNeon(commandArgs) {
  return execFileSync("npx", ["neon@latest", ...commandArgs, ...neonArgs], {
    env: { ...process.env, NEON_API_KEY: apiKey },
    encoding: "utf8",
    shell: true,
  });
}

console.log(`Enabling localhost on Neon branch "${CI_NEON_BRANCH.name}" (${CI_NEON_BRANCH.branchId})…`);
runNeon(["neon-auth", "domain", "allow-localhost", "enable"]);
console.log("Done. Sync CI manifest: npm run sync:neon-auth-manifest:ci");
