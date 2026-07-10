#!/usr/bin/env node
/**
 * Idempotent CI baseline — migrate, admin, sandbox fixtures on production branch.
 *
 * Usage: npm run seed:ci-baseline
 */
import { spawnSync } from "node:child_process";

function run(label, command, args = []) {
  console.log(`\n[ci-baseline] ${label}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    console.error(`[ci-baseline] failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}

run("migrate", "npm", ["run", "db:migrate"]);
run("admin", "npm", ["run", "seed:admin"]);
run("sandbox fixtures", "node", ["scripts/seed-production.mjs"]);

console.log("\n[ci-baseline] OK");
