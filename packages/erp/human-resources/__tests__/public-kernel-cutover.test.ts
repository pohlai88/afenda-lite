import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const packageRoot = path.resolve(import.meta.dirname, "..");
const repositoryRoot = path.resolve(packageRoot, "../../..");

function listSourceFiles(root: string): string[] {
	return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
		const absolute = path.join(root, entry.name);
		if (entry.isDirectory()) {
			return listSourceFiles(absolute);
		}
		return /\.(ts|tsx)$/.test(entry.name) && statSync(absolute).isFile()
			? [absolute]
			: [];
	});
}

describe("@afenda/human-resources public kernel cutover", () => {
	it("publishes one production facade and an isolated testing capability", () => {
		const packageJson = JSON.parse(
			readFileSync(path.join(packageRoot, "package.json"), "utf8"),
		) as { exports: Record<string, unknown> };
		expect(Object.keys(packageJson.exports).toSorted()).toEqual([
			".",
			"./testing",
		]);
	});

	it("uses explicit root exports and keeps execution infrastructure private", () => {
		const source = readFileSync(path.join(packageRoot, "src/index.ts"), "utf8");
		expect(source).not.toMatch(/export\s+(?:type\s+)?\*/);
		expect(source).not.toMatch(
			/\b(?:HumanResourcesCommandOptions|HumanResourcesStore|resolveHumanResourcesStore|createDrizzle\w+|createMemory\w+)\b/,
		);
		expect(source).not.toMatch(
			/\b\w+(?:Store|Port|Adapter|Resolver|CommandOptions)\b/,
		);
	});

	it("prevents product consumers from importing HR implementation subpaths", () => {
		const webRoot = path.join(repositoryRoot, "apps/web");
		const violations = listSourceFiles(webRoot)
			.filter((file) => !file.includes(`${path.sep}__tests__${path.sep}`))
			.flatMap((file) => {
				const source = readFileSync(file, "utf8");
				return source.includes("@afenda/human-resources/")
					? [path.relative(repositoryRoot, file).replaceAll("\\", "/")]
					: [];
			});
		expect(violations).toEqual([]);
	});

	it("removes broad command options from application consumers", () => {
		const webRoot = path.join(repositoryRoot, "apps/web");
		const violations = listSourceFiles(webRoot).flatMap((file) => {
			const source = readFileSync(file, "utf8");
			return /\bHumanResourcesCommandOptions\b/.test(source)
				? [path.relative(repositoryRoot, file).replaceAll("\\", "/")]
				: [];
		});
		expect(violations).toEqual([]);
	});
});
