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

const nodeProject = (name: string, root: string) => ({
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

export default defineConfig({
	root: repoRoot,
	test: {
		environment: "node",
		passWithNoTests: true,
		env: {
			SKIP_ENV_VALIDATION: "true",
		},
		projects: [
			nodeProject("auth", path.join(repoRoot, "packages/auth")),
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
			nodeProject("ui", path.join(repoRoot, "packages/ui")),
			nodeProject("web", path.join(repoRoot, "apps/web")),
			{
				plugins: [react()],
				test: {
					name: "interaction",
					root: repoRoot,
					include: [
						`apps/web/${TESTS_DIR}/**/*.interaction.test.tsx`,
						`packages/ui/${TESTS_DIR}/**/*.interaction.test.tsx`,
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
