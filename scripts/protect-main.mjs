/**
 * GUIDE-018 I5.5 — verify (default) or apply main branch protection.
 *
 * Usage:
 *   pnpm protect:main           # verify Living contract
 *   pnpm protect:main -- --apply  # PUT Living contract via gh api
 *
 * Drops injected GITHUB_TOKEN so keyring `gh` is used (AGENTS.md).
 */

import { spawnSync } from "node:child_process";

import {
	buildMainProtectionPutBody,
	evaluateMainProtection,
	REQUIRED_MAIN_STATUS_CHECKS,
} from "./lib/protect-main.mjs";

const OWNER_REPO = "pohlai88/afenda-lite";
const BRANCH = "main";

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
 * @param {{ input?: string }} [opts]
 */
function runGh(args, opts = {}) {
	const result = spawnSync("gh", args, {
		encoding: "utf8",
		env: ghEnv(),
		shell: false,
		input: opts.input,
	});
	if (result.error) {
		throw new Error(`gh failed to start: ${result.error.message}`);
	}
	if (result.status !== 0) {
		const err = (
			result.stderr ||
			result.stdout ||
			`gh exit ${result.status}`
		).trim();
		throw new Error(`gh ${args.join(" ")} failed: ${err}`);
	}
	return result.stdout || "";
}

function fetchProtection() {
	const raw = runGh([
		"api",
		`repos/${OWNER_REPO}/branches/${BRANCH}/protection`,
	]);
	return JSON.parse(raw);
}

function applyProtection() {
	const body = JSON.stringify(buildMainProtectionPutBody());
	runGh(
		[
			"api",
			"--method",
			"PUT",
			`repos/${OWNER_REPO}/branches/${BRANCH}/protection`,
			"--input",
			"-",
		],
		{ input: body },
	);
}

function printResult(result) {
	console.log(
		`Required status checks: ${REQUIRED_MAIN_STATUS_CHECKS.join(", ")}`,
	);
	console.log(
		`Observed contexts: ${result.observedContexts.join(", ") || "(none)"}`,
	);
	console.log(
		`strict=${result.strict} allow_force_pushes=${result.allowForcePushes} allow_deletions=${result.allowDeletions}`,
	);
	if (result.missingContexts.length > 0) {
		console.error(
			`[fail] missing required checks: ${result.missingContexts.join(", ")}`,
		);
	}
	if (result.staleContexts.length > 0) {
		console.error(
			`[fail] stale required checks (not in Living CI PR gate): ${result.staleContexts.join(", ")}`,
		);
	}
	if (!result.strict) {
		console.error("[fail] required_status_checks.strict must be true");
	}
	if (result.allowForcePushes) {
		console.error("[fail] allow_force_pushes must be false");
	}
	if (result.allowDeletions) {
		console.error("[fail] allow_deletions must be false");
	}
}

function main() {
	const apply = process.argv.includes("--apply");
	console.log("=== Main branch protection (I5.5) ===\n");

	if (apply) {
		console.log("Applying Living protection policy…");
		applyProtection();
	}

	const protection = fetchProtection();
	const result = evaluateMainProtection(protection);
	printResult(result);

	if (!result.ok) {
		console.error(
			"\nResult: FAIL — run `pnpm protect:main -- --apply` (admin) or fix GitHub Settings.",
		);
		process.exit(1);
	}

	console.log(
		"\nResult: PASS — main protection matches Living CI quality gate.",
	);
	process.exit(0);
}

main();
