import { defineConfig, mergeConfig } from "vitest/config";
import {
	laneIncludeForProject,
	laneProjectName,
	laneTimeoutOptions,
	masterDataRoot,
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
			name: laneProjectName("master-data-memory-parity"),
			root: masterDataRoot,
			include: laneIncludeForProject(
				"master-data-memory-parity",
				"packages/erp/master-data",
			),
			testNamePattern: /MemoryMasterDataStore/,
			environment: "node",
			...laneTimeoutOptions("master-data-memory-parity"),
			fileParallelism: false,
			maxWorkers: 1,
			env: {
				SKIP_ENV_VALIDATION: "true",
			},
		},
	}),
);
