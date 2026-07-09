#!/usr/bin/env node
/**
 * SPEC-B local bootstrap — diagnose → auto-repair → verify → migrate/seed/dev.
 *
 * Prefer named npm scripts (Windows npm may drop `--` flags):
 *   npm run bootstrap:spec-b           # repair + migrate
 *   npm run bootstrap:spec-b:repair    # diagnose + fix drift only
 *   npm run bootstrap:spec-b:check     # report only (no writes)
 *   npm run bootstrap:spec-b:seed      # repair + migrate + seed
 *   npm run bootstrap:spec-b:pre-push  # repair + verify (git pre-push)
 *   npm run dev:spec-b                 # repair + migrate + seed + next dev
 *   npm run hooks:install              # install local git pre-push hook
 *
 * See: docs/runbooks/spec-b-local-preview-env.md
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnvFile } from "./lib/env-files.mjs";

const DEV_BRANCH = {
  name: "dev-spec-b",
  branchId: "br-super-hill-aojc9a4p",
  authHostFragment: "ep-curly-sky-aojpc61y",
};

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check-only");
const repairOnly = args.has("--repair");
const prePush = args.has("--pre-push");
const withSeed = args.has("--seed");
const withDev = args.has("--dev");
const skipValidate = args.has("--skip-validate");
const noRepair = args.has("--no-repair");

const root = process.cwd();
let step = 0;

function header(title) {
  step += 1;
  console.log(`\n[${step}] ${title}`);
}

function run(label, command, commandArgs = [], { optional = false } = {}) {
  header(label);
  console.log(`$ ${command} ${commandArgs.join(" ")}`.trim());
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    // Prefer file-based env over stale shell exports (e.g. old NEON_BRANCH_ID).
    env: { ...process.env, NEON_BRANCH_ID: undefined },
  });
  if (result.status !== 0) {
    if (optional) {
      console.warn(`Optional step failed (exit ${result.status}) — continuing.`);
      return false;
    }
    console.error(`\nBootstrap stopped: ${label} failed (exit ${result.status}).`);
    process.exit(result.status ?? 1);
  }
  return true;
}

/**
 * @returns {{ ok: boolean, issues: string[], details: string[] }}
 */
function diagnose() {
  const issues = [];
  const details = [];
  const configPath = resolve(root, "env.config");
  const secretPath = resolve(root, "env.secret");
  const neonPath = resolve(root, ".neon");
  const envPath = resolve(root, ".env");

  if (!existsSync(configPath)) issues.push("missing env.config (copy from env.config.example)");
  if (!existsSync(secretPath)) issues.push("missing env.secret (copy from env.secret.example)");
  if (!existsSync(neonPath)) issues.push("missing .neon (will rewrite for dev-spec-b)");
  if (!existsSync(envPath)) issues.push("missing .env (needs env:compose)");

  if (issues.some((i) => i.startsWith("missing env."))) {
    return { ok: false, issues, details };
  }

  const config = parseEnvFile("env.config");
  const secret = parseEnvFile("env.secret");
  const composed = existsSync(envPath) ? parseEnvFile(".env") : {};

  let neon = null;
  if (existsSync(neonPath)) {
    try {
      neon = JSON.parse(readFileSync(neonPath, "utf8"));
    } catch {
      issues.push(".neon is not valid JSON");
    }
  }

  if (config.NEON_BRANCH_ID !== DEV_BRANCH.branchId) {
    issues.push(
      `NEON_BRANCH_ID is "${config.NEON_BRANCH_ID || "(empty)"}" (want ${DEV_BRANCH.branchId})`,
    );
  }
  if (!String(config.NEON_AUTH_BASE_URL || "").includes(DEV_BRANCH.authHostFragment)) {
    issues.push("NEON_AUTH_BASE_URL does not point at dev-spec-b auth host");
  }
  if (config.GUARDIAN_AUTH_SHELL !== "true") {
    issues.push(
      `GUARDIAN_AUTH_SHELL is "${config.GUARDIAN_AUTH_SHELL || "(empty)"}" in env.config (want true)`,
    );
  }
  if (!secret.DATABASE_URL && !composed.DATABASE_URL) {
    issues.push("DATABASE_URL is missing (needs NEON_API_KEY or manual pooler URI)");
  }
  if (neon && neon.branchId !== DEV_BRANCH.branchId) {
    issues.push(`.neon branchId is "${neon.branchId}" (want ${DEV_BRANCH.branchId})`);
  }
  if (neon && neon.branchName !== DEV_BRANCH.name) {
    issues.push(`.neon branchName is "${neon.branchName}" (want ${DEV_BRANCH.name})`);
  }
  if (
    existsSync(envPath) &&
    (composed.NEON_BRANCH_ID !== DEV_BRANCH.branchId ||
      composed.GUARDIAN_AUTH_SHELL !== "true" ||
      !String(composed.NEON_AUTH_BASE_URL || "").includes(DEV_BRANCH.authHostFragment))
  ) {
    issues.push(".env is stale vs env.config — needs env:compose");
  }

  const appUrl = composed.APP_URL || config.APP_URL || "";
  if (appUrl && !appUrl.includes("iam-check.vercel.app")) {
    details.push(`Note: APP_URL is "${appUrl}" (expected iam-check.vercel.app for invite links)`);
  }

  return { ok: issues.length === 0, issues, details };
}

function printDiagnosis(result, title = "Diagnose local SPEC-B env") {
  header(title);
  for (const detail of result.details) {
    console.log(`· ${detail}`);
  }
  if (result.ok) {
    console.log("✓ No drift — env points at dev-spec-b with Guardian shell on");
    return;
  }
  console.log(`✗ ${result.issues.length} issue(s):`);
  for (const issue of result.issues) {
    console.log(`  - ${issue}`);
  }
}

function repair() {
  run("Auto-repair: apply env → Neon branch dev-spec-b", "node", [
    "scripts/apply-local-dev-spec-b-env.mjs",
  ]);
  run("Auto-repair: compose .env", "npm", ["run", "env:compose"]);
}

function verifyOrExit(result) {
  if (result.ok) {
    console.log("\nLocal SPEC-B env looks correct.");
    console.log("Sign-in: http://localhost:3000/auth/sign-in");
    return;
  }
  printDiagnosis(result, "Verify after repair");
  console.error("\nAuto-repair could not fix all issues.");
  console.error("Check NEON_API_KEY in env.secret, then: npm run bootstrap:spec-b:repair");
  process.exit(1);
}

function printNextSteps() {
  console.log(`
────────────────────────────────────────
SPEC-B local bootstrap complete

  Dev server:  npm run dev
  One-shot:    npm run dev:spec-b
  Repair only: npm run bootstrap:spec-b:repair
  Pre-push:    npm run hooks:install  (then git push runs repair+verify)

  Sign-in:     http://localhost:3000/auth/sign-in
  Guidelines:  docs/runbooks/spec-b-local-preview-env.md
────────────────────────────────────────
`);
}

// ── modes ──────────────────────────────────────────────────────────

if (checkOnly) {
  const result = diagnose();
  printDiagnosis(result);
  process.exit(result.ok ? 0 : 1);
}

// pre-push / repair / full bootstrap: diagnose first, repair if needed
{
  let result = diagnose();
  printDiagnosis(result);

  const shouldRepair = !noRepair && (!result.ok || repairOnly || prePush || !checkOnly);
  // Always re-apply on full bootstrap so DATABASE_URL stays fresh; on pre-push/repair only when drifted
  const forceApply = !prePush && !repairOnly && !noRepair;

  if (!result.ok && noRepair) {
    console.error("\nDrift detected and --no-repair set. Run: npm run bootstrap:spec-b:repair");
    process.exit(1);
  }

  if ((!result.ok && shouldRepair) || forceApply) {
    if (result.ok && forceApply) {
      console.log("\nRefreshing env (full bootstrap always re-applies pooler URL)…");
    } else {
      console.log("\nAuto-repairing drift…");
    }
    repair();
    result = diagnose();
    verifyOrExit(result);
  } else if (result.ok) {
    console.log("\nNo repair needed.");
  }

  if (repairOnly || prePush) {
    if (!skipValidate) {
      run("Validate Neon env alignment", "npm", ["run", "validate:neon-env"], {
        optional: true,
      });
    }
    if (prePush) {
      console.log("\n✓ Pre-push bootstrap OK — proceeding with git push");
    } else {
      printNextSteps();
    }
    process.exit(0);
  }
}

if (!skipValidate) {
  run("Validate Neon env alignment", "npm", ["run", "validate:neon-env"], {
    optional: true,
  });
}

run("Apply database migrations (dev-spec-b)", "npm", ["run", "db:migrate"]);

if (withSeed) {
  run("Seed shared admin", "npm", ["run", "seed:admin"]);
  run("Seed preview client", "npm", ["run", "seed:preview-client"]);
} else {
  console.log(
    "\n(Skipping seeds — run npm run bootstrap:spec-b:seed if sign-in credentials are missing)",
  );
}

if (withDev) {
  printNextSteps();
  run("Start Next.js dev server", "npm", ["run", "dev"]);
} else {
  printNextSteps();
}
