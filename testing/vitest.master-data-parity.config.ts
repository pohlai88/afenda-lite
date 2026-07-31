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
			name: laneProjectName("master-data-parity"),
			root: masterDataRoot,
			include: laneIncludeForProject(
				"master-data-parity",
				"packages/erp/master-data",
			),
			environment: "node",
			globalSetup: [
				path.join(repoRoot, "testing/verify-master-data-parity-schema.ts"),
			],
			setupFiles: ["@afenda/testing/setup/required-database"],
			...laneTimeoutOptions("master-data-parity"),
			fileParallelism: false,
			maxWorkers: 1,
			env: {
				SKIP_ENV_VALIDATION: "true",
			},
		},
	}),
);
