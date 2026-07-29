/**
 * @afenda/testing
 * Contract: TESTING-CONTROL-PLANE
 * Protected: changes require local pre-edit token and compatibility checks.
 */

export type TestingRunner = "vitest" | "playwright";

export type TestingCacheClass =
	| "turbo-cacheable"
	| "uncached"
	| "playwright-artifacts";

export type TestingLaneId =
	| "unit"
	| "interaction"
	| "web-scenario"
	| "corporate-administration-parity"
	| "human-resources-parity"
	| "master-data-parity"
	| "master-data-core-parity"
	| "master-data-memory-parity"
	| "e2e-smoke"
	| "e2e-journey"
	| "e2e-all"
	| "e2e-adverse"
	| "storybook-unit"
	| "storybook-stories"
	| "storybook-visual";

export type TestingLane = Readonly<{
	id: TestingLaneId;
	runner: TestingRunner;
	owner: "testing" | "apps/storybook";
	controlFile: string;
	rootCommand: string;
	packageCommands?: readonly string[];
	include: readonly string[];
	exclude?: readonly string[];
	allowedGlobs: readonly string[];
	forbiddenGlobs?: readonly string[];
	cache: TestingCacheClass;
	requiresDatabase: boolean;
	requiresBrowser: boolean;
	timeoutMs?: number;
	hookTimeoutMs?: number;
}>;
