/**
 * Negative fixtures for package protection (ENV-GOV-1 slice A).
 *
 * Two distinct properties are proven here:
 *
 *   1. The digest actually fires. A protected package whose content changed
 *      must fail `protect:check`. Without this, the digest is an unverified
 *      claim — a check that never fails is indistinguishable from one that
 *      cannot fail.
 *   2. CI enforces but cannot forge. The `quality` job must run `protect:check`
 *      and must never run `protect:update` or hold the edit token, otherwise
 *      the pipeline could silently rewrite the evidence it is meant to verify.
 */

import { execFileSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../..",
);
const protectionScripts = path.join(
	repoRoot,
	".cursor/skills/afenda-package-protection/scripts",
);

/** Fixture packages must live inside the repository — `resolvePackageRoot` rejects outside paths. */
const fixtureParent = path.join(
	repoRoot,
	"node_modules/.cache/protect-fixtures",
);

const FIXTURE_PACKAGE_NAME = "@afenda/protect-fixture";
const PROTECTED_SOURCE = `/**
 * ${FIXTURE_PACKAGE_NAME}
 * Contract: FIXTURE
 * Protected: changes require local pre-edit token and compatibility checks.
 */

export const answer = 41;
`;

function runProtectionScript(script, packageRoot) {
	try {
		const stdout = execFileSync(
			process.execPath,
			[path.join(protectionScripts, script), packageRoot],
			{ cwd: repoRoot, encoding: "utf8", stdio: "pipe" },
		);
		return { ok: true, output: stdout };
	} catch (error) {
		return {
			ok: false,
			output: `${error.stdout ?? ""}${error.stderr ?? ""}` || String(error),
		};
	}
}

function createFixturePackage() {
	mkdirSync(fixtureParent, { recursive: true });
	const packageRoot = mkdtempSync(path.join(fixtureParent, "pkg-"));
	mkdirSync(path.join(packageRoot, "src"), { recursive: true });
	writeFileSync(
		path.join(packageRoot, "package.json"),
		`${JSON.stringify({ name: FIXTURE_PACKAGE_NAME, version: "0.0.0" }, null, 2)}\n`,
	);
	writeFileSync(path.join(packageRoot, "src/answer.ts"), PROTECTED_SOURCE);
	return packageRoot;
}

describe("package protection digest", () => {
	it("passes when content matches, fails after content changes", () => {
		const packageRoot = createFixturePackage();
		try {
			const updated = runProtectionScript(
				"protect-package-update.mjs",
				packageRoot,
			);
			expect(updated.ok).toBe(true);

			const clean = runProtectionScript(
				"protect-package-check.mjs",
				packageRoot,
			);
			expect(clean.ok).toBe(true);
			expect(clean.output).toContain("protection hash is current");

			// Mutate a protected source file without refreshing the digest.
			writeFileSync(
				path.join(packageRoot, "src/answer.ts"),
				PROTECTED_SOURCE.replace("41", "42"),
			);

			const mutated = runProtectionScript(
				"protect-package-check.mjs",
				packageRoot,
			);
			expect(mutated.ok).toBe(false);
			expect(mutated.output).toContain("protection hash is stale");
		} finally {
			rmSync(packageRoot, { recursive: true, force: true });
		}
	});

	it("fails when a protected source file loses its header", () => {
		const packageRoot = createFixturePackage();
		try {
			expect(
				runProtectionScript("protect-package-update.mjs", packageRoot).ok,
			).toBe(true);

			writeFileSync(
				path.join(packageRoot, "src/answer.ts"),
				"export const answer = 41;\n",
			);

			const stripped = runProtectionScript(
				"protect-package-check.mjs",
				packageRoot,
			);
			expect(stripped.ok).toBe(false);
			expect(stripped.output).toContain("without the required header");
		} finally {
			rmSync(packageRoot, { recursive: true, force: true });
		}
	});
});

describe("CI enforces protection without being able to forge it", async () => {
	// Parse the workflow rather than text-matching it: a comment explaining the
	// rule must not be mistaken for a step that violates it. Only executed
	// commands and injected environment count.
	const { parse } = await import("yaml");
	const workflow = parse(
		readFileSync(path.join(repoRoot, ".github/workflows/ci.yml"), "utf8"),
	);

	const jobs = Object.values(workflow.jobs ?? {});
	const runCommands = jobs.flatMap((job) =>
		(job.steps ?? []).map((step) => step.run ?? ""),
	);
	const injectedEnvKeys = [
		...Object.keys(workflow.env ?? {}),
		...jobs.flatMap((job) => [
			...Object.keys(job.env ?? {}),
			...(job.steps ?? []).flatMap((step) => Object.keys(step.env ?? {})),
		]),
	];

	it("enforces the digest through the governance registry", async () => {
		// Since GOV-REG-1 the digest is not an inline CI step: it is a registered
		// ci-required gate that the dispatcher runs. Assert the enforcement path
		// that actually exists, not the one that used to.
		const { GOVERNANCE_GATES } = await import("../lib/governance-gates.mjs");
		const gate = GOVERNANCE_GATES.find((entry) => entry.id === "protected-files");

		expect(gate, "protected-files gate must be registered").toBeDefined();
		expect(gate.tier).toBe("ci-required");
		expect(gate.command).toContain("protect:check");

		const qualitySteps = (workflow.jobs.quality.steps ?? []).map(
			(step) => step.run ?? "",
		);
		expect(
			qualitySteps.some((run) => run.includes("check:governance")),
			"quality job must dispatch registered governance gates",
		).toBe(true);
	});

	it("never runs protect:update", () => {
		const offending = runCommands.filter((run) =>
			run.includes("protect:update"),
		);
		expect(offending).toEqual([]);
	});

	it("never supplies the pre-edit token", () => {
		expect(injectedEnvKeys).not.toContain("AFENDA_PROTECTED_EDIT_TOKEN");
	});
});
