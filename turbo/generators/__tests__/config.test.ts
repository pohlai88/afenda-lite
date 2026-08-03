import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { PlopTypes } from "@turbo/gen";
import fastGlob from "fast-glob";
import { describe, expect, it } from "vitest";

import registerGenerators, { generatorRegistrations } from "../config.ts";

interface RegisteredGenerator {
	readonly config: Partial<PlopTypes.PlopGeneratorConfig>;
	readonly name: string;
}

const captureRegisteredGenerators = (): readonly RegisteredGenerator[] => {
	const registered: RegisteredGenerator[] = [];
	registerGenerators({
		setGenerator(name, config) {
			registered.push({ name, config });
		},
	});
	return registered;
};

const capturePrompts = (): readonly {
	readonly generator: string;
	readonly prompt: PlopTypes.PromptQuestion;
}[] =>
	captureRegisteredGenerators().flatMap(({ config, name }) =>
		Array.isArray(config.prompts)
			? config.prompts.map((prompt) => ({ generator: name, prompt }))
			: [],
	);

describe("generator registrations", () => {
	it("keeps every generator test under the canonical __tests__ directory", async () => {
		const generatorRoot = resolve(
			dirname(fileURLToPath(import.meta.url)),
			"..",
		);
		const testFiles = await fastGlob("**/*.test.ts", {
			cwd: generatorRoot,
			onlyFiles: true,
		});

		expect(testFiles.sort()).toEqual([
			"__tests__/config.test.ts",
			"__tests__/contract-loader.test.ts",
			"__tests__/diagnostic-protocol.test.ts",
			"__tests__/erp-explicit-spec.test.ts",
			"__tests__/erp-feature-scaffold.test.ts",
			"__tests__/erp-layout-authority.test.ts",
			"__tests__/erp-manifest-authority.test.ts",
			"__tests__/erp-package-scaffold.test.ts",
			"__tests__/erp-projection-lock-apply.test.ts",
			"__tests__/erp-projection-lock-authority.test.ts",
			"__tests__/erp-treatment-authority.test.ts",
			"__tests__/file-transaction.test.ts",
			"__tests__/generator-check.test.ts",
			"__tests__/governance-convergence.test.ts",
			"__tests__/kernel-adoption-apply.test.ts",
			"__tests__/kernel-adoption-authority.test.ts",
			"__tests__/local-repo-governance.test.ts",
			"__tests__/reconciliation-planner.test.ts",
			"__tests__/repository-state.test.ts",
			"__tests__/workspace-discovery.test.ts",
		]);
	});

	it("exposes exactly the kernel and ERP generators", () => {
		expect(
			generatorRegistrations.map((registration) => registration.name),
		).toEqual(["kernel-generator", "erp-generator"]);
		expect(Object.isFrozen(generatorRegistrations)).toBe(true);
		expect(
			generatorRegistrations.every((registration) =>
				Object.isFrozen(registration),
			),
		).toBe(true);
	});

	it("registers the frozen inventory and read-only plan generators without a second execution list", () => {
		const registered = captureRegisteredGenerators();
		const registeredNames = registered.map((entry) => entry.name);

		// Expected names come from each registration's own declaration, so a
		// mutation command that is registered but absent from the declared
		// catalog — or the reverse — fails here rather than shipping unlisted.
		expect(registeredNames).toEqual(
			generatorRegistrations.flatMap((registration) => [
				registration.name,
				registration.planName,
				registration.planJsonName,
				...registration.explicitLocalCommands.map((command) => command.name),
			]),
		);
		expect(registeredNames).toHaveLength(generatorRegistrations.length * 3 + 4);
		expect(new Set(registeredNames).size).toBe(registeredNames.length);
		expect(
			generatorRegistrations.every((registration) =>
				Object.isFrozen(registration.explicitLocalCommands),
			),
		).toBe(true);
	});

	it("keeps every prompt reachable through --args", () => {
		// `turbo gen --args` refuses to bypass a prompt whose `when` is a
		// function, which would silently make the write generators
		// interactive-only.
		expect(
			capturePrompts().filter(
				(entry) => typeof entry.prompt.when === "function",
			),
		).toEqual([]);
	});

	it("rejects non-kebab-case answers at the prompt", () => {
		const prompts = capturePrompts().filter(
			(entry) => entry.prompt.name !== "groupId",
		);

		expect(prompts.length).toBeGreaterThan(0);
		for (const { generator, prompt } of prompts) {
			const label = `${generator}.${String(prompt.name)}`;
			expect(prompt.validate?.("human-resources"), label).toBe(true);
			// The interactive path validates the filtered answer while --args
			// validates the raw positional string; both must agree.
			expect(prompt.validate?.("  human-resources  "), label).toBe(true);
			expect(prompt.filter?.("  human-resources  "), label).toBe(
				"human-resources",
			);
			for (const rejected of [
				"Human_Resources",
				"",
				"-leading",
				"trailing-",
				"double--dash",
				undefined,
			]) {
				expect(typeof prompt.validate?.(rejected), `${label} ${rejected}`).toBe(
					"string",
				);
			}
		}
	});

	it("accepts a blank feature group id and rejects a malformed one", () => {
		const prompts = capturePrompts().filter(
			(entry) => entry.prompt.name === "groupId",
		);

		expect(prompts).toHaveLength(1);
		const groupId = prompts[0]?.prompt;
		for (const blank of ["", "   ", undefined]) {
			expect(groupId?.validate?.(blank)).toBe(true);
		}
		expect(groupId?.filter?.("   ")).toBe("");
		expect(groupId?.validate?.("talent")).toBe(true);
		expect(typeof groupId?.validate?.("Talent")).toBe("string");
	});

	it("keeps families internal and declares only governed modes", {
		timeout: 15_000,
	}, async () => {
		for (const registration of generatorRegistrations) {
			expect(registration.contract.release).toEqual({ state: "internal" });
			if (registration.contract.family === "erp") {
				expect(registration.contract.modes).toEqual([
					{ id: "doctor", writes: false },
					{ id: "plan-upgrade", writes: false },
				]);
			} else {
				expect(registration.contract.modes).toEqual([
					{ id: "doctor", writes: false },
					{ id: "plan-upgrade", writes: false },
				]);
			}
			expect(
				registration.contract.capabilities.every(
					(capability) => capability.status === "declared",
				),
			).toBe(true);
		}
		const reports = await Promise.all(
			generatorRegistrations.map((registration) =>
				registration.doctor(process.cwd()),
			),
		);
		for (const report of reports) {
			expect(report).toContain("authoritative-capabilities=0");
			expect(report).toContain(
				"scope=workspace-discovery-and-contract-diagnostics",
			);
			expect(report).toContain("workspace-count=38");
			expect(report).toContain("kernel-candidates=18");
			expect(report).toContain("erp-candidates=13");
			expect(report).toContain("outside-family-scope=7");
			expect(report).toContain("workspace-reconciliation=38=18+13+7");
			expect(report).toContain("outside-generator-families");
			if (report.includes("erp-generator contract is valid")) {
				expect(report).toContain("erp-manifest-count=13");
				expect(report).toContain("erp-manifest-missing=0");
				expect(report).toContain("erp-manifest-duplicate-conflict=0");
			}
			expect(report).toContain("schema=afenda.generator-diagnostics/v1");
			expect(report).toContain("outcomes=completed");
			expect(report).toContain("exit=0");
		}
		const jsonReports = await Promise.all(
			generatorRegistrations.map((registration) =>
				registration.doctor(process.cwd(), { format: "json" }),
			),
		);
		for (const report of jsonReports) {
			expect(report).toContain('"schema": "afenda.generator-doctor/v1"');
			expect(report).toContain('"authoritativeCapabilities": 0');
			expect(report).toContain('"reconciliation": "38=18+13+7"');
			if (report.includes('"family": "erp"')) {
				expect(report).toContain(
					'"schema": "afenda.erp-manifest-authority/v1"',
				);
				expect(report).toContain('"missing": 0');
				expect(report).toContain('"duplicateConflict": 0');
			}
			expect(report).toContain('"schema": "afenda.generator-diagnostics/v1"');
		}
	});
});
