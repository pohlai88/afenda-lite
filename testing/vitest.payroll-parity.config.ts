import { defineConfig } from "vitest/config";

import {
	laneIncludeForProject,
	laneProjectName,
	laneTimeoutOptions,
	repoRoot,
	serverOnlyAlias,
	sharedVitestConfig,
} from "./vitest.shared";

const payrollRoot = "packages/erp/payroll" as const;

export default defineConfig({
	...sharedVitestConfig,
	test: {
		projects: [
			{
				resolve: {
					alias: serverOnlyAlias,
				},
				test: {
					name: laneProjectName("payroll-parity"),
					root: `${repoRoot}/${payrollRoot}`,
					include: laneIncludeForProject("payroll-parity", payrollRoot),
					environment: "node",
					setupFiles: ["@afenda/testing/setup/database"],
					...laneTimeoutOptions("payroll-parity"),
					fileParallelism: false,
					maxWorkers: 1,
					env: {
						SKIP_ENV_VALIDATION: "true",
					},
				},
			},
		],
	},
});
