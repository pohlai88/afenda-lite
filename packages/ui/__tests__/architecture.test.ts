import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testsDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(testsDir, "..");
const src = join(packageRoot, "src");

function sourceFiles(directory: string): string[] {
	if (!existsSync(directory)) return [];
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) return sourceFiles(path);
		return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
	});
}

function contents(directory: string) {
	return sourceFiles(directory).map((path) => ({
		path,
		content: readFileSync(path, "utf8"),
	}));
}

describe("@afenda/ui architecture", () => {
	it("does not retain migrated runtime directories", () => {
		for (const directory of [
			"views",
			"seed-db",
			"store",
			"contexts",
			"utils",
			"types",
		]) {
			expect(existsSync(join(src, directory)), directory).toBe(false);
		}
	});

	it("keeps primitives independent from blocks, stores, and providers", () => {
		for (const file of contents(join(src, "components", "ui"))) {
			expect(file.content, file.path).not.toMatch(
				/(?:blocks|stores|providers)\//,
			);
		}
	});

	it("keeps blocks free of seed data and browser persistence", () => {
		for (const file of contents(join(src, "blocks"))) {
			expect(file.content, file.path).not.toMatch(
				/seed-db|localStorage|document\.cookie/,
			);
		}
	});

	it("keeps store implementations free of rendered components", () => {
		for (const file of contents(join(src, "stores")).filter(({ path }) =>
			path.endsWith("-store.ts"),
		)) {
			expect(file.content, file.path).not.toMatch(/components\//);
		}
	});

	it("exposes only the explicit package surface", () => {
		const packageJson = JSON.parse(
			readFileSync(join(packageRoot, "package.json"), "utf8"),
		) as { exports: Record<string, unknown> };
		expect(packageJson.exports).not.toHaveProperty("./views/*");
		expect(packageJson.exports).not.toHaveProperty("./seed-db/*");
		expect(packageJson.exports).not.toHaveProperty("./store/*");
		expect(packageJson.exports).toHaveProperty("./providers");
		expect(packageJson.exports).toHaveProperty("./stores/*");
		expect(packageJson.exports).toHaveProperty("./blocks/*");
	});
});
