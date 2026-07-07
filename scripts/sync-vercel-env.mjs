/**
 * Push canonical production env keys to Vercel from env.config + env.secret.
 * Playground and local-tooling keys are excluded. Does NOT use vercel env pull.
 *
 * Usage: npm run sync:vercel
 */
import { spawnSync } from "node:child_process";
import {
  composeEnv,
  getEnvValue,
  LOCAL_ONLY_KEYS,
  VERCEL_PRODUCTION_KEYS,
} from "./lib/env-files.mjs";
import { setVercelEnvKey } from "./lib/vercel-env.mjs";

const target = process.argv[2] ?? "production";
const env = composeEnv({ write: true });

function main() {
  console.log(`Syncing ${VERCEL_PRODUCTION_KEYS.length} keys to Vercel (${target})…`);
  console.log(`Excluded local-only keys: ${[...LOCAL_ONLY_KEYS].join(", ")}\n`);

  for (const key of VERCEL_PRODUCTION_KEYS) {
    if (LOCAL_ONLY_KEYS.has(key)) {
      console.warn(`Skipping ${key} (local-only)`);
      continue;
    }

    const value = getEnvValue(key, env);
    if (!value) {
      console.warn(`Skipping ${key} (not set in env.config/env.secret)`);
      continue;
    }

    console.log(`Setting ${key}…`);
    setVercelEnvKey(key, target, value);
  }

  console.log(`\nVercel sync complete for target: ${target}`);
  console.log("Audit keys: npm run audit:vercel");
  console.log("Redeploy production after sync: vercel deploy --prod --yes");
}

main();
