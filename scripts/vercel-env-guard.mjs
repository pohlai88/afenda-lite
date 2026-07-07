/**
 * Guarded Vercel env CLI — blocks `vercel env pull` (redacted values cause agent confusion).
 * Usage: node scripts/vercel-env-guard.mjs <subcommand> [...args]
 *
 * Prefer npm scripts: sync:vercel, cleanup:vercel, audit:vercel
 */
import { spawnSync } from "node:child_process";

const [, , subcommand, ...rest] = process.argv;

const BLOCKED = new Set(["pull"]);

if (!subcommand) {
  console.error("Usage: node scripts/vercel-env-guard.mjs <ls|add|rm|update> [...]");
  console.error("Blocked: pull — see AGENTS.md → Environment variables");
  process.exit(1);
}

if (BLOCKED.has(subcommand)) {
  console.error(`Blocked: vercel env ${subcommand}`);
  console.error("");
  console.error("vercel env pull is disabled in this repo.");
  console.error("Vercel redacts secret values on pull, which misleads automated audits.");
  console.error("");
  console.error("Instead:");
  console.error("  npm run audit:vercel     — compare key names on Vercel");
  console.error("  npm run sync:vercel      — push env.config + env.secret → Vercel production");
  console.error("  npm run cleanup:vercel   — remove stale keys from Vercel");
  process.exit(1);
}

const result = spawnSync("vercel", ["env", subcommand, ...rest], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
