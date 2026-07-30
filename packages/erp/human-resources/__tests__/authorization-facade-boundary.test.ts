/**
 * Slice 2.10 — domain code must not bypass the contextual authorization facade.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const packageRoot = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const srcRoot = path.join(packageRoot, "src");

const SKIP_DIRS = new Set(["node_modules", ".next", ".turbo"]);

const FORBIDDEN_IMPORTS = [
	"../authorization",
	"./authorization",
	"../employee-relations/case-access-control",
	"./case-access-control",
] as const;

const ALLOWED_RELATIVE_PATHS = new Set([
	"shared/contextual-authorization.ts",
	"employee-relations/case-authorization-policy.ts",
]);

function collectSourceFiles(dir: string): string[] {
	if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
		return [];
	}
	const files: string[] = [];
	for (const entry of readdirSync(dir)) {
		if (SKIP_DIRS.has(entry)) {
			continue;
		}
		const fullPath = path.join(dir, entry);
		const stats = statSync(fullPath);
		if (stats.isDirectory()) {
			files.push(...collectSourceFiles(fullPath));
			continue;
		}
		if (/\.ts$/.test(entry)) {
			files.push(fullPath);
		}
	}
	return files;
}

function toSrcRelative(file: string): string {
	return path.relative(srcRoot, file).replace(/\\/g, "/");
}

function findImportViolations(input: {
	root: string;
	forbiddenImports: readonly string[];
	allowedFiles: readonly string[];
}): string[] {
	const allowed = new Set(input.allowedFiles);
	const violations: string[] = [];

	for (const file of collectSourceFiles(input.root)) {
		const relative = toSrcRelative(file);
		if (allowed.has(relative)) {
			continue;
		}

		const source = readFileSync(file, "utf8");
		for (const forbidden of input.forbiddenImports) {
			const pattern = new RegExp(
				String.raw`(from|export\s+\*\s+from)\s+["']${forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`,
				"g",
			);
			const matches = source.match(pattern);
			if (matches === null) {
				continue;
			}
			for (const match of matches) {
				violations.push(`${relative} -> ${match.trim()}`);
			}
		}
	}

	return violations.toSorted((left, right) => left.localeCompare(right));
}

function findForbiddenSourceMarkers(input: {
	files: readonly string[];
	markers: readonly string[];
}): string[] {
	const violations: string[] = [];
	for (const relative of input.files) {
		const source = readFileSync(path.join(srcRoot, relative), "utf8");
		for (const marker of input.markers) {
			if (source.includes(marker)) {
				violations.push(`${relative} -> ${marker}`);
			}
		}
	}
	return violations.toSorted((left, right) => left.localeCompare(right));
}

describe("@afenda/human-resources authorization facade boundary (Slice 2.10)", () => {
	it("does not allow domains to bypass the authorization facade", () => {
		const violations = findImportViolations({
			root: srcRoot,
			forbiddenImports: FORBIDDEN_IMPORTS,
			allowedFiles: [...ALLOWED_RELATIVE_PATHS],
		});

		expect(violations).toEqual([]);
	});

	it("does not allow talent domain files to import subject-aware authorization", () => {
		const violations = findImportViolations({
			root: path.join(srcRoot, "talent"),
			forbiddenImports: [
				"../shared/subject-aware-authorization",
				"./subject-aware-authorization",
			],
			allowedFiles: [],
		});

		expect(violations).toEqual([]);
	});

	it("does not allow WFP or compensation runners to restore parity shells", () => {
		const violations = findForbiddenSourceMarkers({
			files: [
				"shared/workforce-planning-command.ts",
				"shared/compensation-command.ts",
			],
			markers: [
				"parityResourceKind",
				"createParityResourceShell",
				"privilegedActor",
			],
		});

		expect(violations).toEqual([]);
	});
});
