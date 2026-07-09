#!/usr/bin/env node
/**
 * Point gitignored env.config + .neon at Neon branch dev-spec-b for local SPEC-B work.
 * Updates DATABASE_URL in env.secret via Neon API when NEON_API_KEY is set.
 *
 * Run: node scripts/apply-local-dev-spec-b-env.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnvFile } from "./lib/env-files.mjs";

const PROJECT_ID = "young-hat-54755363";
const DEV_BRANCH = {
  name: "dev-spec-b",
  branchId: "br-super-hill-aojc9a4p",
  authBaseUrl:
    "https://ep-curly-sky-aojpc61y.neonauth.c-2.ap-southeast-1.aws.neon.tech/neondb/auth",
};

const root = process.cwd();
const configPath = resolve(root, "env.config");
const secretPath = resolve(root, "env.secret");
const neonPath = resolve(root, ".neon");

function upsertEnvLine(content, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }
  return `${content.trimEnd()}\n${line}\n`;
}

async function fetchPoolerDatabaseUrl(apiKey) {
  const url = `https://console.neon.tech/api/v2/projects/${PROJECT_ID}/connection_uri?branch_id=${DEV_BRANCH.branchId}&database_name=neondb&role_name=neondb_owner&pooled=true`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Neon connection_uri failed (${response.status})`);
  }
  const payload = await response.json();
  const uri = payload?.uri;
  if (!uri) {
    throw new Error("Neon connection_uri response missing uri");
  }
  return uri;
}

if (!existsSync(configPath) || !existsSync(secretPath)) {
  console.error("Missing env.config or env.secret — copy from *.example first.");
  process.exit(1);
}

let config = readFileSync(configPath, "utf8");
if (!config.includes("Local dev branch (SPEC-B)")) {
  config = `# Local dev branch (SPEC-B): ${DEV_BRANCH.name} — localhost allowed\n${config}`;
}
config = upsertEnvLine(config, "NEON_AUTH_BASE_URL", DEV_BRANCH.authBaseUrl);
config = upsertEnvLine(config, "NEON_BRANCH_ID", DEV_BRANCH.branchId);
config = upsertEnvLine(config, "GUARDIAN_AUTH_SHELL", "true");
writeFileSync(configPath, config, "utf8");

const secretEnv = parseEnvFile("env.secret");
const apiKey = secretEnv.NEON_API_KEY;
if (apiKey) {
  const databaseUrl = await fetchPoolerDatabaseUrl(apiKey);
  let secret = readFileSync(secretPath, "utf8");
  secret = upsertEnvLine(secret, "DATABASE_URL", databaseUrl);
  writeFileSync(secretPath, secret, "utf8");
  console.log("Updated env.secret DATABASE_URL from Neon API (pooler).");
} else {
  console.warn(
    "NEON_API_KEY not set — update env.secret DATABASE_URL manually for branch dev-spec-b.",
  );
}

writeFileSync(
  neonPath,
  `${JSON.stringify(
    {
      projectId: PROJECT_ID,
      projectName: "iam-check",
      branchId: DEV_BRANCH.branchId,
      branchName: DEV_BRANCH.name,
      database: "neondb",
      orgId: "org-royal-bar-40022480",
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(`Local env → Neon branch ${DEV_BRANCH.name} (${DEV_BRANCH.branchId})`);
console.log("GUARDIAN_AUTH_SHELL=true");
console.log("Next: npm run bootstrap:spec-b   (or npm run env:compose && npm run dev)");
