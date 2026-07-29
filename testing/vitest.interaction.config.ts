import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig, mergeConfig } from "vitest/config";
import {
	laneIncludeForProject,
	laneProjectName,
	nextServerAlias,
	repoRoot,
	serverOnlyAlias,
	sharedVitestConfig,
	webAlias,
} from "./vitest.shared";

export default mergeConfig(
	sharedVitestConfig,
	defineConfig({
		plugins: [react()],
		resolve: {
			alias: {
				...webAlias,
				...nextServerAlias,
				...serverOnlyAlias,
			},
		},
		test: {
			name: laneProjectName("interaction"),
			root: repoRoot,
			include: laneIncludeForProject("interaction", "."),
			environment: "jsdom",
			setupFiles: [path.join(repoRoot, "testing/setup-interaction.ts")],
			maxWorkers: process.env.CI ? 1 : 2,
			env: {
				SKIP_ENV_VALIDATION: "true",
			},
		},
	}),
);
