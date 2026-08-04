/**
 * Negative fixtures for the governance gate registry (GOV-REG-1).
 *
 * The registry is the authority that keeps every other gate honest, so it needs
 * the strongest proof that it fires. Validation is pure and IO is injected, so
 * each invariant can be violated deliberately here rather than only observed to
 * hold on the real repository.
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	GOVERNANCE_GATES,
	parseGateCommand,
	validateGateRegistry,
} from "../lib/governance-gates.mjs";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../..",
);

const VALID_GATE = {
	id: "example",
	command: "pnpm check:example",
	kind: "leaf",
	tier: "ci-required",
	owner: "platform-foundation",
	domain: "example-domain",
	description: "An example gate.",
	negativeFixture: "scripts/__tests__/example.test.mjs",
};

/** Context where everything resolves and CI dispatches correctly. */
function healthyContext(overrides = {}) {
	return {
		commandResolves: () => true,
		fixtureExists: () => true,
		workflowCommands: [
			{ file: "ci.yml", run: "pnpm check:governance --tier ci-required" },
		],
		...overrides,
	};
}

describe("gate registry validation", () => {
	it("accepts a well-formed registry", () => {
		expect(validateGateRegistry([VALID_GATE], healthyContext())).toEqual([]);
	});

	it("rejects duplicate gate ids", () => {
		const problems = validateGateRegistry(
			[VALID_GATE, { ...VALID_GATE, command: "pnpm check:other" }],
			healthyContext(),
		);
		expect(problems).toContain("duplicate gate id: example");
	});

	it("rejects an unknown tier", () => {
		const problems = validateGateRegistry(
			[{ ...VALID_GATE, tier: "whenever" }],
			healthyContext(),
		);
		expect(problems.join("\n")).toContain('invalid tier "whenever"');
	});

	it("rejects an anonymous mandatory gate", () => {
		const problems = validateGateRegistry(
			[{ ...VALID_GATE, owner: "  " }],
			healthyContext(),
		);
		expect(problems.join("\n")).toContain("missing owner");
	});

	it("rejects a command with no corresponding script", () => {
		const problems = validateGateRegistry(
			[VALID_GATE],
			healthyContext({ commandResolves: () => false }),
		);
		expect(problems.join("\n")).toContain("does not resolve to an existing");
	});

	it("rejects a mutating ci-required command", () => {
		const problems = validateGateRegistry(
			[{ ...VALID_GATE, command: "pnpm protect:update" }],
			healthyContext(),
		);
		expect(problems.join("\n")).toContain("must be read-only");
	});

	it("rejects an enforced gate with no negative fixture", () => {
		const problems = validateGateRegistry(
			[{ ...VALID_GATE, negativeFixture: undefined }],
			healthyContext(),
		);
		expect(problems.join("\n")).toContain("require a negative fixture");
	});

	it("rejects a negative fixture that does not exist", () => {
		const problems = validateGateRegistry(
			[VALID_GATE],
			healthyContext({ fixtureExists: () => false }),
		);
		expect(problems.join("\n")).toContain("does not exist");
	});

	it("rejects required gates that no workflow dispatches (registry → CI)", () => {
		const problems = validateGateRegistry(
			[VALID_GATE],
			healthyContext({
				workflowCommands: [{ file: "ci.yml", run: "pnpm lint" }],
			}),
		);
		expect(problems.join("\n")).toContain("no workflow invokes");
	});

	it("does not treat a prose mention of check:governance as dispatch", () => {
		const problems = validateGateRegistry(
			[VALID_GATE],
			healthyContext({
				workflowCommands: [
					{
						file: "ci.yml",
						run: 'echo "see check:governance docs"',
					},
				],
			}),
		);
		expect(problems.join("\n")).toContain("no workflow invokes");
	});

	it("rejects a workflow invoking a registered gate directly (CI → registry)", () => {
		// The invariant that stops inline gates accumulating outside the registry.
		const problems = validateGateRegistry(
			[VALID_GATE],
			healthyContext({
				workflowCommands: [
					{ file: "ci.yml", run: "pnpm check:governance --tier ci-required" },
					{ file: "ci.yml", run: "pnpm check:example" },
				],
			}),
		);
		expect(problems.join("\n")).toContain("directly");
	});

	it("does not treat a prose mention of a gate command as an inline invoke", () => {
		const problems = validateGateRegistry(
			[VALID_GATE],
			healthyContext({
				workflowCommands: [
					{ file: "ci.yml", run: "pnpm check:governance --tier ci-required" },
					{
						file: "ci.yml",
						run: "echo documenting check:example without invoking it",
					},
				],
			}),
		);
		expect(problems.join("\n")).not.toContain("directly");
	});
});

describe("gate composition and nested execution", () => {
	const OTHER_GATE = {
		...VALID_GATE,
		id: "other",
		command: "pnpm check:other",
		negativeFixture: "scripts/__tests__/other.test.mjs",
	};

	it("rejects an invalid kind", () => {
		const problems = validateGateRegistry(
			[{ ...VALID_GATE, kind: "sometimes" }],
			healthyContext(),
		);
		expect(problems.join("\n")).toContain('invalid kind "sometimes"');
	});

	it("rejects a leaf gate declaring members", () => {
		const problems = validateGateRegistry(
			[{ ...VALID_GATE, members: ["other"] }, OTHER_GATE],
			healthyContext(),
		);
		expect(problems.join("\n")).toContain(
			"leaf gates must not declare members",
		);
	});

	it("rejects an aggregate with no members", () => {
		const problems = validateGateRegistry(
			[{ ...VALID_GATE, kind: "aggregate" }],
			healthyContext(),
		);
		expect(problems.join("\n")).toContain(
			"aggregate gates must declare members",
		);
	});

	it("rejects an aggregate referencing an unknown member", () => {
		const problems = validateGateRegistry(
			[{ ...VALID_GATE, kind: "aggregate", members: ["ghost"] }],
			healthyContext(),
		);
		expect(problems.join("\n")).toContain('declares unknown member "ghost"');
	});

	it("rejects a self-referencing aggregate", () => {
		const problems = validateGateRegistry(
			[{ ...VALID_GATE, kind: "aggregate", members: ["example"] }],
			healthyContext(),
		);
		expect(problems.join("\n")).toContain("declares itself as a member");
	});

	it("rejects a dependency cycle", () => {
		const problems = validateGateRegistry(
			[
				{ ...VALID_GATE, kind: "aggregate", members: ["other"] },
				{ ...OTHER_GATE, kind: "aggregate", members: ["example"] },
			],
			healthyContext(),
		);
		expect(problems.join("\n")).toContain("gate dependency cycle");
	});

	it("rejects a script invoking another registered gate", () => {
		// The rule that prevents the next double execution rather than fixing the
		// last one. Proven against the real repository: reintroducing the removed
		// `check:env-consumers` call in governance-packages.mjs makes this fire.
		const problems = validateGateRegistry(
			[VALID_GATE, OTHER_GATE],
			healthyContext({
				scriptSources: [
					{
						file: "scripts/aggregate-ish.mjs",
						source: 'await runPnpm(["check:other"]);',
						gateId: "example",
					},
				],
			}),
		);
		expect(problems.join("\n")).toContain('invokes registered gate "other"');
	});

	it("does not confuse mentioning a gate with invoking it", () => {
		// Governance tooling legitimately names other gates in allowlist reasons
		// and diagnostics. Flagging prose would make the rule fire on the registry
		// tooling itself — which it did, before detection was narrowed to real
		// invocation forms.
		const problems = validateGateRegistry(
			[VALID_GATE, OTHER_GATE],
			healthyContext({
				scriptSources: [
					{
						file: "scripts/some-gate.mjs",
						source:
							'const reason = "Negative fixture — must contain the specifier to prove check:other fires.";',
						gateId: "example",
					},
				],
			}),
		);
		expect(problems.join("\n")).not.toContain("invokes registered gate");
	});

	it("allows a declared aggregate member to be invoked", () => {
		const problems = validateGateRegistry(
			[{ ...VALID_GATE, kind: "aggregate", members: ["other"] }, OTHER_GATE],
			healthyContext({
				scriptSources: [
					{
						file: "scripts/aggregate.mjs",
						source: 'await runPnpm(["check:other"]);',
						gateId: "example",
					},
				],
			}),
		);
		expect(problems.join("\n")).not.toContain("invokes registered gate");
	});
});

describe("the real registry", () => {
	it("declares only parseable commands", () => {
		for (const gate of GOVERNANCE_GATES) {
			expect(parseGateCommand(gate.command), gate.id).toBeDefined();
		}
	});

	it("points every negative fixture at a file that exists", () => {
		for (const gate of GOVERNANCE_GATES) {
			expect(
				existsSync(path.join(repoRoot, gate.negativeFixture)),
				`${gate.id} → ${gate.negativeFixture}`,
			).toBe(true);
		}
	});

	it("scans CI-invoked scripts, not only gate implementations", () => {
		// The removed duplicate lived in governance-packages.mjs — a CI step, not
		// a registered gate. Scanning only gate implementations would have missed
		// it, so this asserts the wider population stays covered.
		const output = execFileSync(
			process.execPath,
			[path.join(repoRoot, "scripts/check-governance.mjs"), "--list-scanned"],
			{ cwd: repoRoot, encoding: "utf8" },
		);

		// Assert the population is non-empty and still includes the script that
		// carried the original duplicate. A count threshold would only encode a
		// transient number — it shrinks as gates migrate into the registry.
		expect(output).toContain("scripts/governance-packages.mjs");
		expect(
			output.split("\n").filter((line) => line.startsWith("ci-script")).length,
		).toBeGreaterThan(0);
	});

	it("marks every registered gate with a composition kind", () => {
		for (const gate of GOVERNANCE_GATES) {
			expect(["leaf", "aggregate"], gate.id).toContain(gate.kind);
		}
	});

	it("passes --verify-registry against the live repository", () => {
		const output = execFileSync(
			process.execPath,
			[
				path.join(repoRoot, "scripts/check-governance.mjs"),
				"--verify-registry",
			],
			{ cwd: repoRoot, encoding: "utf8" },
		);
		expect(output).toContain("registry valid");
	});
});
