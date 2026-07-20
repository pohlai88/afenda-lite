import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);

/** L0/L2 Vitest specs live only under `<package|app>/__tests__/`. */
const TESTS_DIR = "__tests__";

const testingAlias = {
	"@afenda/testing": path.join(repoRoot, "testing"),
};

const nodeProject = (name: string, root: string) => ({
	resolve: {
		alias: testingAlias,
	},
	test: {
		name,
		root,
		include: [`${TESTS_DIR}/**/*.test.ts`],
		environment: "node" as const,
		env: {
			SKIP_ENV_VALIDATION: "true",
		},
	},
});

const authProject = nodeProject("auth", path.join(repoRoot, "packages/control-plane/auth"));

export default defineConfig({
	root: repoRoot,
	test: {
		environment: "node",
		passWithNoTests: true,
		env: {
			SKIP_ENV_VALIDATION: "true",
		},
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
			nodeProject("db", path.join(repoRoot, "packages/data-plane/db")),
			nodeProject("admin", path.join(repoRoot, "packages/control-plane/admin")),
			nodeProject("errors", path.join(repoRoot, "packages/foundation/errors")),
			nodeProject("logger", path.join(repoRoot, "packages/runtime/logger")),
			nodeProject("rate-limit", path.join(repoRoot, "packages/runtime/rate-limit")),
			nodeProject("cache", path.join(repoRoot, "packages/runtime/cache")),
			nodeProject("audit", path.join(repoRoot, "packages/data-plane/audit")),
			nodeProject("search", path.join(repoRoot, "packages/data-plane/search")),
			nodeProject(
				"notifications",
				path.join(repoRoot, "packages/data-plane/notifications"),
			),
			nodeProject("events", path.join(repoRoot, "packages/data-plane/events")),
			{
				...nodeProject(
					"master-data",
					path.join(repoRoot, "packages/erp/master-data"),
				),
				resolve: {
					alias: {
						...testingAlias,
						"server-only": path.join(repoRoot, "testing/empty-server-only.ts"),
					},
				},
			},
			{
				...nodeProject("sales", path.join(repoRoot, "packages/erp/sales")),
				resolve: {
					alias: {
						...testingAlias,
						"server-only": path.join(repoRoot, "testing/empty-server-only.ts"),
					},
				},
			},
			nodeProject("http", path.join(repoRoot, "packages/runtime/http")),
			nodeProject("security", path.join(repoRoot, "packages/runtime/security")),
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
					env: {
						SKIP_ENV_VALIDATION: "true",
					},
				},
			},
			nodeProject("ui-system", path.join(repoRoot, "packages/surfaces/ui-system")),
			nodeProject("docs", path.join(repoRoot, "apps/docs")),
			{
				resolve: {
					alias: {
						"@": path.join(repoRoot, "apps/web"),
						"server-only": path.join(repoRoot, "testing/empty-server-only.ts"),
						...testingAlias,
					},
				},
				test: {
					name: "web",
					root: path.join(repoRoot, "apps/web"),
					include: [`${TESTS_DIR}/**/*.test.ts`],
					environment: "node" as const,
					// Cold import / Neon SELECT under turbo parallel load can exceed 5s.
					testTimeout: 15_000,
					env: {
						SKIP_ENV_VALIDATION: "true",
					},
				},
			},
			{
				plugins: [react()],
				resolve: {
					alias: {
						"@": path.join(repoRoot, "apps/web"),
						...testingAlias,
					},
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
					env: {
						SKIP_ENV_VALIDATION: "true",
					},
				},
			},
		],
	},
});
