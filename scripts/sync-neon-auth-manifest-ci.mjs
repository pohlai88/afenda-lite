/**
 * Sync lib/auth/neon-auth.manifest.ci.json from the dedicated CI Neon branch.
 *
 * Usage:
 *   npm run configure:neon-auth-ci
 *   npm run sync:neon-auth-manifest:ci
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { loadComposedEnv, getEnvValue } from "./lib/env-files.mjs";
import { CI_NEON_BRANCH } from "./lib/ci-neon-branch.mjs";
import {
  buildNeonAuthManifest,
  parseJsonOutput,
} from "./lib/neon-auth-manifest-build.mjs";

const env = loadComposedEnv();
const apiKey = getEnvValue("NEON_API_KEY", env);

if (!apiKey) {
  console.error("Missing NEON_API_KEY in env.secret");
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

function runNeon(args) {
  return execFileSync("npx", ["neon@latest", ...args, ...neonArgs], {
    env: { ...process.env, NEON_API_KEY: apiKey },
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    shell: true,
  }).trim();
}

const neonFile = {
  projectId: CI_NEON_BRANCH.projectId,
  projectName: CI_NEON_BRANCH.projectName,
  branchId: CI_NEON_BRANCH.branchId,
  branchName: CI_NEON_BRANCH.name,
  orgId: CI_NEON_BRANCH.orgId,
};

const existing = JSON.parse(
  readFileSync("lib/auth/neon-auth.manifest.ci.json", "utf8"),
);

const status = runNeon(["neon-auth", "status"]);
const emailPassword = runNeon(["neon-auth", "config", "email-password", "get"]);
const emailProvider = runNeon(["neon-auth", "config", "email-provider", "get"]);
const trustedDomains = runNeon(["neon-auth", "domain", "list"]);
const oauthProvidersRaw = runNeon(["neon-auth", "oauth-provider", "list"]);

let magicLinkJson = null;
let organizationJson = null;
try {
  magicLinkJson = parseJsonOutput(runNeon(["neon-auth", "plugins", "get", "magic_link"]));
} catch {
  magicLinkJson = existing.plugins?.magicLink ?? null;
}
try {
  organizationJson = parseJsonOutput(runNeon(["neon-auth", "plugins", "get", "organization"]));
} catch {
  organizationJson = existing.plugins?.organization ?? null;
}

const manifest = buildNeonAuthManifest({
  neonFile,
  existing,
  statusJson: parseJsonOutput(status),
  emailPasswordJson: parseJsonOutput(emailPassword),
  emailProviderJson: parseJsonOutput(emailProvider),
  domainsJson: parseJsonOutput(trustedDomains),
  oauthProvidersJson: parseJsonOutput(oauthProvidersRaw),
  magicLinkJson,
  organizationJson,
});

manifest.productionChecklist = {
  ...(existing.productionChecklist ?? {}),
  requireLocalhostDisabledAtCutover: false,
};

if (manifest.allowLocalhost !== true) {
  console.warn(
    "WARN: Neon CLI did not report allow_localhost=true — forcing true for CI manifest (run configure:neon-auth-ci).",
  );
  manifest.allowLocalhost = true;
}

writeFileSync(
  "lib/auth/neon-auth.manifest.ci.json",
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

console.log("Updated lib/auth/neon-auth.manifest.ci.json");
console.log(`  baseUrl: ${manifest.integration.baseUrl}`);
console.log(`  allowLocalhost: ${manifest.allowLocalhost}`);
