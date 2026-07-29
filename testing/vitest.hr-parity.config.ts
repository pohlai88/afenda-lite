import path from "node:path";

import { defineConfig, mergeConfig } from "vitest/config";
import {
	humanResourcesRoot,
	laneIncludeForProject,
	laneProjectName,
	laneTimeoutOptions,
	serverOnlyAlias,
	sharedVitestConfig,
} from "./vitest.shared";

export default mergeConfig(
	sharedVitestConfig,
	defineConfig({
		resolve: {
			alias: serverOnlyAlias,
		},
		test: {
			name: laneProjectName("human-resources-parity"),
			root: humanResourcesRoot,
			include: laneIncludeForProject(
				"human-resources-parity",
				"packages/erp/human-resources",
			),
			reporters: [
				"verbose",
				path.join(
					humanResourcesRoot,
					"src/testing/parity-observability-reporter.ts",
				),
			],
			environment: "node",
			setupFiles: ["@afenda/testing/setups/database"],
			...laneTimeoutOptions("human-resources-parity"),
			fileParallelism: false,
			maxWorkers: 1,
			env: {
				SKIP_ENV_VALIDATION: "true",
			},
		},
	}),
);
