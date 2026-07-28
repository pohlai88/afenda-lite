import path from "node:path";

import { defineConfig, mergeConfig } from "vitest/config";
import {
	masterDataParityIncludes,
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
			name: "master-data-parity",
			root: masterDataRoot,
			include: masterDataParityIncludes,
			environment: "node",
			globalSetup: [
				path.join(repoRoot, "testing/verify-master-data-parity-schema.ts"),
			],
			setupFiles: [
				path.join(repoRoot, "testing/setup-master-data-parity-database.ts"),
			],
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
