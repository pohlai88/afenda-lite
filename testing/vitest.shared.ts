import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	getTestingLane,
	resolveVitestLaneExclude,
	resolveVitestLaneInclude,
	type TestingLaneId,
} from "@afenda/testing";
import type { ViteUserConfig } from "vitest/config";

export const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);

export const serverOnlyAlias = {
	"server-only": path.join(repoRoot, "testing/empty-server-only.ts"),
};

export const webAlias = {
	"@": path.join(repoRoot, "apps/web"),
};

export const nextServerAlias = {
	"next/cache": path.join(repoRoot, "apps/web/node_modules/next/cache.js"),
	"next/headers": path.join(repoRoot, "apps/web/node_modules/next/headers.js"),
	"next/navigation": path.join(
		repoRoot,
		"apps/web/node_modules/next/navigation.js",
	),
};

export const humanResourcesRoot = path.join(
	repoRoot,
	"packages/erp/human-resources",
);

export const masterDataRoot = path.join(repoRoot, "packages/erp/master-data");

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
} satisfies ViteUserConfig;

export const laneIncludeForProject = (
	lane: TestingLaneId,
	projectPath: string,
) => resolveVitestLaneInclude({ lane, projectPath });

export const laneExclude = (lane: TestingLaneId) =>
	resolveVitestLaneExclude({ lane });

export const laneExcludeOptions = (lane: TestingLaneId) => {
	const exclude = laneExclude(lane);
	return exclude === undefined ? {} : { exclude };
};

export const nodeProject = (name: string, root: string) => {
	const exclude = resolveVitestLaneExclude({ lane: "unit" });
	return {
		test: {
			name,
			root,
			include: resolveVitestLaneInclude({ lane: "unit" }),
			...(exclude === undefined ? {} : { exclude }),
			environment: "node" as const,
			maxWorkers: 1,
			env: {
				SKIP_ENV_VALIDATION: "true",
			},
		},
	};
};

export const nodeProjectWithServerOnly = (name: string, root: string) => ({
	...nodeProject(name, root),
	resolve: {
		alias: serverOnlyAlias,
	},
});

export const laneProjectName = (lane: TestingLaneId) => getTestingLane(lane).id;

export const laneTimeout = (lane: TestingLaneId) =>
	getTestingLane(lane).timeoutMs;

export const laneHookTimeout = (lane: TestingLaneId) =>
	getTestingLane(lane).hookTimeoutMs ?? getTestingLane(lane).timeoutMs;

export const laneTimeoutOptions = (lane: TestingLaneId) => {
	const testTimeout = laneTimeout(lane);
	const hookTimeout = laneHookTimeout(lane);

	return {
		...(testTimeout === undefined ? {} : { testTimeout }),
		...(hookTimeout === undefined ? {} : { hookTimeout }),
	};
};
