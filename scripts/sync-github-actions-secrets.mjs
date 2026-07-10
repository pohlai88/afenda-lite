/**
 * Push CI-required secrets to GitHub Actions from composed .env (production branch).
 *
 * Usage:
 *   npm run env:compose
 *   npm run sync:github-actions-secrets
 *
 * Alias for sync:github-actions-secrets:production.
 */
import { spawnSync } from "node:child_process";

const result = spawnSync("node", ["scripts/sync-github-actions-secrets-production.mjs"], {
  stdio: "inherit",
  shell: false,
});

process.exit(result.status ?? 1);
