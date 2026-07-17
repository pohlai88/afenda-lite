/**
 * N12 — presence-only audit of GitHub Actions secrets and variables.
 *
 * Usage: pnpm audit:github-actions-secrets
 *
 * Lists names via `gh secret list` / `gh variable list` (repo + production env).
 * Never prints secret values. Drops injected GITHUB_TOKEN so keyring `gh` is used
 * (AGENTS.md). Does not restore Collapse-era sync scripts.
 */

import { spawnSync } from "node:child_process";

import {
	evaluateGithubActionsSecretsAudit,
	parseGhNameListJson,
	REQUIRED_ACTIONS_SECRETS,
	REQUIRED_ACTIONS_VARS,
	sanitizeAuditOutput,
} from "./lib/github-actions-secrets-audit.mjs";

/**
 * @returns {NodeJS.ProcessEnv}
 */
function ghEnv() {
	const env = { ...process.env };
	delete env.GITHUB_TOKEN;
	delete env.GH_TOKEN;
	return env;
}

/**
 * @param {string[]} args
 * @returns {string[]}
 */
function runGhJsonNames(args) {
	const result = spawnSync("gh", args, {
		encoding: "utf8",
		env: ghEnv(),
		shell: false,
	});
	if (result.error) {
		throw new Error(`gh failed to start: ${result.error.message}`);
	}
	if (result.status !== 0) {
		const err = sanitizeAuditOutput(
			(result.stderr || result.stdout || `gh exit ${result.status}`).trim(),
		);
		throw new Error(`gh ${args.join(" ")} failed: ${err}`);
	}
	return parseGhNameListJson(result.stdout || "[]");
}

function collectSecretNames() {
	const repo = runGhJsonNames(["secret", "list", "--json", "name"]);
	let envNames = [];
	try {
		envNames = runGhJsonNames([
			"secret",
			"list",
			"--env",
			"production",
			"--json",
			"name",
		]);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(
			`[warn] production environment secrets unavailable: ${sanitizeAuditOutput(message)}`,
		);
	}
	return [...new Set([...repo, ...envNames])];
}

function collectVarNames() {
	const repo = runGhJsonNames(["variable", "list", "--json", "name"]);
	let envNames = [];
	try {
		envNames = runGhJsonNames([
			"variable",
			"list",
			"--env",
			"production",
			"--json",
			"name",
		]);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(
			`[warn] production environment variables unavailable: ${sanitizeAuditOutput(message)}`,
		);
	}
	return [...new Set([...repo, ...envNames])];
}

function main() {
	console.log("=== GitHub Actions secrets audit (presence only) ===\n");
	console.log(`Required secrets: ${REQUIRED_ACTIONS_SECRETS.join(", ")}`);
	console.log(`Required vars: ${REQUIRED_ACTIONS_VARS.join(", ")}\n`);

	const secretNames = collectSecretNames();
	const varNames = collectVarNames();
	const result = evaluateGithubActionsSecretsAudit({
		secretNames,
		varNames,
	});

	console.log(`Secrets present (names only): ${secretNames.length}`);
	console.log(`Vars present (names only): ${varNames.length}`);

	if (!result.ok) {
		if (result.missingSecrets.length > 0) {
			console.error(
				`[fail] missing secrets: ${result.missingSecrets.join(", ")}`,
			);
		}
		if (result.missingVars.length > 0) {
			console.error(`[fail] missing vars: ${result.missingVars.join(", ")}`);
		}
		console.error(
			"\nResult: FAIL — set missing names in GitHub Actions (no values logged here).",
		);
		process.exit(1);
	}

	console.log(
		"\nResult: PASS — all required secret and variable names present.",
	);
	process.exit(0);
}

main();
