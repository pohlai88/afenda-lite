import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const packageRoot = join(import.meta.dirname, "..");
const sourceRoot = join(packageRoot, "src");

function typescriptFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((entry) => {
		const path = join(directory, entry);
		if (statSync(path).isDirectory()) {
			return typescriptFiles(path);
		}
		return entry.endsWith(".ts") ? [path] : [];
	});
}

describe("@afenda/master-data tenant loader architecture", () => {
	it("forbids tenant-owned Drizzle ID predicates without a nearby organization predicate", () => {
		const violations: string[] = [];

		for (const file of typescriptFiles(sourceRoot)) {
			const lines = readFileSync(file, "utf8").split(/\r?\n/);
			for (const [index, line] of lines.entries()) {
				for (const match of line.matchAll(/eq\((md[A-Za-z]+)\.id,/g)) {
					const [, table] = match;
					if (table === undefined) {
						continue;
					}
					const window = lines
						.slice(Math.max(0, index - 12), index + 13)
						.join("\n");
					const organizationPredicate = new RegExp(
						`eq\\(\\s*${table}\\.organizationId\\s*,`,
					);
					if (!organizationPredicate.test(window)) {
						violations.push(
							`${relative(packageRoot, file)}:${index + 1}: ${line.trim()}`,
						);
					}
				}
			}
		}

		expect(violations).toEqual([]);
	});

	it("uses the shared predicate for entity loaders and has no post-load tenant rejection", () => {
		const drizzleStore = readFileSync(
			join(sourceRoot, "drizzle-store.ts"),
			"utf8",
		);
		const variantMutations = readFileSync(
			join(
				sourceRoot,
				"capabilities/extensions/adapters/drizzle/variant-mutations.ts",
			),
			"utf8",
		);
		const loaderSources = `${drizzleStore}\n${variantMutations}`;

		expect(
			loaderSources.match(/tenantEntityPredicate\(/g)?.length,
		).toBeGreaterThanOrEqual(9);
		expect(loaderSources).not.toMatch(
			/(?:row|rawRow|existing)\.organizationId\s*!==/,
		);
		expect(loaderSources).not.toMatch(/\.where\(eq\(md[A-Za-z]+\.id,/);
	});
});
