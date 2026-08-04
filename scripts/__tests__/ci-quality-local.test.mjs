import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";
import {
	CI_QUALITY_LOCAL_STEPS,
	CI_QUALITY_WORKFLOW_RELATIVE,
	CI_QUALITY_WORKFLOW_SKIPPED_RUNS,
	extractQualityJobRunCommands,
	normalizeRunCommand,
	resolveCiQualityRepoRoot,
	verifyQualityLocalAgainstWorkflow,
} from "../lib/ci-quality-local.mjs";

describe("ci-quality-local workflow mirror", () => {
	it("keeps local quality steps in parity with ci.yml job quality", () => {
		const problems = verifyQualityLocalAgainstWorkflow();
		assert.deepEqual(problems, []);
	});

	it("extracts every quality run including the DATABASE_URL fail-closed probe", () => {
		const source = readFileSync(
			path.join(resolveCiQualityRepoRoot(), CI_QUALITY_WORKFLOW_RELATIVE),
			"utf8",
		);
		const runs = extractQualityJobRunCommands(source).map(normalizeRunCommand);
		assert.equal(runs.length, CI_QUALITY_LOCAL_STEPS.length + CI_QUALITY_WORKFLOW_SKIPPED_RUNS.length);
		assert.ok(
			runs.some((run) => run.includes('DATABASE_URL') && run.includes("exit 1")),
		);
		assert.ok(runs.includes(normalizeRunCommand("pnpm install --frozen-lockfile")));
		assert.ok(
			runs.includes(normalizeRunCommand("pnpm --filter @afenda/db db:check")),
		);
	});

	it("uses unique step ids", () => {
		const ids = CI_QUALITY_LOCAL_STEPS.map((step) => step.id);
		assert.equal(new Set(ids).size, ids.length);
	});
});
