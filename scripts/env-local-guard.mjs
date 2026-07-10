/**
 * Block / quarantine `.env.local` so composed `.env` stays the local SSOT.
 *
 * Usage:
 *   node scripts/env-local-guard.mjs           # exit 1 if .env.local exists
 *   node scripts/env-local-guard.mjs --fix    # move → .env.local.vercel-backup
 *
 * Authority: AGENTS.md → Environment variables
 */
import { existsSync, readFileSync, renameSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const envLocal = resolve(root, ".env.local");
const backup = resolve(root, ".env.local.vercel-backup");
const fix = process.argv.includes("--fix");

function listKeyNames(filePath) {
  const text = readFileSync(filePath, "utf8");
  const keys = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    keys.push(trimmed.slice(0, eq).trim());
  }
  return keys;
}

if (!existsSync(envLocal)) {
  process.exit(0);
}

const keys = listKeyNames(envLocal);

if (!fix) {
  console.error("Blocked: .env.local exists and overrides composed .env.");
  console.error("");
  console.error("Key names present (values not shown):");
  for (const key of keys) {
    console.error(`  - ${key}`);
  }
  console.error("");
  console.error("Fix:");
  console.error("  npm run env:guard:fix   — move to .env.local.vercel-backup");
  console.error("  npm run env:compose      — regenerate .env from env.config + env.secret");
  console.error("");
  console.error("See AGENTS.md → Environment variables");
  process.exit(1);
}

if (existsSync(backup)) {
  unlinkSync(backup);
}
renameSync(envLocal, backup);
console.log(`Moved .env.local → .env.local.vercel-backup (${keys.length} key name(s)).`);
console.log("Local runtime uses composed .env only. Re-run npm run env:compose if needed.");
process.exit(0);
