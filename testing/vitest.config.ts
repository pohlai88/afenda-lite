import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);

export default defineConfig({
	root: repoRoot,
	test: {
		environment: "node",
		env: {
			SKIP_ENV_VALIDATION: "true",
		},
		projects: [
			{
				test: {
					name: "auth",
					root: path.join(repoRoot, "packages/auth"),
					include: ["src/**/*.test.ts"],
					environment: "node",
				},
			},
			{
				test: {
					name: "db",
					root: path.join(repoRoot, "packages/db"),
					include: ["src/**/*.test.ts"],
					environment: "node",
				},
			},
			{
				test: {
					name: "emails",
					root: path.join(repoRoot, "packages/emails"),
					include: ["src/**/*.test.ts"],
					environment: "node",
				},
			},
			{
				test: {
					name: "env",
					root: path.join(repoRoot, "packages/env"),
					include: ["src/**/*.test.ts"],
					environment: "node",
					env: {
						SKIP_ENV_VALIDATION: "true",
					},
				},
			},
			{
				test: {
					name: "ui",
					root: path.join(repoRoot, "packages/ui"),
					include: ["src/**/*.test.ts"],
					environment: "node",
				},
			},
			{
				test: {
					name: "web",
					root: path.join(repoRoot, "apps/web"),
					include: ["**/*.test.ts"],
					environment: "node",
				},
			},
		],
	},
});
