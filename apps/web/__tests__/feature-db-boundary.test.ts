/**
 * GUIDE-018 I2.2 — feature → domain → `@afenda/db` boundary.
 *
 * Features and thin adapters must never import `@afenda/db` (or deep
 * packages/db paths). Org-scoped SQL lives only under each modules
 * context domain folder (ARCH-013 · ARCH-024 · afenda-elite-backend-modules).
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const featuresRoot = path.join(webRoot, "features");
const actionsRoot = path.join(webRoot, "app", "actions");
const modulesRoot = path.join(webRoot, "modules");

const SKIP_DIRS = new Set(["node_modules", ".next", ".turbo"]);

/** Import touch of the db package (not prose comments). */
const DB_IMPORT_SOURCE = String.raw`(?:from|import)\s*['"](?:@afenda\/db(?:\/[\w.\-/]+)?|[\w./@-]*packages\/db[\w./-]*)['"]`;

function dbImportMatches(source: string): string[] {
	return source.match(new RegExp(DB_IMPORT_SOURCE, "g")) ?? [];
}

function collectSourceFiles(dir: string): string[] {
	if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
		return [];
	}
	const files: string[] = [];
	for (const entry of readdirSync(dir)) {
		if (SKIP_DIRS.has(entry)) continue;
		const fullPath = path.join(dir, entry);
		const stats = statSync(fullPath);
		if (stats.isDirectory()) {
			files.push(...collectSourceFiles(fullPath));
		} else if (/\.(ts|tsx)$/.test(entry)) {
			files.push(fullPath);
		}
	}
	return files;
}

function toRepoPath(file: string): string {
	return path.relative(webRoot, file).replace(/\\/g, "/");
}

function findDbImportOffenders(dirs: string[]): string[] {
	const offenders: string[] = [];
	for (const dir of dirs) {
		for (const file of collectSourceFiles(dir)) {
			for (const match of dbImportMatches(readFileSync(file, "utf-8"))) {
				offenders.push(`${toRepoPath(file)} -> ${match}`);
			}
		}
	}
	return offenders;
}

describe("@afenda/web feature → domain → db boundary (I2.2)", () => {
	it("features never import @afenda/db or packages/db internals", () => {
		expect(findDbImportOffenders([featuresRoot])).toEqual([]);
	});

	it("app/actions adapters never import @afenda/db (no SQL in adapters)", () => {
		expect(findDbImportOffenders([actionsRoot])).toEqual([]);
	});

	it("only modules domain folders may import @afenda/db under apps/web", () => {
		const offenders: string[] = [];
		for (const file of collectSourceFiles(modulesRoot)) {
			const relative = toRepoPath(file);
			const matches = dbImportMatches(readFileSync(file, "utf-8"));
			if (matches.length === 0) continue;
			if (/\/domain\//.test(relative)) continue;
			for (const match of matches) {
				offenders.push(`${relative} -> ${match}`);
			}
		}
		expect(offenders).toEqual([]);
	});

	it("domain ports that touch db exist (feature → domain path is real)", () => {
		const domainDbImporters = collectSourceFiles(modulesRoot).filter((file) => {
			const relative = toRepoPath(file);
			if (!/\/domain\//.test(relative)) return false;
			return dbImportMatches(readFileSync(file, "utf-8")).length > 0;
		});
		expect(domainDbImporters.length).toBeGreaterThan(0);
	});
});
