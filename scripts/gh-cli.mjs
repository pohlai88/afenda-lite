/**
 * GitHub CLI wrapper — runs `gh` without GITHUB_TOKEN in the environment.
 *
 * Cursor and some shells inject a fine-grained GITHUB_TOKEN that overrides
 * `gh auth login` keyring credentials. That PAT often lacks issues/PR write
 * scope and returns HTTP 403 on `gh issue comment`, `gh pr create`, etc.
 *
 * Usage: npm run gh -- issue close 1 --reason completed
 *        npm run gh -- pr create --base main --head my-branch
 */
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: npm run gh -- <gh subcommand> [...]");
  console.error("");
  console.error("Runs gh with GITHUB_TOKEN unset so keyring auth (repo scope) is used.");
  console.error("Verify: npm run gh -- auth status");
  process.exit(1);
}

const env = { ...process.env };
delete env.GITHUB_TOKEN;

const result = spawnSync("gh", args, {
  stdio: "inherit",
  shell: process.platform === "win32",
  env,
});

process.exit(result.status ?? 1);
