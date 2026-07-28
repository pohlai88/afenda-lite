import path from "node:path";

import { defineConfig, mergeConfig } from "vitest/config";
import {
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
			name: "master-data-core-parity",
			root: masterDataRoot,
			include: [
				"__tests__/parity/{party,item,item-group,organization-dimension,warehouse,payment-term,tax-registration,variants}.parity.test.ts",
				"__tests__/integration/{tenant-isolation,mutation-atomicity,cas-concurrency,sensitive-projections}.integration.test.ts",
			],
			environment: "node",
			globalSetup: [
				path.join(repoRoot, "testing/verify-master-data-core-parity-schema.ts"),
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
