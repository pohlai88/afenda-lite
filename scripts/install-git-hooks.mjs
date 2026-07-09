#!/usr/bin/env node
/**
 * Install local git hooks so SPEC-B bootstrap runs before `git push`.
 *
 * Usage: npm run hooks:install
 *
 * This writes `.git/hooks/pre-push` (local only — not committed).
 * CI does not need this; GitHub Actions already injects secrets.
 */
import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = process.cwd();
const hookPath = resolve(root, ".git/hooks/pre-push");

if (!existsSync(resolve(root, ".git"))) {
  console.error("Not a git repository — skip hooks:install");
  process.exit(0);
}

mkdirSync(dirname(hookPath), { recursive: true });

const hook = `#!/bin/sh
# Installed by: npm run hooks:install
# Runs SPEC-B diagnose → auto-repair → verify before every push to GitHub.
# Skip once:  git push --no-verify
# Disable:    rm .git/hooks/pre-push

set -e
cd "$(git rev-parse --show-toplevel)"

echo "→ pre-push: npm run bootstrap:spec-b:pre-push"
npm run bootstrap:spec-b:pre-push
`;

writeFileSync(hookPath, hook, "utf8");
try {
  chmodSync(hookPath, 0o755);
} catch {
  // Windows may ignore chmod; Git for Windows still runs the hook via sh.
}

console.log(`Installed ${hookPath}`);
console.log("Every \`git push\` will run bootstrap repair+verify first.");
console.log("Skip once: git push --no-verify");
