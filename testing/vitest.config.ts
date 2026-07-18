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

const authProject = nodeProject("auth", path.join(repoRoot, "packages/auth"));

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
			nodeProject("db", path.join(repoRoot, "packages/db")),
			nodeProject("emails", path.join(repoRoot, "packages/emails")),
			{
				test: {
					name: "env",
					root: path.join(repoRoot, "packages/env"),
					include: [`${TESTS_DIR}/**/*.test.ts`],
					environment: "node",
					env: {
						SKIP_ENV_VALIDATION: "true",
					},
				},
			},
			nodeProject("ui-system", path.join(repoRoot, "packages/ui-system")),
			{
				resolve: {
					alias: {
						"@": path.join(repoRoot, "apps/web"),
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
						`packages/ui-system/${TESTS_DIR}/**/*.interaction.test.tsx`,
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
