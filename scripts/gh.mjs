/**
 * Thin `gh` forwarder that drops injected GITHUB_TOKEN / GH_TOKEN so keyring
 * auth is used (AGENTS.md). Does not restore Collapse-era ops ladders.
 *
 * Usage: pnpm gh -- <gh args…>
 */

import { spawnSync } from "node:child_process";

const env = { ...process.env };
delete env.GITHUB_TOKEN;
delete env.GH_TOKEN;

const args = process.argv.slice(2);
const result = spawnSync("gh", args, {
	stdio: "inherit",
	env,
	shell: false,
});

if (result.error) {
	console.error(`gh failed to start: ${result.error.message}`);
	process.exit(1);
}

process.exit(result.status ?? 1);
