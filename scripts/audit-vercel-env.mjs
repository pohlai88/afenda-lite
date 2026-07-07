/**
 * Audit Vercel env keys via `vercel env ls` (no pull — values are redacted on pull).
 * Usage: npm run audit:vercel
 */
import {
  LOCAL_ONLY_KEYS,
  STALE_VERCEL_KEYS,
  VERCEL_PRODUCTION_KEYS,
} from "./lib/env-files.mjs";
import { listVercelEnvKeys } from "./lib/vercel-env.mjs";

const target = process.argv[2] ?? "production";

function main() {
  const remote = listVercelEnvKeys(target);
  const expected = VERCEL_PRODUCTION_KEYS.filter((key) => !LOCAL_ONLY_KEYS.has(key));

  const missing = expected.filter((key) => !remote.has(key));
  const stale = STALE_VERCEL_KEYS.filter((key) => remote.has(key));
  const playgroundOnVercel = [...LOCAL_ONLY_KEYS].filter(
    (key) => key.startsWith("PLAYGROUND_") && remote.has(key),
  );
  const extra = [...remote].filter(
    (key) =>
      !expected.includes(key) &&
      !STALE_VERCEL_KEYS.includes(key) &&
      !key.startsWith("VERCEL_") &&
      !key.startsWith("TURBO_") &&
      key !== "NX_DAEMON",
  );

  console.log(`=== Vercel ${target} env audit (key names only) ===\n`);
  console.log(`Expected production keys: ${expected.length}`);
  console.log(`Present on Vercel: ${[...remote].filter((k) => expected.includes(k)).length}`);

  if (missing.length) {
    console.warn(`\nMissing on Vercel:\n  ${missing.join("\n  ")}`);
  } else {
    console.log("\nAll canonical production keys are present.");
  }

  if (stale.length) {
    console.warn(`\nStale keys still on Vercel (run npm run cleanup:vercel):\n  ${stale.join("\n  ")}`);
  }

  if (playgroundOnVercel.length) {
    console.warn(
      `\nPlayground keys on Vercel (remove — local dev only):\n  ${playgroundOnVercel.join("\n  ")}`,
    );
  }

  if (extra.length) {
    console.warn(`\nExtra keys (review):\n  ${extra.join("\n  ")}`);
  }

  console.log("\nNote: vercel env pull is blocked in this repo. Compare key names only.");
}

main();
