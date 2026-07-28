import { defineConfig, mergeConfig } from "vitest/config";
import {
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
			name: "master-data-memory-parity",
			root: masterDataRoot,
			include: ["__tests__/parity/**/*.parity.test.ts"],
			testNamePattern: /MemoryMasterDataStore/,
			environment: "node",
			fileParallelism: false,
			maxWorkers: 1,
			env: {
				SKIP_ENV_VALIDATION: "true",
			},
		},
	}),
);
