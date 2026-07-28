import path from "node:path";

import { defineConfig, mergeConfig } from "vitest/config";
import {
	humanResourcesParityIncludes,
	humanResourcesRoot,
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
			name: "human-resources-parity",
			root: humanResourcesRoot,
			include: humanResourcesParityIncludes,
			reporters: [
				"verbose",
				path.join(
					humanResourcesRoot,
					"src/testing/parity-observability-reporter.ts",
				),
			],
			environment: "node",
			setupFiles: [path.join(repoRoot, "testing/setup-hr-parity-database.ts")],
			testTimeout: 30_000,
			hookTimeout: 90_000,
			fileParallelism: false,
			maxWorkers: 1,
			env: {
				SKIP_ENV_VALIDATION: "true",
			},
		},
	}),
);
