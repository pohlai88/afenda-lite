#!/usr/bin/env node
/**
 * Point gitignored env.config + env.secret + .neon at Neon production branch.
 * Single-branch policy — local dev and production use br-tiny-hill-ao82jp6f.
 *
 * Run: npm run env:neon-production
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnvFile } from "./lib/env-files.mjs";

const PROJECT_ID = "young-hat-54755363";
const ORG_ID = "org-fragrant-lake-90358173";
const PROJECT_NAME = "Afenda-Lite";
const PRODUCTION_BRANCH = {
  authBaseUrl:
    "https://ep-dawn-bird-aofi3f7j.neonauth.c-2.ap-southeast-1.aws.neon.tech/neondb/auth",
  branchId: "br-tiny-hill-ao82jp6f",
  name: "production",
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
  const url = `https://console.neon.tech/api/v2/projects/${PROJECT_ID}/connection_uri?branch_id=${PRODUCTION_BRANCH.branchId}&database_name=neondb&role_name=neondb_owner&pooled=true`;
  const response = await fetch(url, {
    headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}` },
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

if (!(existsSync(configPath) && existsSync(secretPath))) {
  console.error(
    "Missing env.config or env.secret — copy from *.example first."
  );
  process.exit(1);
}

let config = readFileSync(configPath, "utf8");
config = config.replace(/^# Local dev branch \(SPEC-B\):.*\n/gm, "");
config = config.replace(/^# Gate 4B production-branch seed:.*\n/gm, "");
if (!config.includes(`Neon project: ${PROJECT_NAME}`)) {
  config = `# Neon project: ${PROJECT_NAME} (${PROJECT_ID}) — production branch only\n${config}`;
}
config = config.replace(
  /Neon project: iam-check/g,
  `Neon project: ${PROJECT_NAME}`
);
config = config.replace(
  /Neon project: afenda-lite/g,
  `Neon project: ${PROJECT_NAME}`
);
config = upsertEnvLine(
  config,
  "NEON_AUTH_BASE_URL",
  PRODUCTION_BRANCH.authBaseUrl
);
config = upsertEnvLine(config, "NEON_BRANCH_ID", PRODUCTION_BRANCH.branchId);
config = upsertEnvLine(config, "NEON_PROJECT_ID", PROJECT_ID);
config = upsertEnvLine(config, "NEON_ORG_ID", ORG_ID);
config = upsertEnvLine(config, "GUARDIAN_AUTH_SHELL", "true");
writeFileSync(configPath, config, "utf8");

const secretEnv = parseEnvFile("env.secret");
const apiKey = secretEnv.NEON_API_KEY;
if (apiKey) {
  const databaseUrl = await fetchPoolerDatabaseUrl(apiKey);
  let secret = readFileSync(secretPath, "utf8");
  secret = upsertEnvLine(secret, "DATABASE_URL", databaseUrl);
  writeFileSync(secretPath, secret, "utf8");
  console.log(
    "Updated env.secret DATABASE_URL from Neon API (production pooler)."
  );
} else {
  console.warn(
    "NEON_API_KEY not set — update env.secret DATABASE_URL manually for production branch."
  );
}

writeFileSync(
  neonPath,
  `${JSON.stringify(
    {
      branchId: PRODUCTION_BRANCH.branchId,
      branchName: PRODUCTION_BRANCH.name,
      database: "neondb",
      orgId: ORG_ID,
      projectId: PROJECT_ID,
      projectName: PROJECT_NAME,
    },
    null,
    2
  )}\n`,
  "utf8"
);

console.log(`Local env → Neon production (${PRODUCTION_BRANCH.branchId})`);
console.log("Next: npm run env:compose && npm run dev");
