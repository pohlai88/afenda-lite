import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageDirectory = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const sourceDirectory = path.join(packageDirectory, "src");
const featureDirectory = path.join(sourceDirectory, "features");

function typescriptFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((entry) => {
		const target = path.join(directory, entry);
		if (statSync(target).isDirectory()) {
			return typescriptFiles(target);
		}
		return target.endsWith(".ts") ? [target] : [];
	});
}

function localImportTargets(file: string): string[] {
	const source = readFileSync(file, "utf8");
	return Array.from(
		source.matchAll(/(?:from\s+|import\s+)["'](\.\.?\/[^"']+)["']/g),
		(match) => path.resolve(path.dirname(file), match[1] ?? ""),
	);
}

describe("Corporate Administration feature-first architecture", () => {
	it("keeps only the permanent facade and approved ownership roots", () => {
		const rootEntries = readdirSync(sourceDirectory).sort();
		expect(rootEntries).toEqual([
			"composition",
			"features",
			"index.ts",
			"kernel",
			"testing",
		]);
	});

	it("keeps features independent from facade, composition, testing, and sibling features", () => {
		const findings = typescriptFiles(featureDirectory).flatMap((file) => {
			const [owningFeature] = path
				.relative(featureDirectory, file)
				.split(path.sep);
			return localImportTargets(file).flatMap((target) => {
				const relative = path.relative(sourceDirectory, target);
				const segments = relative.split(path.sep);
				const importsForbiddenRoot = [
					"composition",
					"testing",
					"index",
				].includes(segments[0]?.replace(/\.ts$/, "") ?? "");
				const importsSiblingFeature =
					segments[0] === "features" &&
					segments[1] !== owningFeature &&
					segments.at(-1) !== "capabilities";
				return importsForbiddenRoot || importsSiblingFeature
					? [
							`${path.relative(packageDirectory, file)} -> ${path.relative(packageDirectory, target)}`,
						]
					: [];
			});
		});

		expect(findings).toEqual([]);
	});

	it("keeps feature-owned store contracts and adapters inside each capsule", () => {
		for (const feature of readdirSync(featureDirectory)) {
			const directory = path.join(featureDirectory, feature);
			if (!statSync(directory).isDirectory()) {
				continue;
			}
			expect(existsSync(path.join(directory, "store.ts"))).toBe(true);
			expect(existsSync(path.join(directory, "adapters"))).toBe(true);
		}
	});

	it("keeps adapter exports owned by composition", () => {
		const adapterIndex = readFileSync(
			path.join(
				sourceDirectory,
				"composition",
				"adapters",
				"drizzle",
				"index.ts",
			),
			"utf8",
		);

		expect(adapterIndex).not.toMatch(
			/export\s+[^;]*\sfrom\s+["'][^"']*features\//,
		);
	});
});
