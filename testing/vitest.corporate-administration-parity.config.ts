import { defineConfig } from "vitest/config";

import {
	laneIncludeForProject,
	laneProjectName,
	laneTimeoutOptions,
	repoRoot,
	serverOnlyAlias,
	sharedVitestConfig,
} from "./vitest.shared";

const corporateAdministrationRoot =
	"packages/erp/corporate-administration" as const;

export default defineConfig({
	...sharedVitestConfig,
	test: {
		projects: [
			{
				resolve: {
					alias: serverOnlyAlias,
				},
				test: {
					name: laneProjectName("corporate-administration-parity"),
					root: `${repoRoot}/${corporateAdministrationRoot}`,
					include: laneIncludeForProject(
						"corporate-administration-parity",
						corporateAdministrationRoot,
					),
					environment: "node",
					...laneTimeoutOptions("corporate-administration-parity"),
					fileParallelism: false,
					maxWorkers: 1,
				},
			},
		],
	},
});
