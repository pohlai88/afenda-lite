/**
 * @afenda/testing
 * Contract: TESTING-CONTROL-PLANE
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { describe, expect, it } from "vitest";

import {
	APPROVED_DIRECT_DATABASE_URL_TEST_FILES,
	APPROVED_TESTING_CONFIG_FILES,
	defineAfendaPlaywrightConfig,
	defineAfendaVitestConfig,
	FORBIDDEN_TEST_RUNNERS,
	getTestingLane,
	resolveVitestLaneExclude,
	resolveVitestLaneInclude,
	setupDatabaseTestLane,
	setupRequiredDatabaseTestLane,
	TESTING_CONTROL_PLANE_HOME,
	TESTING_LANES,
	TESTING_POLICY_BOUND_CONFIG_FILES,
} from "../src/index.js";

describe("testing control plane registry", () => {
	it("declares testing as the root runner HOME", () => {
		expect(TESTING_CONTROL_PLANE_HOME).toBe("testing");
	});

	it("keeps lane ids unique", () => {
		const laneIds = TESTING_LANES.map((lane) => lane.id);

		expect(new Set(laneIds).size).toBe(laneIds.length);
	});

	it("points every lane at an approved control file", () => {
		for (const lane of TESTING_LANES) {
			expect(APPROVED_TESTING_CONFIG_FILES).toContain(lane.controlFile);
		}
	});

	it("keeps canonical include fields aligned with compatibility globs", () => {
		for (const lane of TESTING_LANES) {
			expect(lane.include).toEqual(lane.allowedGlobs);
			expect(lane.include.length).toBeGreaterThan(0);
		}
	});

	it("requires satellite configs to bind back to policy", () => {
		expect(TESTING_POLICY_BOUND_CONFIG_FILES).toEqual([
			"playwright.config.ts",
			"apps/storybook/vitest.coverage.config.ts",
			"apps/storybook/vitest.storybook.config.ts",
			"apps/storybook/playwright.visual.config.ts",
		]);
	});

	it("tracks the expected runner families", () => {
		expect(getTestingLane("unit").runner).toBe("vitest");
		expect(getTestingLane("e2e-smoke").runner).toBe("playwright");
		expect(getTestingLane("storybook-visual").owner).toBe("apps/storybook");
	});

	it("keeps direct DATABASE_URL reads explicit", () => {
		expect(APPROVED_DIRECT_DATABASE_URL_TEST_FILES).toEqual([
			"packages/data-plane/db/__tests__/env.test.ts",
		]);
	});

	it("rejects alternate runner stacks by policy", () => {
		expect(FORBIDDEN_TEST_RUNNERS).toContain("jest");
		expect(FORBIDDEN_TEST_RUNNERS).toContain("cypress");
	});

	it("builds Vitest config from package lane policy", () => {
		const config = defineAfendaVitestConfig({ lane: "unit" });

		expect(config.test?.include).toEqual([
			"__tests__/**/!(*.interaction|*.inventory|*.journey|*journeys|*.neon).test.ts",
		]);
		expect(config.test?.passWithNoTests).toBe(false);
	});

	it("normalizes lane includes for package-local Vitest roots", () => {
		expect(
			resolveVitestLaneInclude({
				lane: "master-data-parity",
				projectPath: "packages/erp/master-data",
			}),
		).toEqual([
			"__tests__/parity/**/*.parity.test.ts",
			"__tests__/integration/**/*.integration.test.ts",
		]);
	});

	it("normalizes lane excludes for package-local Vitest roots", () => {
		expect(resolveVitestLaneExclude({ lane: "unit" })).toEqual([
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

	it("rejects Playwright lanes from the Vitest factory", () => {
		expect(() => defineAfendaVitestConfig({ lane: "e2e-smoke" })).toThrow(
			'Testing lane "e2e-smoke" is not a Vitest lane.',
		);
	});

	it("builds Playwright lane config from package lane policy", () => {
		const config = defineAfendaPlaywrightConfig({ lane: "e2e-smoke" });

		expect(config.testMatch).toEqual(getTestingLane("e2e-smoke").include);
		expect(config.timeout).toBe(90_000);
	});

	it("rejects Vitest lanes from the Playwright factory", () => {
		expect(() => defineAfendaPlaywrightConfig({ lane: "unit" })).toThrow(
			'Testing lane "unit" is not a Playwright lane.',
		);
	});

	it("exports the package-owned database setup helper", () => {
		expect(setupDatabaseTestLane).toBeTypeOf("function");
		expect(setupRequiredDatabaseTestLane).toBeTypeOf("function");
	});
});
