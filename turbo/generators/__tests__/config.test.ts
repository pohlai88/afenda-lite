import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import fastGlob from "fast-glob";
import { describe, expect, it } from "vitest";

import registerGenerators, { generatorRegistrations } from "../config.ts";

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

	it("registers the frozen inventory without a second execution list", () => {
		const registeredNames: string[] = [];
		registerGenerators({
			setGenerator(name) {
				registeredNames.push(name);
			},
		});

		expect(registeredNames).toEqual(
			generatorRegistrations.map((registration) => registration.name),
		);
		expect(registeredNames).toHaveLength(generatorRegistrations.length);
		expect(new Set(registeredNames).size).toBe(registeredNames.length);
	});

	it("keeps both families internal and exposes only the read-only doctor mode", async () => {
		for (const registration of generatorRegistrations) {
			expect(registration.contract.release).toEqual({ state: "internal" });
			expect(registration.contract.modes).toEqual([
				{ id: "doctor", writes: false },
			]);
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
			expect(report).toContain('"schema": "afenda.generator-diagnostics/v1"');
		}
	});
});
