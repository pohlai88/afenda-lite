import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

const packageRoot = join(import.meta.dirname, "..");
const srcRoot = join(packageRoot, "src");

const requiredPackageFiles = [
	"package.json",
	"README.md",
	"tsconfig.json",
	"src/index.ts",
	"src/types.ts",
	"src/module-ids.ts",
	"src/module.manifest.ts",
	"src/permissions.ts",
	"src/authorization.ts",
	"src/command-options.ts",
	"src/parse-input.ts",
	"src/ports.ts",
	"src/contracts/context.ts",
	"src/contracts/reasons.ts",
	"src/capabilities/core-organization-masters/normalized-code.ts",
	"src/capabilities/core-organization-masters/version-cas.ts",
	"src/capabilities/core-organization-masters/lifecycle.ts",
] as const;

const forbiddenSourceImports = [
	/from\s+["']next(?:\/[^"']*)?["']/,
	/from\s+["']@\/[^"']*["']/,
	/from\s+["']apps\/[^"']*["']/,
	/from\s+["'][^"']*\/apps\/[^"']*["']/,
	/from\s+["']@afenda\/(?:sales|purchasing|inventory|receiving|fulfillment|receivables|payables|payments|accounting)(?:\/[^"']*)?["']/,
	/from\s+["']transaction-module(?:\/[^"']*)?["']/,
] as const;

function listSourceFiles(root: string): string[] {
	const entries = readdirSync(root, { withFileTypes: true });
	return entries.flatMap((entry) => {
		const path = join(root, entry.name);
		if (entry.isDirectory()) {
			if (
				entry.name === "node_modules" ||
				entry.name === ".turbo" ||
				entry.name === "dist"
			) {
				return [];
			}
			return listSourceFiles(path);
		}
		return entry.name.endsWith(".ts") ? [path] : [];
	});
}

describe("@afenda/master-data package kernel", () => {
	it("keeps the MD-0.1 scaffold under the package src root", () => {
		for (const file of requiredPackageFiles) {
			expect(existsSync(join(packageRoot, file)), `${file} must exist`).toBe(
				true,
			);
		}
	});

	it("keeps the root barrel server-only and away from raw Drizzle exports", () => {
		const source = readFileSync(join(srcRoot, "index.ts"), "utf8");
		expect(source.startsWith('import "server-only";')).toBe(true);
		expect(source).not.toContain('from "./drizzle-store"');
		expect(source).not.toContain('from "./adapters/drizzle"');
		expect(source).not.toContain("DrizzleMasterDataStore");
	});

	it("keeps package source independent from Next, apps, ERP peers, and transaction-module imports", () => {
		const violations = listSourceFiles(srcRoot).flatMap((file) => {
			const source = readFileSync(file, "utf8");
			return forbiddenSourceImports
				.filter((pattern) => pattern.test(source))
				.map((pattern) => ({
					file: relative(packageRoot, file),
					pattern: pattern.source,
				}));
		});
		expect(violations).toEqual([]);
	});

	it("keeps capabilities as a single implementation directory", () => {
		const duplicateCapabilitiesRoots = listSourceFiles(packageRoot)
			.map((file) => relative(packageRoot, file).split(sep))
			.filter((parts) => parts.includes("capabilities"))
			.map((parts) =>
				parts.slice(0, parts.indexOf("capabilities") + 1).join("/"),
			)
			.filter((root, index, roots) => roots.indexOf(root) === index)
			.filter((root) => root !== "src/capabilities");

		expect(duplicateCapabilitiesRoots).toEqual([]);
	});
});
