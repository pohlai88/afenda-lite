/**
 * Local mirror of `.github/workflows/ci.yml` job `quality` verification steps.
 *
 * This is an operator evidence ladder while Actions billing is locked — not a
 * second CI authority. Remote `quality` remains the seal once runners start.
 *
 * Commands must stay byte-identical to the workflow `run:` lines (after
 * whitespace normalize). `--verify-workflow` fails closed on drift.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../..",
);

export const CI_QUALITY_WORKFLOW_RELATIVE = ".github/workflows/ci.yml";

/**
 * Workflow `run:` bodies that local mirror deliberately does not execute.
 * Install stays a prerequisite; the DATABASE_URL bash probe is owned by the
 * runner prelude (same fail-closed contract).
 */
export const CI_QUALITY_WORKFLOW_SKIPPED_RUNS = Object.freeze([
	"pnpm install --frozen-lockfile",
	`if [ -z "$DATABASE_URL" ]; then
  echo "::error::I5.5 quality DB gate BLOCKED — set Actions secret DATABASE_URL (repo or production). Owner: Platform. Skip is not PASS."
  exit 1
fi`,
]);

/**
 * Ordered verification steps that match the `quality` job (minus checkout /
 * setup / install / artifact upload).
 *
 * @type {ReadonlyArray<{ readonly id: string, readonly name: string, readonly command: string }>}
 */
export const CI_QUALITY_LOCAL_STEPS = Object.freeze([
	{
		id: "db-check",
		name: "Database migration journal check",
		command: "pnpm --filter @afenda/db db:check",
	},
	{
		id: "tenancy-residue",
		name: "Tenancy soft-residue scan (N9 / ARCH-023 R1)",
		command: "pnpm check:tenancy-residue",
	},
	{
		id: "governance",
		name: "Repository governance",
		command: "pnpm check:governance --tier ci-required",
	},
	{
		id: "config-boundary",
		name: "Configuration capability boundary",
		command: "pnpm check:config-boundary && pnpm check:biome-governance",
	},
	{
		id: "repo-tooling",
		name: "Repo tooling and config suites (Vitest repo-tooling lane)",
		command: "pnpm test:repo-tooling",
	},
	{
		id: "biome-wave-1",
		name: "Biome adopted packages (wave 1)",
		command:
			"pnpm --filter @afenda/config --filter @afenda/env --filter @afenda/errors --filter @afenda/testing --filter @afenda/auth --filter @afenda/admin --filter @afenda/logger --filter @afenda/http --filter @afenda/cache --filter @afenda/rate-limit --filter @afenda/security --filter @afenda/metrics --filter @afenda/openapi --filter @afenda/audit --filter @afenda/db --filter @afenda/search --filter @afenda/notifications --filter @afenda/events --filter @afenda/ai-the-machine --filter @afenda/master-data --filter @afenda/sales --filter @afenda/purchasing --filter @afenda/inventory --filter @afenda/receiving --filter @afenda/fulfillment --filter @afenda/receivables --filter @afenda/payables --filter @afenda/payments --filter @afenda/accounting lint",
	},
	{
		id: "lint-ci",
		name: "Biome CI",
		command: "pnpm run lint:ci",
	},
	{
		id: "docs-app",
		name: "Docs app gate",
		command: "pnpm check:docs-app",
	},
	{
		id: "governance-packages",
		name: "Package governance (catalog · edges · sole-mutator)",
		command: "pnpm governance:packages",
	},
	{
		id: "typecheck-test",
		name: "Typecheck · unit test",
		command:
			"pnpm typecheck:root && pnpm exec turbo run typecheck test --concurrency=50%",
	},
	{
		id: "playwright-chromium",
		name: "Install Storybook Chromium",
		command: "pnpm exec playwright install --with-deps chromium",
	},
	{
		id: "storybook",
		name: "Storybook catalog · browser · visual gate",
		command: "pnpm check:storybook",
	},
	{
		id: "hr-parity",
		name: "HR Neon parity (serial)",
		command: "pnpm test:hr:parity",
	},
	{
		id: "master-data-parity",
		name: "Master-data Neon parity and integration (serial)",
		command: "pnpm test:master-data:parity",
	},
]);

/** @param {string} value */
export function normalizeRunCommand(value) {
	return value
		.replace(/\r\n/g, "\n")
		.split("\n")
		.map((line) => line.trimEnd())
		.join("\n")
		.trim()
		.replace(/[ \t]+/g, " ");
}

/**
 * Extract `run:` bodies from the `quality` job only.
 *
 * @param {string} workflowSource
 * @returns {string[]}
 */
export function extractQualityJobRunCommands(workflowSource) {
	// `m` makes `^` match line starts. End-of-string uses `(?![\s\S])` — never `$`
	// under `m`, which would truncate at the first line of the job body.
	const jobMatch = workflowSource.match(
		/^ {2}quality:\n([\s\S]*?)(?=\n {2}[A-Za-z0-9_-]+:|\n[A-Za-z]|(?![\s\S]))/m,
	);
	if (!jobMatch) {
		throw new Error(
			`ci-quality-local: could not locate job "quality" in ${CI_QUALITY_WORKFLOW_RELATIVE}`,
		);
	}

	const jobBody = jobMatch[1];
	const lines = jobBody.split(/\r?\n/);
	const runs = [];

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];
		const runMatch = line.match(/^(\s*)run:\s*(.*)$/);
		if (!runMatch) {
			continue;
		}

		const runIndent = runMatch[1].length;
		const remainder = runMatch[2].trim();

		if (remainder === "|" || remainder === ">" || remainder.startsWith("|") || remainder.startsWith(">")) {
			const blockLines = [];
			let cursor = index + 1;
			while (cursor < lines.length) {
				const blockLine = lines[cursor];
				if (blockLine.trim().length === 0) {
					blockLines.push("");
					cursor += 1;
					continue;
				}
				const leading = blockLine.match(/^(\s*)/)?.[1].length ?? 0;
				if (leading <= runIndent) {
					break;
				}
				blockLines.push(blockLine.slice(runIndent + 2));
				cursor += 1;
			}
			const text = blockLines.join("\n").trim();
			if (text.length > 0) {
				runs.push(text);
			}
			index = cursor - 1;
			continue;
		}

		if (remainder.length > 0) {
			runs.push(remainder);
		}
	}

	return runs;
}

/**
 * @param {string} [workflowSource]
 * @returns {string[]}
 */
export function verifyQualityLocalAgainstWorkflow(workflowSource) {
	const source =
		workflowSource ??
		readFileSync(path.join(repoRoot, CI_QUALITY_WORKFLOW_RELATIVE), "utf8");
	const workflowRuns = extractQualityJobRunCommands(source).map(
		normalizeRunCommand,
	);
	const skipped = new Set(
		CI_QUALITY_WORKFLOW_SKIPPED_RUNS.map(normalizeRunCommand),
	);
	const localCommands = CI_QUALITY_LOCAL_STEPS.map((step) =>
		normalizeRunCommand(step.command),
	);
	const localSet = new Set(localCommands);
	const problems = [];

	for (const step of CI_QUALITY_LOCAL_STEPS) {
		const normalized = normalizeRunCommand(step.command);
		if (!workflowRuns.includes(normalized)) {
			problems.push(
				`local step "${step.id}" command missing from workflow quality job: ${step.command}`,
			);
		}
	}

	for (const run of workflowRuns) {
		if (skipped.has(run) || localSet.has(run)) {
			continue;
		}
		problems.push(
			`workflow quality run not mirrored and not skipped: ${run}`,
		);
	}

	const localIds = CI_QUALITY_LOCAL_STEPS.map((step) => step.id);
	if (new Set(localIds).size !== localIds.length) {
		problems.push("ci-quality-local: duplicate step id");
	}

	return problems;
}

export function resolveCiQualityRepoRoot() {
	return repoRoot;
}
