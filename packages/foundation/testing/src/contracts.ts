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

export type TestingLaneDefinition = Readonly<{
	id: string;
	runner: TestingRunner;
	owner: "testing" | "apps/storybook";
	controlFile: string;
	rootCommand: string;
	packageCommands?: readonly string[];
	include: readonly string[];
	exclude?: readonly string[];
	cache: TestingCacheClass;
	requiresDatabase: boolean;
	requiresBrowser: boolean;
	timeoutMs?: number;
	hookTimeoutMs?: number;
}>;
