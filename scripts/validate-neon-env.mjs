/**
 * Validate Neon env composition and API access for iam-check.
 *
 * Usage: npm run validate:neon-env
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { loadComposedEnv, getEnvValue } from "./lib/env-files.mjs";

const env = loadComposedEnv();
const apiKey = getEnvValue("NEON_API_KEY", env);
const orgId = getEnvValue("NEON_ORG_ID", env);
const projectId = getEnvValue("NEON_PROJECT_ID", env);
const branchId = getEnvValue("NEON_BRANCH_ID", env);

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

record(
  check(
    "env.config composition",
    orgId === "org-royal-bar-40022480" &&
      projectId === "young-hat-54755363" &&
      branchId === "br-tiny-hill-ao82jp6f",
    `org=${orgId}, project=${projectId}, branch=${branchId}`,
  ),
);

record(
  check(
    ".neon linkage",
    neonFile.orgId === orgId &&
      neonFile.projectId === projectId &&
      neonFile.branchId === branchId,
    `.neon matches env.config`,
  ),
);

record(
  check(
    "NEON_API_KEY present",
    Boolean(apiKey?.startsWith("napi_")),
    apiKey ? `key prefix ${apiKey.slice(0, 14)}…` : "missing in env.secret",
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
