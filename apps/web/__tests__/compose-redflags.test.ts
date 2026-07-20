/**
 * Compose red-flag gates — keep regexes aligned with
 * `.cursor/skills/afenda-elite-ui-compose/reference.md` forbidden table.
 * Auth island paths are allowlisted (negative control).
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { isAuthIsland, productTsx, toRel, webAppRoot } from "./compose-scan";

const webRoot = webAppRoot();
const SKIP_DIRS = new Set(["node_modules", ".next", ".turbo", "__tests__"]);

describe("@afenda/web compose red-flags (afenda-elite-ui-compose)", () => {
	it("F1 — no fake primary CTA stacks (inline-flex + h-9 + bg-primary)", () => {
		const re = /inline-flex[\s\S]{0,80}h-9[\s\S]{0,80}bg-primary/;
		const offenders = productTsx()
			.filter(({ src }) => re.test(src))
			.map(({ rel }) => rel);
		expect(
			offenders,
			`F1 reason=fake primary CTA (inline-flex+h-9+bg-primary); paths: ${offenders.join(", ") || "(none)"}`,
		).toEqual([]);
	});

	it("F2 — no page-shell p-8 in product TSX", () => {
		const offenders = productTsx()
			.filter(({ src }) => /\bp-8\b/.test(src))
			.map(({ rel }) => rel);
		expect(
			offenders,
			`F2 reason=page-shell p-8; paths: ${offenders.join(", ") || "(none)"}`,
		).toEqual([]);
	});

	it("F3 — no rogue page title sizes", () => {
		const re = /text-(?:3xl|4xl|5xl)|text-xl font-semibold/;
		const offenders = productTsx()
			.filter(({ src }) => re.test(src))
			.map(({ rel }) => rel);
		expect(
			offenders,
			`F3 reason=rogue page title size; paths: ${offenders.join(", ") || "(none)"}`,
		).toEqual([]);
	});

	it("F4 — no bordered tabular ul (divide-y + rounded-md border)", () => {
		const ulClass = /<ul[^>]*className="([^"]*)"/g;
		const offenders = productTsx()
			.filter(({ src }) => {
				for (const match of src.matchAll(ulClass)) {
					const tokens = (match[1] ?? "").split(/\s+/).filter(Boolean);
					const hasDivide = tokens.some((t) => t.startsWith("divide-"));
					// Exact `border` utility only — not `divide-border` / `border-*` colors.
					const hasBoxBorder = tokens.includes("border");
					if (hasDivide && hasBoxBorder) {
						return true;
					}
				}
				return false;
			})
			.map(({ rel }) => rel);
		expect(
			offenders,
			`F4 reason=bordered tabular ul (use DataTable); paths: ${offenders.join(", ") || "(none)"}`,
		).toEqual([]);
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
		expect(
			offenders,
			`F5 reason=plain loading copy without Spinner/Skeleton; paths: ${offenders.join(", ") || "(none)"}`,
		).toEqual([]);
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
		expect(
			offenders,
			`F6 reason=deep or retired UI import; paths: ${offenders.join(", ") || "(none)"}`,
		).toEqual([]);
	});

	it("F7 — no parallel apps/web/components/ui tree", () => {
		expect(existsSync(path.join(webRoot, "components", "ui"))).toBe(false);
	});

	it("F8 — auth-surface.css only imported from allowlisted island paths", () => {
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

		const offenders: string[] = [];
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
			offenders.push(rel);
		}
		expect(
			offenders,
			`F8 reason=auth-surface.css outside island allowlist; paths: ${offenders.join(", ") || "(none)"}`,
		).toEqual([]);
	});
});
