#!/usr/bin/env node
/**
 * Install repo git hooks.
 * pre-push: Neon env validation
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const hooksDir = path.join(root, ".git", "hooks");

if (!fs.existsSync(path.join(root, ".git"))) {
  console.warn("install-git-hooks: no .git — skip");
  process.exit(0);
}

fs.mkdirSync(hooksDir, { recursive: true });

const prePush = `#!/bin/sh
# Installed by: npm run hooks:install
# Runs Neon env validation before every push to GitHub.
# Skip once:  git push --no-verify
# Disable:    rm .git/hooks/pre-push

set -e
cd "$(git rev-parse --show-toplevel)"

echo "→ pre-push: npm run validate:neon-env"
npm run validate:neon-env
`;

const target = path.join(hooksDir, "pre-push");
fs.writeFileSync(target, prePush.replace(/\r\n/g, "\n"), { mode: 0o755 });
try {
  fs.chmodSync(target, 0o755);
} catch {
  // Windows may ignore mode
}

// Remove structure-lock pre-commit if present
const preCommit = path.join(hooksDir, "pre-commit");
if (fs.existsSync(preCommit)) {
  const body = fs.readFileSync(preCommit, "utf8");
  if (body.includes("check:doc-registry")) {
    fs.unlinkSync(preCommit);
    console.log("removed .git/hooks/pre-commit (doc structure lock)");
  }
}

console.log("installed .git/hooks/pre-push");
console.log("hooks:install OK");
