import { defineConfig, mergeConfig } from "vitest/config";

import {
	laneIncludeForProject,
	laneProjectName,
	laneTimeoutOptions,
	nextServerAlias,
	repoRoot,
	serverOnlyAlias,
	sharedVitestConfig,
	webAlias,
} from "./vitest.shared";

export default mergeConfig(
	sharedVitestConfig,
	defineConfig({
		resolve: {
			alias: {
				...webAlias,
				...nextServerAlias,
				...serverOnlyAlias,
			},
		},
		test: {
			name: laneProjectName("web-scenario"),
			root: repoRoot,
			include: laneIncludeForProject("web-scenario", "."),
			environment: "node",
			...laneTimeoutOptions("web-scenario"),
			maxWorkers: 2,
			env: {
				SKIP_ENV_VALIDATION: "true",
			},
		},
	}),
);
