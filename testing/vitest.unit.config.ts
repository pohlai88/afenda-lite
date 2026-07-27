import path from "node:path";

import { defineConfig, mergeConfig } from "vitest/config";
import {
	humanResourcesParityIncludes,
	humanResourcesRoot,
	nodeProject,
	nodeProjectWithServerOnly,
	repoRoot,
	serverOnlyAlias,
	sharedVitestConfig,
	TESTS_DIR,
	webAlias,
} from "./vitest.shared";

const authProject = nodeProject(
	"auth",
	path.join(repoRoot, "packages/control-plane/auth"),
);

const humanResourcesUnitProject = nodeProject(
	"human-resources-unit",
	humanResourcesRoot,
);

export default mergeConfig(
	sharedVitestConfig,
	defineConfig({
		test: {
			projects: [
				{
					...authProject,
					test: {
						...authProject.test,
						// Cold dynamic import + Neon mock re-bind under turbo parallel load.
						testTimeout: 30_000,
						// Serial files avoid singleton/mock races (browser-client · rbac).
						fileParallelism: false,
					},
				},
				{
					...nodeProject("db", path.join(repoRoot, "packages/data-plane/db")),
					test: {
						...nodeProject("db", path.join(repoRoot, "packages/data-plane/db"))
							.test,
						maxWorkers: 2,
					},
				},
				nodeProject(
					"admin",
					path.join(repoRoot, "packages/control-plane/admin"),
				),
				nodeProject(
					"errors",
					path.join(repoRoot, "packages/foundation/errors"),
				),
				nodeProject("logger", path.join(repoRoot, "packages/runtime/logger")),
				nodeProject(
					"rate-limit",
					path.join(repoRoot, "packages/runtime/rate-limit"),
				),
				nodeProject("cache", path.join(repoRoot, "packages/runtime/cache")),
				nodeProject("audit", path.join(repoRoot, "packages/data-plane/audit")),
				nodeProject(
					"search",
					path.join(repoRoot, "packages/data-plane/search"),
				),
				nodeProject(
					"notifications",
					path.join(repoRoot, "packages/data-plane/notifications"),
				),
				nodeProject(
					"events",
					path.join(repoRoot, "packages/data-plane/events"),
				),
				nodeProjectWithServerOnly(
					"master-data",
					path.join(repoRoot, "packages/erp/master-data"),
				),
				nodeProjectWithServerOnly(
					"sales",
					path.join(repoRoot, "packages/erp/sales"),
				),
				nodeProjectWithServerOnly(
					"purchasing",
					path.join(repoRoot, "packages/erp/purchasing"),
				),
				nodeProjectWithServerOnly(
					"receiving",
					path.join(repoRoot, "packages/erp/receiving"),
				),
				nodeProjectWithServerOnly(
					"receivables",
					path.join(repoRoot, "packages/erp/receivables"),
				),
				nodeProjectWithServerOnly(
					"payables",
					path.join(repoRoot, "packages/erp/payables"),
				),
				nodeProjectWithServerOnly(
					"payments",
					path.join(repoRoot, "packages/erp/payments"),
				),
				nodeProjectWithServerOnly(
					"accounting",
					path.join(repoRoot, "packages/erp/accounting"),
				),
				{
					...humanResourcesUnitProject,
					resolve: {
						alias: serverOnlyAlias,
					},
					test: {
						...humanResourcesUnitProject.test,
						exclude: humanResourcesParityIncludes,
						fileParallelism: true,
						maxWorkers: 2,
					},
				},
				nodeProjectWithServerOnly(
					"payroll",
					path.join(repoRoot, "packages/erp/payroll"),
				),
				nodeProjectWithServerOnly(
					"corporate-administration",
					path.join(repoRoot, "packages/erp/corporate-administration"),
				),
				nodeProjectWithServerOnly(
					"fulfillment",
					path.join(repoRoot, "packages/erp/fulfillment"),
				),
				nodeProjectWithServerOnly(
					"inventory",
					path.join(repoRoot, "packages/erp/inventory"),
				),
				nodeProject("http", path.join(repoRoot, "packages/runtime/http")),
				nodeProject(
					"security",
					path.join(repoRoot, "packages/runtime/security"),
				),
				nodeProject("metrics", path.join(repoRoot, "packages/runtime/metrics")),
				nodeProject("openapi", path.join(repoRoot, "packages/runtime/openapi")),
				nodeProject(
					"ai-the-machine",
					path.join(repoRoot, "packages/intelligence/ai-the-machine"),
				),
				nodeProject("emails", path.join(repoRoot, "packages/surfaces/emails")),
				{
					test: {
						name: "env",
						root: path.join(repoRoot, "packages/foundation/env"),
						include: [`${TESTS_DIR}/**/*.test.ts`],
						environment: "node",
						maxWorkers: 1,
						env: {
							SKIP_ENV_VALIDATION: "true",
						},
					},
				},
				nodeProject(
					"ui-system",
					path.join(repoRoot, "packages/surfaces/ui-system"),
				),
				nodeProject("docs", path.join(repoRoot, "apps/docs")),
				{
					resolve: {
						alias: {
							...webAlias,
							...serverOnlyAlias,
						},
					},
					test: {
						name: "web",
						root: path.join(repoRoot, "apps/web"),
						include: [`${TESTS_DIR}/**/*.test.ts`],
						environment: "node",
						testTimeout: 15_000,
						hookTimeout: 30_000,
						maxWorkers: 2,
						env: {
							SKIP_ENV_VALIDATION: "true",
						},
					},
				},
			],
		},
	}),
);
