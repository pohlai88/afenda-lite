/**
 * Generates scripts/lib/env-manifest.generated.mjs from modules/platform/env/manifest.ts.
 *
 * Usage:
 *   npx tsx scripts/sync-env-manifest.mts          # write
 *   npx tsx scripts/sync-env-manifest.mts --check  # drift gate (CI)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  deriveCanonicalVercelKeys,
  deriveLocalOnlyKeys,
  deriveRuntimeEnvKeys,
  deriveSecretKeys,
  deriveStaleVercelKeys,
  deriveSyncOptionalKeys,
  deriveVercelProductionKeys,
} from "../modules/platform/env/manifest.ts";

const OUT_PATH = resolve("scripts/lib/env-manifest.generated.mjs");

function quoteList(values: readonly string[]) {
  return values.map((value) => JSON.stringify(value)).join(", ");
}

function generateContent() {
  const secretKeys = [...deriveSecretKeys()].sort();
  const localOnlyKeys = [...deriveLocalOnlyKeys()].sort();
  const vercelProductionKeys = deriveVercelProductionKeys();
  const canonicalVercelKeys = deriveCanonicalVercelKeys();
  const syncOptionalKeys = [...deriveSyncOptionalKeys()].sort();
  const staleVercelKeys = deriveStaleVercelKeys();
  const runtimeEnvKeys = deriveRuntimeEnvKeys();

  return `/** AUTO-GENERATED from modules/platform/env/manifest.ts — do not edit. Run: npm run env:manifest:sync */
export const SECRET_KEYS = new Set([${quoteList(secretKeys)}]);
export const LOCAL_ONLY_KEYS = new Set([${quoteList(localOnlyKeys)}]);
export const VERCEL_PRODUCTION_KEYS = [${quoteList(vercelProductionKeys)}];
export const CANONICAL_VERCEL_KEYS = [${quoteList(canonicalVercelKeys)}];
export const SYNC_OPTIONAL_KEYS = new Set([${quoteList(syncOptionalKeys)}]);
export const STALE_VERCEL_KEYS = [${quoteList(staleVercelKeys)}];
export const RUNTIME_ENV_KEYS = [${quoteList(runtimeEnvKeys)}];
`;
}

function main() {
  const content = generateContent();
  const checkOnly = process.argv.includes("--check");

  if (checkOnly) {
    const existing = readFileSync(OUT_PATH, "utf8");
    if (existing !== content) {
      console.error(
        "scripts/lib/env-manifest.generated.mjs is stale. Run: npm run env:manifest:sync",
      );
      process.exit(1);
    }
    console.log("env manifest policy OK");
    return;
  }

  writeFileSync(OUT_PATH, content, "utf8");
  console.log(`Wrote ${OUT_PATH}`);
}

main();
