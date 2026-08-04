/**
 * @afenda/testing
 * Contract: TESTING-CONTROL-PLANE
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import type {
	TestingLaneDefinition,
	TestingWorkspaceRun,
	TestingWorkspaceRunOptions,
} from "#testing/contracts";

export const TESTING_CONTROL_PLANE_HOME = "testing";

// Package tasks already create Vitest worker pools. Keep Turbo fan-out bounded so
// those pools do not oversubscribe the host under a full workspace run.
const WORKSPACE_TEST_TASK_CONCURRENCY = 4 as const;

const TESTING_SUPPORT_CONFIG_FILES = [
	"testing/vitest.config.ts",
	"testing/vitest.shared.ts",
] as const;

export const FORBIDDEN_TEST_RUNNERS = Object.freeze([
	"jest",
	"ts-jest",
	"babel-jest",
	"cypress",
	"@cypress",
] as const);

// Node's built-in runner is not a dependency, so it cannot be caught by the
// forbidden-dependency check. It is banned by source import instead: it is a
// third runner stack that escapes lane selection, timeouts, and reporting.
export const FORBIDDEN_TEST_RUNNER_MODULES = Object.freeze([
	"node:test",
] as const);

export const APPROVED_DIRECT_DATABASE_URL_TEST_FILES = Object.freeze([
	"packages/data-plane/db/__tests__/env.test.ts",
] as const);

const TESTING_LANE_DEFINITIONS = [
	{
		id: "unit",
		runner: "vitest",
		owner: "testing",
		controlFile: "testing/vitest.unit.config.ts",
		rootCommand: "pnpm test:unit",
		include: [
			"<workspace>/__tests__/**/!(*.interaction|*.inventory|*.journey|*journeys|*.neon).test.{ts,tsx,mjs}",
		],
		exclude: [
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
		],
		cache: "turbo-cacheable",
		requiresDatabase: false,
		requiresBrowser: false,
		timeoutMs: 15_000,
	},
	{
		// Repo-governance suites that test the .mjs check scripts they sit beside.
		// They live outside apps/ and packages/, so they get their own lane rather
		// than leaking repo-root globs into every workspace project's include.
		id: "repo-tooling",
		runner: "vitest",
		owner: "testing",
		controlFile: "testing/vitest.unit.config.ts",
		rootCommand: "pnpm test:unit",
		include: [
			"scripts/__tests__/**/*.test.mjs",
			"governance/scripts/__tests__/**/*.test.mjs",
		],
		cache: "turbo-cacheable",
		requiresDatabase: false,
		requiresBrowser: false,
		timeoutMs: 30_000,
	},
	{
		id: "interaction",
		runner: "vitest",
		owner: "testing",
		controlFile: "testing/vitest.interaction.config.ts",
		rootCommand: "pnpm test:interaction",
		packageCommands: ["pnpm --filter @afenda/ui-system test:interaction"],
		include: [
			"apps/web/__tests__/**/*.interaction.test.tsx",
			"packages/surfaces/ui-system/__tests__/**/*.interaction.test.tsx",
		],
		cache: "turbo-cacheable",
		requiresDatabase: false,
		requiresBrowser: false,
		timeoutMs: 15_000,
	},
	{
		id: "web-scenario",
		runner: "vitest",
		owner: "testing",
		controlFile: "testing/vitest.web-scenario.config.ts",
		rootCommand: "pnpm test:web:scenario",
		include: [
			"apps/web/__tests__/**/*.inventory.test.ts",
			"apps/web/__tests__/**/*.journey.test.ts",
			"apps/web/__tests__/**/*journeys.test.ts",
		],
		cache: "turbo-cacheable",
		requiresDatabase: false,
		requiresBrowser: false,
		timeoutMs: 30_000,
		hookTimeoutMs: 30_000,
	},
	{
		id: "corporate-administration-parity",
		runner: "vitest",
		owner: "testing",
		controlFile: "testing/vitest.corporate-administration-parity.config.ts",
		rootCommand: "pnpm test:corporate-administration:parity",
		packageCommands: [
			"pnpm --filter @afenda/corporate-administration test:parity",
		],
		include: [
			"packages/erp/corporate-administration/__tests__/*.parity.test.ts",
			"packages/erp/corporate-administration/__tests__/parity/**/*.parity.test.ts",
			"packages/erp/corporate-administration/__tests__/concurrency/**/*.concurrency.test.ts",
			"packages/erp/corporate-administration/__tests__/concurrency/**/*concurrency.test.ts",
			"packages/erp/corporate-administration/__tests__/database/**/*.neon.test.ts",
			"packages/erp/corporate-administration/__tests__/failure-injection/**/*.test.ts",
		],
		cache: "uncached",
		requiresDatabase: true,
		requiresBrowser: false,
		timeoutMs: 30_000,
		hookTimeoutMs: 90_000,
	},
	{
		id: "human-resources-parity",
		runner: "vitest",
		owner: "testing",
		controlFile: "testing/vitest.hr-parity.config.ts",
		rootCommand: "pnpm test:hr:parity",
		packageCommands: ["pnpm --filter @afenda/human-resources test:parity"],
		include: [
			"packages/erp/human-resources/__tests__/**/*.parity.test.ts",
			"packages/erp/human-resources/__tests__/**/leave-concurrency.test.ts",
			"packages/erp/human-resources/__tests__/**/time-policy-concurrency.test.ts",
			"packages/erp/human-resources/__tests__/**/leave-failure-injection.test.ts",
		],
		cache: "uncached",
		requiresDatabase: true,
		requiresBrowser: false,
		timeoutMs: 30_000,
		hookTimeoutMs: 90_000,
	},
	{
		id: "payroll-parity",
		runner: "vitest",
		owner: "testing",
		controlFile: "testing/vitest.payroll-parity.config.ts",
		rootCommand: "pnpm test:payroll:parity",
		packageCommands: ["pnpm --filter @afenda/payroll test:parity"],
		include: [
			"packages/erp/payroll/__tests__/failure-injection/**/*.test.ts",
		],
		cache: "uncached",
		requiresDatabase: true,
		requiresBrowser: false,
		timeoutMs: 30_000,
		hookTimeoutMs: 90_000,
	},
	{
		id: "master-data-parity",
		runner: "vitest",
		owner: "testing",
		controlFile: "testing/vitest.master-data-parity.config.ts",
		rootCommand: "pnpm test:master-data:parity",
		packageCommands: ["pnpm --filter @afenda/master-data test:parity"],
		include: [
			"packages/erp/master-data/__tests__/parity/**/*.parity.test.ts",
			"packages/erp/master-data/__tests__/integration/**/*.integration.test.ts",
		],
		cache: "uncached",
		requiresDatabase: true,
		requiresBrowser: false,
		timeoutMs: 30_000,
		hookTimeoutMs: 90_000,
	},
	{
		id: "master-data-core-parity",
		runner: "vitest",
		owner: "testing",
		controlFile: "testing/vitest.master-data-core-parity.config.ts",
		rootCommand: "pnpm test:master-data:parity:core",
		packageCommands: ["pnpm --filter @afenda/master-data test:parity:core"],
		include: [
			"packages/erp/master-data/__tests__/parity/{party,item,item-group,organization-dimension,warehouse,payment-term,tax-registration,variants}.parity.test.ts",
			"packages/erp/master-data/__tests__/integration/{tenant-isolation,mutation-atomicity,cas-concurrency,sensitive-projections}.integration.test.ts",
		],
		cache: "uncached",
		requiresDatabase: true,
		requiresBrowser: false,
		timeoutMs: 30_000,
		hookTimeoutMs: 90_000,
	},
	{
		id: "master-data-memory-parity",
		runner: "vitest",
		owner: "testing",
		controlFile: "testing/vitest.master-data-memory-parity.config.ts",
		rootCommand: "pnpm test:master-data:parity:memory",
		packageCommands: ["pnpm --filter @afenda/master-data test:parity:memory"],
		include: ["packages/erp/master-data/__tests__/parity/**/*.parity.test.ts"],
		cache: "turbo-cacheable",
		requiresDatabase: false,
		requiresBrowser: false,
		timeoutMs: 30_000,
		hookTimeoutMs: 90_000,
	},
	{
		id: "e2e-smoke",
		runner: "playwright",
		owner: "testing",
		controlFile: "playwright.config.ts",
		rootCommand: "pnpm test:e2e:smoke",
		include: ["e2e/smoke/**/*.spec.ts"],
		cache: "playwright-artifacts",
		requiresDatabase: true,
		requiresBrowser: true,
		timeoutMs: 90_000,
	},
	{
		id: "e2e-journey",
		runner: "playwright",
		owner: "testing",
		controlFile: "playwright.config.ts",
		rootCommand: "pnpm test:e2e:journey",
		include: ["e2e/journey/**/*.spec.ts"],
		cache: "playwright-artifacts",
		requiresDatabase: true,
		requiresBrowser: true,
		timeoutMs: 90_000,
	},
	{
		id: "e2e-all",
		runner: "playwright",
		owner: "testing",
		controlFile: "playwright.config.ts",
		rootCommand: "pnpm test:e2e",
		include: ["e2e/**/*.spec.ts"],
		cache: "playwright-artifacts",
		requiresDatabase: true,
		requiresBrowser: true,
		timeoutMs: 90_000,
	},
	{
		id: "e2e-adverse",
		runner: "playwright",
		owner: "testing",
		controlFile: "playwright.config.ts",
		rootCommand: "pnpm test:e2e:adverse",
		include: [
			"e2e/smoke/anonymous-gate.spec.ts",
			"e2e/smoke/wrong-role-gate.spec.ts",
			"e2e/smoke/two-org-denial.spec.ts",
		],
		cache: "playwright-artifacts",
		requiresDatabase: true,
		requiresBrowser: true,
		timeoutMs: 90_000,
	},
	{
		id: "storybook-unit",
		runner: "vitest",
		owner: "apps/storybook",
		controlFile: "apps/storybook/vitest.coverage.config.ts",
		rootCommand: "pnpm --filter @afenda/storybook test",
		include: ["apps/storybook/__tests__/**/*.test.ts"],
		cache: "turbo-cacheable",
		requiresDatabase: false,
		requiresBrowser: false,
		timeoutMs: 15_000,
	},
	{
		id: "storybook-stories",
		runner: "vitest",
		owner: "apps/storybook",
		controlFile: "apps/storybook/vitest.storybook.config.ts",
		rootCommand: "pnpm --filter @afenda/storybook test:stories",
		include: ["apps/storybook/**/*.stories.@(ts|tsx)"],
		cache: "uncached",
		requiresDatabase: false,
		requiresBrowser: true,
		timeoutMs: 30_000,
	},
	{
		id: "storybook-visual",
		runner: "playwright",
		owner: "apps/storybook",
		controlFile: "apps/storybook/playwright.visual.config.ts",
		rootCommand: "pnpm --filter @afenda/storybook test:visual",
		include: ["apps/storybook/visual-tests/**/*.spec.ts"],
		cache: "playwright-artifacts",
		requiresDatabase: false,
		requiresBrowser: true,
		timeoutMs: 90_000,
	},
] as const satisfies readonly TestingLaneDefinition[];

type DeepReadonly<T> = T extends (...args: never[]) => unknown
	? T
	: T extends readonly (infer Item)[]
		? readonly DeepReadonly<Item>[]
		: T extends object
			? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
			: T;

function deepFreeze<const T>(value: T): DeepReadonly<T> {
	if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
		return value as DeepReadonly<T>;
	}

	for (const nested of Object.values(value)) {
		deepFreeze(nested);
	}

	return Object.freeze(value) as DeepReadonly<T>;
}

export const TESTING_LANES = deepFreeze(TESTING_LANE_DEFINITIONS);

export function projectWorkspaceTestRun(
	options: TestingWorkspaceRunOptions = {},
): TestingWorkspaceRun {
	return deepFreeze({
		executable: "turbo" as const,
		args: [
			"run",
			"test",
			`--concurrency=${WORKSPACE_TEST_TASK_CONCURRENCY}`,
			...(options.affected ? ["--affected"] : []),
		],
	});
}

export type TestingLaneId = (typeof TESTING_LANES)[number]["id"];
export type TestingLane = TestingLaneDefinition &
	Readonly<{ id: TestingLaneId }>;

function uniqueControlFiles(
	lanes: readonly TestingLane[],
): readonly TestingLane["controlFile"][] {
	return Object.freeze([...new Set(lanes.map((lane) => lane.controlFile))]);
}

const TESTING_LANE_CONTROL_FILES = uniqueControlFiles(TESTING_LANES);

export const APPROVED_TESTING_CONFIG_FILES = Object.freeze([
	...TESTING_SUPPORT_CONFIG_FILES,
	...TESTING_LANE_CONTROL_FILES,
]);

export const TESTING_POLICY_BOUND_CONFIG_FILES = Object.freeze(
	TESTING_LANE_CONTROL_FILES.filter(
		(controlFile) => !controlFile.startsWith("testing/"),
	),
);

export function getTestingLane(id: TestingLaneId): TestingLane {
	const lane = TESTING_LANES.find((candidate) => candidate.id === id);

	if (!lane) {
		throw new Error(`Unknown testing lane: ${id}`);
	}

	return lane as TestingLane;
}
