#!/usr/bin/env node
/**
 * Local operator mirror of CI job `quality` (`.github/workflows/ci.yml`).
 *
 * Not a second CI authority — GitHub Actions `quality` remains the seal when
 * billing unlocks. Use this for honest local evidence while runners are locked.
 *
 * Usage:
 *   pnpm ci:quality:local --list
 *   pnpm ci:quality:local --verify-workflow
 *   pnpm ci:quality:local
 *   pnpm ci:quality:local --only db-check,governance
 *   pnpm ci:quality:local --from typecheck-test
 *
 * Prerequisites: `pnpm install --frozen-lockfile` already done.
 * Env: loads DATABASE_URL from `.env.local` (prefer file over shell). Sets
 * CI=true, REQUIRE_DATABASE_TESTS=1, AFENDA_ALLOW_BROAD_VERIFY=1 for children.
 */

import { spawnSync } from "node:child_process";
import { getEnvValue, loadLocalEnv } from "./lib/env-files.mjs";
import {
	CI_QUALITY_LOCAL_STEPS,
	CI_QUALITY_WORKFLOW_RELATIVE,
	resolveCiQualityRepoRoot,
	verifyQualityLocalAgainstWorkflow,
} from "./lib/ci-quality-local.mjs";

const repoRoot = resolveCiQualityRepoRoot();

function argValue(flag) {
	const index = process.argv.indexOf(flag);
	return index === -1 ? undefined : process.argv[index + 1];
}

function hasFlag(flag) {
	return process.argv.includes(flag);
}

function selectSteps() {
	const only = argValue("--only");
	if (only) {
		const ids = only.split(",").map((part) => part.trim()).filter(Boolean);
		const selected = [];
		for (const id of ids) {
			const step = CI_QUALITY_LOCAL_STEPS.find((candidate) => candidate.id === id);
			if (!step) {
				throw new Error(`unknown step id: ${id}`);
			}
			selected.push(step);
		}
		return selected;
	}

	const from = argValue("--from");
	if (from) {
		const start = CI_QUALITY_LOCAL_STEPS.findIndex((step) => step.id === from);
		if (start === -1) {
			throw new Error(`unknown --from step id: ${from}`);
		}
		return CI_QUALITY_LOCAL_STEPS.slice(start);
	}

	return [...CI_QUALITY_LOCAL_STEPS];
}

function assertDatabaseUrl() {
	const fileEnv = loadLocalEnv();
	const databaseUrl = getEnvValue("DATABASE_URL", fileEnv);
	if (!databaseUrl) {
		console.error(
			"ci:quality:local FAIL — DATABASE_URL missing (set in .env.local). Owner: Platform. Skip is not PASS.",
		);
		process.exit(1);
	}
	process.env.DATABASE_URL = databaseUrl;
}

function prepareChildEnv() {
	const fileEnv = loadLocalEnv();
	const databaseUrl = getEnvValue("DATABASE_URL", fileEnv);
	return {
		...process.env,
		DATABASE_URL: databaseUrl ?? process.env.DATABASE_URL,
		CI: "true",
		REQUIRE_DATABASE_TESTS: "1",
		AFENDA_ALLOW_BROAD_VERIFY: "1",
	};
}

function runStep(step, env) {
	const started = Date.now();
	console.log(`\n=== ${step.name} (${step.id}) ===`);
	console.log(`$ ${step.command}`);
	const result = spawnSync(step.command, {
		cwd: repoRoot,
		env,
		shell: true,
		stdio: "inherit",
	});
	const durationMs = Date.now() - started;
	const ok = result.status === 0;
	console.log(
		`${ok ? "PASS" : "FAIL"}  ${step.id}  ${(durationMs / 1000).toFixed(1)}s`,
	);
	return { step, ok, durationMs, status: result.status ?? 1 };
}

function main() {
	if (hasFlag("--list")) {
		console.log(
			`Local mirror of ${CI_QUALITY_WORKFLOW_RELATIVE} job "quality" (verification steps only)\n`,
		);
		for (const step of CI_QUALITY_LOCAL_STEPS) {
			console.log(`${step.id.padEnd(22)} ${step.command}`);
		}
		console.log(
			"\nNot a GitHub replacement. Remote quality remains the seal when Actions runners start.",
		);
		return;
	}

	if (hasFlag("--verify-workflow")) {
		const problems = verifyQualityLocalAgainstWorkflow();
		if (problems.length > 0) {
			console.error("ci:quality:local --verify-workflow FAIL");
			for (const problem of problems) {
				console.error(`  - ${problem}`);
			}
			process.exit(1);
		}
		console.log(
			`ci:quality:local --verify-workflow PASS (${CI_QUALITY_LOCAL_STEPS.length} step(s) ↔ ${CI_QUALITY_WORKFLOW_RELATIVE} quality job)`,
		);
		return;
	}

	const drift = verifyQualityLocalAgainstWorkflow();
	if (drift.length > 0) {
		console.error("ci:quality:local FAIL — workflow drift (fix before running):");
		for (const problem of drift) {
			console.error(`  - ${problem}`);
		}
		process.exit(1);
	}

	assertDatabaseUrl();
	const steps = selectSteps();
	const env = prepareChildEnv();

	console.log("=== ci:quality:local (mirror of Actions job quality) ===");
	console.log(`repo: ${repoRoot}`);
	console.log(`steps: ${steps.map((step) => step.id).join(", ")}`);
	console.log(
		"Continue-on-fail: yes (reports every step, like CI !cancelled gates).",
	);
	console.log(
		"Authority: GitHub Actions quality remains the seal — this is local evidence only.\n",
	);

	const results = steps.map((step) => runStep(step, env));
	const failed = results.filter((result) => !result.ok);

	console.log("\n=== summary ===");
	for (const result of results) {
		console.log(
			`${result.ok ? "PASS" : "FAIL"}  ${result.step.id.padEnd(22)} ${(result.durationMs / 1000).toFixed(1)}s`,
		);
	}
	console.log(
		`\n${results.length - failed.length} passed, ${failed.length} failed`,
	);

	if (failed.length > 0) {
		process.exit(1);
	}
}

try {
	main();
} catch (error) {
	console.error(
		`ci:quality:local FAIL: ${error instanceof Error ? error.message : String(error)}`,
	);
	process.exit(1);
}
