/**
 * @afenda/testing
 * Contract: TESTING-CONTROL-PLANE
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	testingDatabase,
	testingPlaywright,
	testingPolicy,
	testingVitest,
} from "../src/index.js";

describe("testing control plane registry", () => {
	it("exposes one frozen root capability style", async () => {
		const testingRoot = await import("../src/index.js");

		expect(Object.keys(testingRoot).sort()).toEqual([
			"testingDatabase",
			"testingPlaywright",
			"testingPolicy",
			"testingVitest",
		]);
		expect(Object.isFrozen(testingPolicy)).toBe(true);
		expect(Object.isFrozen(testingVitest)).toBe(true);
		expect(Object.isFrozen(testingPlaywright)).toBe(true);
		expect(Object.isFrozen(testingDatabase)).toBe(true);
		expect(Object.isFrozen(testingPolicy.lanes)).toBe(true);
		expect(Object.isFrozen(testingPolicy.lanes[0])).toBe(true);
		expect(Object.isFrozen(testingPolicy.lanes[0]?.include)).toBe(true);
		expect(() =>
			(testingPolicy.lanes[0]?.include as string[]).push("rogue/**/*.test.ts"),
		).toThrow();
	});

	it("declares testing as the root runner HOME", () => {
		expect(testingPolicy.home).toBe("testing");
	});

	it("projects bounded workspace execution without leaking Turbo policy", () => {
		const fullRun = testingPolicy.workspaceRun();
		const affectedRun = testingPolicy.workspaceRun({ affected: true });

		expect(fullRun).toEqual({
			executable: "turbo",
			args: ["run", "test", "--concurrency=4"],
		});
		expect(affectedRun).toEqual({
			executable: "turbo",
			args: ["run", "test", "--concurrency=4", "--affected"],
		});
		expect(Object.isFrozen(fullRun)).toBe(true);
		expect(Object.isFrozen(fullRun.args)).toBe(true);
	});

	it("keeps root test scripts as thin workspace-run adapters", () => {
		const packageJson = JSON.parse(
			readFileSync(
				join(import.meta.dirname, "../../../../package.json"),
				"utf8",
			),
		) as { scripts: Record<string, string> };

		expect(packageJson.scripts.test).toBe(
			"node --experimental-strip-types testing/run-workspace-tests.mts",
		);
		expect(packageJson.scripts["test:affected"]).toBe(
			"node --experimental-strip-types testing/run-workspace-tests.mts --affected",
		);
	});

	it("keeps lane ids unique", () => {
		const laneIds = testingPolicy.lanes.map((lane) => lane.id);

		expect(new Set(laneIds).size).toBe(laneIds.length);
	});

	it("points every lane at an approved control file", () => {
		for (const lane of testingPolicy.lanes) {
			expect(testingPolicy.configFiles).toContain(lane.controlFile);
			expect(lane.include.length).toBeGreaterThan(0);
			expect("allowedGlobs" in lane).toBe(false);
			expect("forbiddenGlobs" in lane).toBe(false);
		}
	});

	it("requires satellite configs to bind back to policy", () => {
		expect(testingPolicy.policyBoundConfigFiles).toEqual([
			"playwright.config.ts",
			"apps/storybook/vitest.coverage.config.ts",
			"apps/storybook/vitest.storybook.config.ts",
			"apps/storybook/playwright.visual.config.ts",
		]);
	});

	it("tracks the expected runner families", () => {
		expect(testingPolicy.lane("unit").runner).toBe("vitest");
		expect(testingPolicy.lane("e2e-smoke").runner).toBe("playwright");
		expect(testingPolicy.lane("storybook-visual").owner).toBe("apps/storybook");
	});

	it("keeps direct DATABASE_URL reads explicit", () => {
		expect(testingPolicy.approvedDirectDatabaseUrlTestFiles).toEqual([
			"packages/data-plane/db/__tests__/env.test.ts",
		]);
	});

	it("rejects alternate runner stacks by policy", () => {
		expect(testingPolicy.forbiddenRunners).toContain("jest");
		expect(testingPolicy.forbiddenRunners).toContain("cypress");
	});

	it("builds Vitest config from package lane policy", () => {
		const config = testingVitest.define({ lane: "unit" });

		expect(config.test?.include).toEqual([
			"__tests__/**/!(*.interaction|*.inventory|*.journey|*journeys|*.neon).test.{ts,tsx,mjs}",
		]);
		expect(config.test?.passWithNoTests).toBe(false);
	});

	it("normalizes lane includes for package-local Vitest roots", () => {
		expect(
			testingVitest.include({
				lane: "master-data-parity",
				projectPath: "packages/erp/master-data",
			}),
		).toEqual([
			"__tests__/parity/**/*.parity.test.ts",
			"__tests__/integration/**/*.integration.test.ts",
		]);
	});

	it("projects the complete Corporate Administration database evidence lane", () => {
		expect(
			testingVitest.include({
				lane: "corporate-administration-parity",
				projectPath: "packages/erp/corporate-administration",
			}),
		).toEqual([
			"__tests__/*.parity.test.ts",
			"__tests__/parity/**/*.parity.test.ts",
			"__tests__/concurrency/**/*.concurrency.test.ts",
			"__tests__/concurrency/**/*concurrency.test.ts",
			"__tests__/database/**/*.neon.test.ts",
			"__tests__/failure-injection/**/*.test.ts",
		]);
	});

	it("normalizes lane excludes for package-local Vitest roots", () => {
		expect(testingVitest.exclude({ lane: "unit" })).toEqual([
			"**/*.interaction.test.tsx",
			"**/*.inventory.test.ts",
			"**/*.journey.test.ts",
			"**/*journeys.test.ts",
			"**/*.neon.test.ts",
			"**/*.parity.test.ts",
			"**/parity/**",
			"**/concurrency/**",
			"**/database/**",
			"**/failure-injection/**",
			"**/integration/**",
			"**/leave-concurrency.test.ts",
			"**/leave-failure-injection.test.ts",
			"**/time-policy-concurrency.test.ts",
		]);
	});

	it("rejects Playwright lanes from the Vitest capability", () => {
		expect(() => testingVitest.define({ lane: "e2e-smoke" })).toThrow(
			'Testing lane "e2e-smoke" is not a Vitest lane.',
		);
	});

	it("builds Playwright lane config from package lane policy", () => {
		const config = testingPlaywright.define({ lane: "e2e-smoke" });

		expect(config.testMatch).toEqual(testingPolicy.lane("e2e-smoke").include);
		expect(config.timeout).toBe(90_000);
	});

	it("rejects Vitest lanes from the Playwright capability", () => {
		expect(() => testingPlaywright.define({ lane: "unit" })).toThrow(
			'Testing lane "unit" is not a Playwright lane.',
		);
	});

	it("publishes only root capabilities and setup entrypoints", () => {
		const packageJson = JSON.parse(
			readFileSync(join(import.meta.dirname, "../package.json"), "utf8"),
		) as {
			exports: Record<string, unknown>;
			imports: Record<string, unknown>;
		};

		expect(Object.keys(packageJson.exports).sort()).toEqual([
			".",
			"./setup/database",
			"./setup/required-database",
		]);
		expect(packageJson.imports).toEqual({ "#testing/*": "./src/*.ts" });
	});

	it("executes the optional database setup entrypoint", async () => {
		const originalDatabaseUrl = process.env.DATABASE_URL;
		const originalCi = process.env.CI;
		const originalRequired = process.env.REQUIRE_DATABASE_TESTS;

		try {
			process.env.DATABASE_URL = "  postgresql://setup/app  ";
			delete process.env.CI;
			delete process.env.REQUIRE_DATABASE_TESTS;

			await import("../src/entrypoints/setup-database.js");

			expect(process.env.DATABASE_URL).toBe("postgresql://setup/app");
		} finally {
			restoreEnvironmentValue("DATABASE_URL", originalDatabaseUrl);
			restoreEnvironmentValue("CI", originalCi);
			restoreEnvironmentValue("REQUIRE_DATABASE_TESTS", originalRequired);
		}
	});

	it("executes the required setup entrypoint fail-closed", async () => {
		const originalDatabaseUrl = process.env.DATABASE_URL;
		const originalCi = process.env.CI;
		const originalRequired = process.env.REQUIRE_DATABASE_TESTS;

		try {
			delete process.env.DATABASE_URL;
			process.env.CI = "true";
			delete process.env.REQUIRE_DATABASE_TESTS;

			await expect(
				import("../src/entrypoints/setup-required-database.js"),
			).rejects.toThrow("GUIDE-018 I5.5 database test gate blocked");
		} finally {
			restoreEnvironmentValue("DATABASE_URL", originalDatabaseUrl);
			restoreEnvironmentValue("CI", originalCi);
			restoreEnvironmentValue("REQUIRE_DATABASE_TESTS", originalRequired);
		}
	});
});

function restoreEnvironmentValue(
	name: "DATABASE_URL" | "CI" | "REQUIRE_DATABASE_TESTS",
	value: string | undefined,
): void {
	if (value === undefined) {
		delete process.env[name];
		return;
	}

	process.env[name] = value;
}
