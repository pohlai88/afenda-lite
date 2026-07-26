import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig, mergeConfig } from "vitest/config";
import {
	repoRoot,
	sharedVitestConfig,
	TESTS_DIR,
	webAlias,
} from "./vitest.shared";

export default mergeConfig(
	sharedVitestConfig,
	defineConfig({
		plugins: [react()],
		resolve: {
			alias: webAlias,
		},
		test: {
			name: "interaction",
			root: repoRoot,
			include: [
				`apps/web/${TESTS_DIR}/**/*.interaction.test.tsx`,
				`packages/surfaces/ui-system/${TESTS_DIR}/**/*.interaction.test.tsx`,
			],
			environment: "jsdom",
			setupFiles: [path.join(repoRoot, "testing/setup-interaction.ts")],
			maxWorkers: process.env.CI ? 1 : 2,
			env: {
				SKIP_ENV_VALIDATION: "true",
			},
		},
	}),
);
