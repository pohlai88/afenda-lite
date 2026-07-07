/**
 * Merge env.config + env.secret → .env for Next.js and scripts.
 * Usage: npm run env:compose
 */
import { composeEnv, ENV_COMPOSED_PATH } from "./lib/env-files.mjs";

const merged = composeEnv({ write: true });
const keyCount = Object.keys(merged).length;

console.log(`Composed ${keyCount} keys into ${ENV_COMPOSED_PATH}`);
console.log("Edit env.config (non-secrets) and env.secret (credentials), then re-run env:compose.");
