import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
	runUiSystemGate,
	UI_GOVERNANCE_SUITES,
	UI_SYSTEM_GATE_PHASES,
} from "./check-ui-system.mjs";

const repositoryRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const expectedGovernanceSuites = [
	"compose-redflags",
	"compose-suitability",
	"compose-gate-ids",
	"ui-boundary",
];
const failingPhasePattern = /\[check:ui-system\] first failed with exit code 7/;

test("the canonical UI gate owns the complete governance suite", () => {
	assert.deepEqual(UI_GOVERNANCE_SUITES, expectedGovernanceSuites);

	const governancePhase = UI_SYSTEM_GATE_PHASES.find(
		(phase) => phase.id === "web-ui-governance",
	);
	assert.ok(governancePhase, "missing web-ui-governance phase");
	for (const suite of expectedGovernanceSuites) {
		assert.equal(
			governancePhase.args.filter((argument) => argument === suite).length,
			1,
			`${suite} must be executed exactly once`,
		);
	}
});

test("package and CI consume the canonical gate without reconstructing it", () => {
	const packageJson = JSON.parse(
		readFileSync(path.join(repositoryRoot, "package.json"), "utf8"),
	);
	assert.equal(
		packageJson.scripts?.["check:ui-system"],
		"node scripts/check-ui-system.mjs",
	);

	const workflow = readFileSync(
		path.join(repositoryRoot, ".github", "workflows", "ci.yml"),
		"utf8",
	);
	assert.equal(
		workflow.match(/^\s*run:\s*pnpm check:ui-system\s*$/gm)?.length ?? 0,
		1,
		"CI must call the canonical check:ui-system command exactly once",
	);
	for (const suite of expectedGovernanceSuites) {
		assert.equal(
			workflow.includes(suite),
			false,
			`CI must not reconstruct the gate with ${suite}`,
		);
	}
});

test("the canonical gate fails fast and identifies the failing phase", () => {
	let spawnCount = 0;
	const phases = [
		{ id: "first", label: "First", command: "first", args: [] },
		{ id: "second", label: "Second", command: "second", args: [] },
	];

	assert.throws(
		() =>
			runUiSystemGate({
				phases,
				spawn: () => {
					spawnCount += 1;
					return { error: undefined, signal: null, status: 7 };
				},
				output: { log: () => undefined },
			}),
		failingPhasePattern,
	);
	assert.equal(spawnCount, 1, "later phases must not run after a failure");
});
