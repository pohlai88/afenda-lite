import path from "node:path";
import { fileURLToPath } from "node:url";

import type { UserConfig } from "vitest/config";

export const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);

/** L0/L2 Vitest specs live only under `<package|app>/__tests__/`. */
export const TESTS_DIR = "__tests__";

export const serverOnlyAlias = {
	"server-only": path.join(repoRoot, "testing/empty-server-only.ts"),
};

export const webAlias = {
	"@": path.join(repoRoot, "apps/web"),
};

export const humanResourcesRoot = path.join(
	repoRoot,
	"packages/erp/human-resources",
);

export const masterDataRoot = path.join(repoRoot, "packages/erp/master-data");

export const masterDataParityIncludes = [
	`${TESTS_DIR}/parity/**/*.parity.test.ts`,
	`${TESTS_DIR}/integration/**/*.integration.test.ts`,
];

/** Neon / shared-branch suites: explicit parity lane only. */
export const humanResourcesParityIncludes = [
	`${TESTS_DIR}/**/*.parity.test.ts`,
	`${TESTS_DIR}/**/leave-concurrency.test.ts`,
	`${TESTS_DIR}/**/time-policy-concurrency.test.ts`,
	`${TESTS_DIR}/**/leave-failure-injection.test.ts`,
];

export const sharedVitestConfig = {
	root: repoRoot,
	test: {
		environment: "node",
		pool: "forks",
		isolate: true,
		restoreMocks: true,
		clearMocks: true,
		mockReset: true,
		passWithNoTests: false,
		env: {
			SKIP_ENV_VALIDATION: "true",
		},
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.next/**",
			"**/coverage/**",
			"**/playwright/**",
			"**/*.e2e.{test,spec}.{ts,tsx}",
		],
	},
} satisfies UserConfig;

export const nodeProject = (name: string, root: string) => ({
	test: {
		name,
		root,
		include: [`${TESTS_DIR}/**/*.test.ts`],
		environment: "node" as const,
		maxWorkers: 1,
		env: {
			SKIP_ENV_VALIDATION: "true",
		},
	},
});

export const nodeProjectWithServerOnly = (name: string, root: string) => ({
	...nodeProject(name, root),
	resolve: {
		alias: serverOnlyAlias,
	},
});
