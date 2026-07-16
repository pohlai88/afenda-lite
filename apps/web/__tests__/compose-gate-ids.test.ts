/**
 * Risk A — prevent reference.md ↔ Vitest gate ID drift (afenda-elite-ui-compose).
 * Checks declared IDs only (F1–F8, C1–C3); does not parse full prose.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.join(webRoot, "..", "..");
const referencePath = path.join(
	repoRoot,
	".cursor",
	"skills",
	"afenda-elite-ui-compose",
	"reference.md",
);
const redflagsPath = path.join(
	webRoot,
	"__tests__",
	"compose-redflags.test.ts",
);
const suitabilityPath = path.join(
	webRoot,
	"__tests__",
	"compose-suitability.test.ts",
);
const exportNamingPath = path.join(
	repoRoot,
	"packages",
	"ui-system",
	"__tests__",
	"export-naming.test.ts",
);

const EXPECTED_F = ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8"] as const;
const EXPECTED_C = ["C1", "C2", "C3"] as const;

/** Table cells like `| F1 |` or `| C2 |` in reference.md */
function idsFromReferenceTables(src: string, prefix: "F" | "C"): string[] {
	const re = new RegExp(`^\\|\\s*(${prefix}\\d+)\\s*\\|`, "gm");
	const found = new Set<string>();
	for (const match of src.matchAll(re)) {
		const id = match[1];
		if (id) {
			found.add(id);
		}
	}
	return [...found].sort();
}

/** Vitest titles like `it("F1 — …")` or `it("C2 — …")` */
function idsFromTestTitles(src: string, prefix: "F" | "C"): string[] {
	const re = new RegExp(`\\bit\\(\\s*["'\`](${prefix}\\d+)\\b`, "g");
	const found = new Set<string>();
	for (const match of src.matchAll(re)) {
		const id = match[1];
		if (id) {
			found.add(id);
		}
	}
	return [...found].sort();
}

describe("@afenda/web compose gate IDs (reference ↔ Vitest)", () => {
	it("reference.md and compose-redflags declare the same F1–F8 set", () => {
		expect(existsSync(referencePath), `missing ${referencePath}`).toBe(true);
		expect(existsSync(redflagsPath), `missing ${redflagsPath}`).toBe(true);

		const reference = readFileSync(referencePath, "utf8");
		const redflags = readFileSync(redflagsPath, "utf8");

		const fromRef = idsFromReferenceTables(reference, "F");
		const fromTests = idsFromTestTitles(redflags, "F");

		expect(fromRef, `reference F* IDs: ${fromRef.join(",")}`).toEqual([
			...EXPECTED_F,
		]);
		expect(fromTests, `redflags F* IDs: ${fromTests.join(",")}`).toEqual([
			...EXPECTED_F,
		]);
		expect(fromRef).toEqual(fromTests);
	});

	it("reference.md and compose-suitability declare the same C1–C3 set", () => {
		expect(existsSync(suitabilityPath), `missing ${suitabilityPath}`).toBe(
			true,
		);

		const reference = readFileSync(referencePath, "utf8");
		const suitability = readFileSync(suitabilityPath, "utf8");

		const fromRef = idsFromReferenceTables(reference, "C");
		const fromTests = idsFromTestTitles(suitability, "C");

		expect(fromRef, `reference C* IDs: ${fromRef.join(",")}`).toEqual([
			...EXPECTED_C,
		]);
		expect(fromTests, `suitability C* IDs: ${fromTests.join(",")}`).toEqual([
			...EXPECTED_C,
		]);
		expect(fromRef).toEqual(fromTests);
	});

	it("reference.md points at export-naming.test.ts and the file exists", () => {
		const reference = readFileSync(referencePath, "utf8");
		expect(reference).toMatch(/export-naming\.test\.ts/);
		expect(existsSync(exportNamingPath), `missing ${exportNamingPath}`).toBe(
			true,
		);
	});
});
