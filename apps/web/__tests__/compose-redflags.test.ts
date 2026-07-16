/**
 * Compose red-flag gates — keep regexes aligned with
 * `.cursor/skills/afenda-elite-ui-compose/reference.md` forbidden table.
 * Auth island paths are allowlisted (negative control).
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const SKIP_DIRS = new Set(["node_modules", ".next", ".turbo", "__tests__"]);

/** Relative POSIX-ish paths under apps/web that are Neon Auth island. */
const AUTH_ISLAND_PREFIXES = [
	"app/(public)/auth/",
	"app/(public)/join/layout.tsx",
	"app/(public)/join/loading.tsx",
	"app/(public)/join/error.tsx",
	"features/auth/auth-surface-chrome.tsx",
	"features/auth/auth-view-shell.tsx",
	"features/auth/join-shell.tsx",
];

function toRel(fullPath: string): string {
	return path.relative(webRoot, fullPath).split(path.sep).join("/");
}

function isAuthIsland(rel: string): boolean {
	return AUTH_ISLAND_PREFIXES.some(
		(prefix) => rel === prefix || rel.startsWith(prefix),
	);
}

function collectTsx(dir: string): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(dir)) {
		if (SKIP_DIRS.has(entry)) {
			continue;
		}
		const fullPath = path.join(dir, entry);
		if (statSync(fullPath).isDirectory()) {
			files.push(...collectTsx(fullPath));
		} else if (/\.tsx$/.test(entry)) {
			files.push(fullPath);
		}
	}
	return files;
}

function productTsx(): { rel: string; src: string }[] {
	return collectTsx(webRoot)
		.map((full) => ({ rel: toRel(full), src: readFileSync(full, "utf8") }))
		.filter(({ rel }) => !isAuthIsland(rel));
}

describe("@afenda/web compose red-flags (afenda-elite-ui-compose)", () => {
	it("F1 — no fake primary CTA stacks (inline-flex + h-9 + bg-primary)", () => {
		const re = /inline-flex[\s\S]{0,80}h-9[\s\S]{0,80}bg-primary/;
		const offenders = productTsx()
			.filter(({ src }) => re.test(src))
			.map(({ rel }) => rel);
		expect(offenders, `F1 fake CTAs: ${offenders}`).toEqual([]);
	});

	it("F2 — no page-shell p-8 in product TSX", () => {
		const offenders = productTsx()
			.filter(({ src }) => /\bp-8\b/.test(src))
			.map(({ rel }) => rel);
		expect(offenders, `F2 p-8 shells: ${offenders}`).toEqual([]);
	});

	it("F3 — no rogue page title sizes", () => {
		const re = /text-(?:3xl|4xl|5xl)|text-xl font-semibold/;
		const offenders = productTsx()
			.filter(({ src }) => re.test(src))
			.map(({ rel }) => rel);
		expect(offenders, `F3 rogue titles: ${offenders}`).toEqual([]);
	});

	it("F4 — no bordered tabular ul (divide-y + rounded-md border)", () => {
		const re = /<ul[^>]*className="[^"]*divide-[^"]*border[^"]*"/;
		const reAlt = /<ul[^>]*className="[^"]*rounded-md border[^"]*divide/;
		const offenders = productTsx()
			.filter(({ src }) => re.test(src) || reAlt.test(src))
			.map(({ rel }) => rel);
		expect(offenders, `F4 bordered ul lists: ${offenders}`).toEqual([]);
	});

	it("F5 — loading copy requires Spinner or Skeleton import", () => {
		const loadingRe = /Loading[….…]/;
		const offenders = productTsx()
			.filter(({ src }) => {
				if (!loadingRe.test(src)) {
					return false;
				}
				const hasSpinner = /Spinner/.test(src);
				const hasSkeleton = /Skeleton/.test(src);
				return !hasSpinner && !hasSkeleton;
			})
			.map(({ rel }) => rel);
		expect(offenders, `F5 plain loading: ${offenders}`).toEqual([]);
	});

	it("F6 — no deep @afenda/ui-system paths or retired @afenda/ui", () => {
		const deep = /@afenda\/ui-system\/(?!styles\.css)/;
		const retired = /@afenda\/ui(?![\w-])/;
		const offenders: string[] = [];
		for (const { rel, src } of productTsx()) {
			if (deep.test(src) || retired.test(src)) {
				offenders.push(rel);
			}
		}
		expect(offenders, `F6 bad imports: ${offenders}`).toEqual([]);
	});

	it("F7 — no parallel apps/web/components/ui tree", () => {
		expect(existsSync(path.join(webRoot, "components", "ui"))).toBe(false);
	});

	it("F8 — auth-surface.css only imported from allowlisted island paths", () => {
		const offenders: string[] = [];
		for (const full of collectTsx(webRoot)) {
			const rel = toRel(full);
			const src = readFileSync(full, "utf8");
			if (!src.includes("auth-surface.css")) {
				continue;
			}
			if (isAuthIsland(rel) || rel.endsWith("auth-surface.css")) {
				continue;
			}
			// join layout is allowlisted via prefix
			if (rel === "app/(public)/join/layout.tsx") {
				continue;
			}
			offenders.push(rel);
		}
		// also scan css/ts that import
		for (const full of collectTsx(webRoot)) {
			void full;
		}
		const allFiles: string[] = [];
		const walk = (dir: string) => {
			for (const entry of readdirSync(dir)) {
				if (SKIP_DIRS.has(entry)) continue;
				const fullPath = path.join(dir, entry);
				if (statSync(fullPath).isDirectory()) walk(fullPath);
				else if (/\.(tsx|ts|css)$/.test(entry)) allFiles.push(fullPath);
			}
		};
		walk(webRoot);
		const cssOffenders: string[] = [];
		for (const full of allFiles) {
			const rel = toRel(full);
			const src = readFileSync(full, "utf8");
			if (!/auth-surface\.css/.test(src)) continue;
			if (
				isAuthIsland(rel) ||
				rel === "app/(public)/auth/auth-surface.css" ||
				rel === "app/(public)/join/layout.tsx"
			) {
				continue;
			}
			cssOffenders.push(rel);
		}
		expect(cssOffenders, `F8 auth CSS leak: ${cssOffenders}`).toEqual([]);
		expect(offenders).toEqual([]);
	});
});
