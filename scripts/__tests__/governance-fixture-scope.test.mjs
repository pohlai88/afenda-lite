/**
 * Self-scan invariant for governance gates (GOV-REG-2).
 *
 *   A registered gate's production scan must never report its own registered
 *   negative fixture as a repository violation.
 *
 * Four gates violated this for as long as they had fixtures: each carried a
 * hand-written self-exclusion that went stale when fixtures moved into
 * `scripts/__tests__/`, so they rediscovered their own deliberately-invalid
 * files as real findings. Nobody noticed because the gates were scattered
 * inline CI steps rather than one dispatcher summary.
 *
 * The invariant is derived from the registry, so it automatically covers every
 * gate added later — including ones whose authors never read this file.
 */

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { GOVERNANCE_GATES } from "../lib/governance-gates.mjs";
import {
	classifyPath,
	governanceFixturePaths,
	isGovernanceFixture,
} from "../lib/repository-walk.mjs";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../..",
);

describe("governance fixture scope", () => {
	it("treats every registered negative fixture as a fixture", () => {
		for (const gate of GOVERNANCE_GATES) {
			expect(isGovernanceFixture(gate.negativeFixture), gate.id).toBe(true);
			expect(classifyPath(gate.negativeFixture), gate.id).toBe(
				"governance-fixture",
			);
		}
	});

	it("does not exempt ordinary test source", () => {
		// The blind spot this fix deliberately avoids: a test can establish a
		// forbidden dependency or reach into another package's internals, so
		// non-fixture test files must stay governed.
		const ordinaryTest = "packages/erp/sales/__tests__/sales.contract.test.ts";
		expect(isGovernanceFixture(ordinaryTest)).toBe(false);
		expect(classifyPath(ordinaryTest)).toBe("test-source");
	});

	it("never reports a registered fixture as a repository violation", () => {
		// One dispatcher run covers every registered gate. Failing gates are
		// expected here (the repository has genuine violations); what must not
		// appear is any finding pointing at a registered fixture.
		let output = "";
		try {
			output = execFileSync(
				process.execPath,
				[
					path.join(repoRoot, "scripts/check-governance.mjs"),
					"--tier",
					"ci-required",
				],
				{ cwd: repoRoot, encoding: "utf8", stdio: "pipe" },
			);
		} catch (error) {
			output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
		}

		const offending = governanceFixturePaths().filter((fixture) =>
			output.includes(`- ${fixture}`),
		);

		expect(
			offending,
			"gates must not scan their own negative fixtures",
		).toEqual([]);
	}, 600_000);
});
