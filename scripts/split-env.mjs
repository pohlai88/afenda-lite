/**
 * Split an existing .env into env.config + env.secret (one-time migration).
 * Usage: npm run env:split
 */
import { splitEnv, ENV_CONFIG_PATH, ENV_SECRET_PATH } from "./lib/env-files.mjs";

const { configCount, secretCount } = splitEnv();

console.log(`Split .env → ${ENV_CONFIG_PATH} (${configCount} keys)`);
console.log(`Split .env → ${ENV_SECRET_PATH} (${secretCount} keys)`);
console.log("Run npm run env:compose to regenerate .env from the split files.");
