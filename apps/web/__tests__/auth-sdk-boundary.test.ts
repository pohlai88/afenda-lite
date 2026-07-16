/**
 * N5 — Neon Auth SDK boundary (ARCH-026).
 *
 * `@neondatabase/auth` stays inside `@afenda/auth`. Apps/web may use
 * `@neondatabase/auth-ui` for forms. Client Components must import path/client
 * helpers via `@afenda/auth/client`, never the server barrel.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const bffRouteRelative = "app/api/auth/[...path]/route.ts";

const SKIP_DIRS = new Set(["node_modules", ".next", ".turbo", "__tests__"]);

/** Direct Neon Auth SDK import (not auth-ui). */
const NEON_AUTH_SDK_IMPORT =
	/(?:from|import)\s*['"]@neondatabase\/auth(?:\/[\w.\-/]+)?['"]/g;

/** Root barrel import of `@afenda/auth` (not `/client`). */
const AFENDA_AUTH_ROOT_IMPORT = /(?:from|import)\s*['"]@afenda\/auth['"]/g;

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

function hasUseClientDirective(source: string): boolean {
	return /^\s*["']use client["']\s*;?/m.test(source);
}

describe("@afenda/web Neon Auth SDK boundary (N5)", () => {
	it("never imports @neondatabase/auth SDK (auth-ui only)", () => {
		const offenders: string[] = [];
		for (const file of collectSourceFiles(webRoot)) {
			const source = readFileSync(file, "utf-8");
			for (const match of source.match(NEON_AUTH_SDK_IMPORT) ?? []) {
				offenders.push(`${toRepoPath(file)} -> ${match}`);
			}
		}
		expect(offenders).toEqual([]);
	});

	it("Client Components import @afenda/auth/client, not the server barrel", () => {
		const offenders: string[] = [];
		for (const file of collectSourceFiles(webRoot)) {
			const source = readFileSync(file, "utf-8");
			if (!hasUseClientDirective(source)) continue;
			for (const match of source.match(AFENDA_AUTH_ROOT_IMPORT) ?? []) {
				offenders.push(`${toRepoPath(file)} -> ${match}`);
			}
		}
		expect(offenders).toEqual([]);
	});

	it("BFF route wires createAuthApiHandlers from @afenda/auth", () => {
		const routePath = path.join(webRoot, bffRouteRelative);
		const source = readFileSync(routePath, "utf-8");
		expect(source).toMatch(
			/import\s*\{\s*createAuthApiHandlers\s*\}\s*from\s*["']@afenda\/auth["']/,
		);
		expect(source).toMatch(
			/export\s+const\s*\{\s*GET\s*,\s*POST\s*\}\s*=\s*createAuthApiHandlers\s*\(\s*\)/,
		);
	});
});
