/**
 * Remove obsolete Vercel env vars. Optionally re-sync canonical production keys.
 * Does NOT use vercel env pull.
 *
 * Usage:
 *   npm run cleanup:vercel              — remove stale keys from production
 *   npm run cleanup:vercel -- --sync    — remove stale keys, then sync from local
 */
import {
  composeEnv,
  getEnvValue,
  LOCAL_ONLY_KEYS,
  STALE_VERCEL_KEYS,
  VERCEL_PRODUCTION_KEYS,
} from "./lib/env-files.mjs";
import {
  listVercelEnvKeys,
  removeVercelEnvKey,
  setVercelEnvKey,
} from "./lib/vercel-env.mjs";

const target = process.argv.includes("--preview") ? "preview" : "production";
const shouldSync = process.argv.includes("--sync");
const env = composeEnv({ write: true });

function removeKey(key, environment) {
  console.log(`Removing ${key} from Vercel (${environment})…`);
  if (!removeVercelEnvKey(key, environment)) {
    console.warn(`Skip ${key} (${environment}): not present or already removed`);
  }
}

function main() {
  console.log(`\n=== Vercel cleanup: ${target} ===\n`);

  for (const key of STALE_VERCEL_KEYS) {
    removeKey(key, target);
  }

  const remote = listVercelEnvKeys(target);
  for (const key of LOCAL_ONLY_KEYS) {
    if (key.startsWith("PLAYGROUND_") && remote.has(key)) {
      removeKey(key, target);
    }
  }

  if (shouldSync) {
    console.log("\nRe-syncing canonical production keys…");
    for (const key of VERCEL_PRODUCTION_KEYS) {
      if (LOCAL_ONLY_KEYS.has(key)) continue;
      const value = getEnvValue(key, env);
      if (!value) {
        console.warn(`Skipping ${key} (not set locally)`);
        continue;
      }
      console.log(`Setting ${key}…`);
      setVercelEnvKey(key, target, value);
    }
  }

  console.log("\nVercel cleanup complete.");
  console.log("Audit: npm run audit:vercel");
}

main();
