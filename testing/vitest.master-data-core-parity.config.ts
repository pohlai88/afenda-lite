import path from "node:path";

import { defineConfig, mergeConfig } from "vitest/config";
import {
	laneIncludeForProject,
	laneProjectName,
	laneTimeoutOptions,
	masterDataRoot,
	repoRoot,
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
			name: laneProjectName("master-data-core-parity"),
			root: masterDataRoot,
			include: laneIncludeForProject(
				"master-data-core-parity",
				"packages/erp/master-data",
			),
			environment: "node",
			globalSetup: [
				path.join(repoRoot, "testing/verify-master-data-core-parity-schema.ts"),
			],
			setupFiles: ["@afenda/testing/setups/required-database"],
			...laneTimeoutOptions("master-data-core-parity"),
			fileParallelism: false,
			maxWorkers: 1,
			env: {
				SKIP_ENV_VALIDATION: "true",
			},
		},
	}),
);
