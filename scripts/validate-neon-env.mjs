/**
 * Validate Neon env for afenda-lite against `.env.local` (ARCH-027 / N1).
 *
 * Usage: pnpm validate:neon-env
 *
 * Product contract SSOT: packages/env/src/neon-contract.ts
 * This script adds Neon Cloud API checks on top of the product contract.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { getEnvValue, loadLocalEnv } from "./lib/env-files.mjs";

const env = loadLocalEnv();
// Prefer `.env.local` over shell exports — stale NEON_BRANCH_ID must not win.
const apiKey = env.NEON_API_KEY || getEnvValue("NEON_API_KEY", env);
const orgId = env.NEON_ORG_ID || getEnvValue("NEON_ORG_ID", env);
const projectId = env.NEON_PROJECT_ID || getEnvValue("NEON_PROJECT_ID", env);
const branchId = env.NEON_BRANCH_ID || getEnvValue("NEON_BRANCH_ID", env);

const neonContractUrl = pathToFileURL(
  resolve(process.cwd(), "packages/env/src/neon-contract.ts"),
).href;
const {
  APPROVED_NEON_BRANCH_ID,
  APPROVED_NEON_ORG_ID,
  APPROVED_NEON_PROJECT_ID,
  evaluateNeonProductEnv,
  formatNeonContractIssues,
} = await import(neonContractUrl);

const neonFile = JSON.parse(readFileSync(".neon", "utf8"));

function run(args) {
  return execFileSync("npx", ["neon@latest", ...args, "-o", "json"], {
    env: { ...process.env, NEON_API_KEY: apiKey },
    encoding: "utf8",
    shell: true,
    maxBuffer: 10 * 1024 * 1024,
  });
}

function check(label, ok, detail) {
  console.log(`${ok ? "[ok]" : "[fail]"} ${label}`);
  console.log(`     ${detail}`);
  return ok;
}

let passed = 0;
let failed = 0;

function record(ok) {
  if (ok) passed += 1;
  else failed += 1;
}

console.log("=== Neon env validation ===\n");

const playgroundRaw = env.PLAYGROUND_ENABLED || getEnvValue("PLAYGROUND_ENABLED", env);
const productResult = evaluateNeonProductEnv(
  {
    DATABASE_URL: env.DATABASE_URL || getEnvValue("DATABASE_URL", env),
    NEON_AUTH_BASE_URL:
      env.NEON_AUTH_BASE_URL || getEnvValue("NEON_AUTH_BASE_URL", env),
    NEON_AUTH_COOKIE_SECRET:
      env.NEON_AUTH_COOKIE_SECRET || getEnvValue("NEON_AUTH_COOKIE_SECRET", env),
    APP_URL: env.APP_URL || getEnvValue("APP_URL", env),
    NEON_ORG_ID: orgId,
    NEON_PROJECT_ID: projectId,
    NEON_BRANCH_ID: branchId,
    SHARED_ADMIN_PASSWORD:
      env.SHARED_ADMIN_PASSWORD || getEnvValue("SHARED_ADMIN_PASSWORD", env),
    PREVIEW_CLIENT_PASSWORD:
      env.PREVIEW_CLIENT_PASSWORD || getEnvValue("PREVIEW_CLIENT_PASSWORD", env),
    CLIENT_DEFAULT_PASSWORD:
      env.CLIENT_DEFAULT_PASSWORD || getEnvValue("CLIENT_DEFAULT_PASSWORD", env),
    E2E_OPERATOR_PASSWORD:
      env.E2E_OPERATOR_PASSWORD || getEnvValue("E2E_OPERATOR_PASSWORD", env),
    E2E_CLIENT_PASSWORD:
      env.E2E_CLIENT_PASSWORD || getEnvValue("E2E_CLIENT_PASSWORD", env),
    PLAYGROUND_ENABLED:
      playgroundRaw === undefined ? undefined : playgroundRaw === "true",
  },
  {
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  },
);

record(
  check(
    "N1 product Neon contract",
    productResult.ok,
    productResult.ok
      ? "DATABASE_URL pooler · Neon Auth URL/secret · APP_URL · cloud ids · local-only gates"
      : formatNeonContractIssues(productResult.issues),
  ),
);

record(
  check(
    ".env.local Neon Cloud ids",
    orgId === APPROVED_NEON_ORG_ID &&
      projectId === APPROVED_NEON_PROJECT_ID &&
      Boolean(branchId),
    `org=${orgId}, project=${projectId}, branch=${branchId}` +
      (branchId === APPROVED_NEON_BRANCH_ID
        ? " (production — single branch policy)"
        : ` (expected production branch ${APPROVED_NEON_BRANCH_ID})`),
  ),
);

record(
  check(
    ".neon linkage",
    neonFile.orgId === orgId &&
      neonFile.projectId === projectId &&
      neonFile.branchId === branchId,
    `.neon matches .env.local`,
  ),
);

record(
  check(
    "NEON_API_KEY present",
    Boolean(apiKey?.startsWith("napi_")),
    apiKey ? "NEON_API_KEY: present" : "NEON_API_KEY: missing",
  ),
);

try {
  const branch = JSON.parse(
    run(["branches", "get", branchId, "--project-id", projectId]),
  );
  record(
    check(
      "branch API access",
      branch.id === branchId && branch.project_id === projectId,
      `${branch.name} (${branch.id}) on ${branch.project_id}`,
    ),
  );
} catch (error) {
  record(
    check(
      "branch API access",
      false,
      (error.stderr?.toString?.() ?? error.message).trim(),
    ),
  );
}

try {
  const auth = JSON.parse(
    run(["neon-auth", "status", "--project-id", projectId, "--branch", branchId]),
  );
  record(
    check(
      "neon-auth access",
      auth.branch_id === branchId,
      auth.base_url ?? "status ok",
    ),
  );
} catch (error) {
  record(
    check(
      "neon-auth access",
      false,
      (error.stderr?.toString?.() ?? error.message).trim(),
    ),
  );
}

try {
  run(["projects", "list", "--org-id", orgId]);
  record(
    check(
      "org-wide project list",
      true,
      "API key has org scope — can list all projects.",
    ),
  );
} catch (error) {
  const message = (error.stderr?.toString?.() ?? error.message).trim();
  const projectScoped = message.includes("subject_project_id");
  record(
    check(
      "org-wide project list",
      projectScoped,
      projectScoped
        ? `Project-scoped key (limited to ${projectId}) — expected; branch/auth APIs still work.`
        : message,
    ),
  );
}

console.log(`\nResult: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
