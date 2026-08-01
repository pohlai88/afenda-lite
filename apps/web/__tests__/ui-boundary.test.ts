/**
 * UI boundary — proves `@afenda/ui-system` is the sole runtime door for UI in
 * @afenda/web: the flat barrel (`@afenda/ui-system`) and its stylesheet
 * (`@afenda/ui-system/styles.css` and `@afenda/ui-system/base.css`) are the
 * only allowed specifiers, and no
 * source deep-imports internal component paths or the retired `@afenda/ui`.
 * Studio DNA staging (`shadcn-studio/`) is excluded from product scans; product
 * routes/features must not import it (M-A1).
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Button, Card, cn, Dialog, Input, Label } from "@afenda/ui-system";
import { describe, expect, it } from "vitest";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const SKIP_DIRS = new Set([
	"node_modules",
	".next",
	".turbo",
	"__tests__",
	"shadcn-studio",
]);

function collectSourceFiles(dir: string): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(dir)) {
		if (SKIP_DIRS.has(entry)) {
			continue;
		}
		const fullPath = path.join(dir, entry);
		if (statSync(fullPath).isDirectory()) {
			files.push(...collectSourceFiles(fullPath));
		} else if (/\.(ts|tsx|css)$/.test(entry)) {
			files.push(fullPath);
		}
	}
	return files;
}

function isUnderDnaStaging(relativePath: string): boolean {
	const normalized = relativePath.split(path.sep).join("/");
	return (
		normalized === "shadcn-studio" || normalized.startsWith("shadcn-studio/")
	);
}

const ALLOWED_SPECIFIERS = new Set([
	"@afenda/ui-system",
	"@afenda/ui-system/styles.css",
	"@afenda/ui-system/base.css",
]);
const UI_SYSTEM_PATTERN = /@afenda\/ui-system(?:\/[\w.\-/]+)?/g;
const RETIRED_UI_PATTERN = /@afenda\/ui(?![\w-])(?:\/[\w.\-/]+)?/g;
/** Product import of DNA staging (alias or relative). */
const DNA_IMPORT_PATTERN =
	/from\s+["']@\/shadcn-studio(?:\/[^"']*)?["']|from\s+["'][^"']*\/shadcn-studio\/[^"']*["']|import\s+["']@\/shadcn-studio(?:\/[^"']*)?["']/;
const LEGACY_WORKSPACE_GEOMETRY_PATTERN =
	/mx-auto\s+flex\s+w-full\s+max-w-(?:5xl|6xl)\s+flex-col\s+gap-(?:6|8)\s+px-6\s+py-10/;

function normalizePath(file: string): string {
	return path.relative(webRoot, file).split(path.sep).join("/");
}

describe("@afenda/web ui-system boundary", () => {
	it("resolves representative primitives from the flat barrel", () => {
		expect(Button).toBeTypeOf("function");
		expect(Card).toBeTypeOf("function");
		expect(Dialog).toBeTypeOf("function");
		expect(Input).toBeTypeOf("function");
		expect(Label).toBeTypeOf("function");
		expect(cn("a", "b")).toContain("a");
	});

	it("imports @afenda/ui-system only via the barrel or its stylesheet", () => {
		const offenders: string[] = [];
		for (const file of collectSourceFiles(webRoot)) {
			const contents = readFileSync(file, "utf-8");
			for (const match of contents.match(UI_SYSTEM_PATTERN) ?? []) {
				if (!ALLOWED_SPECIFIERS.has(match)) {
					offenders.push(`${path.relative(webRoot, file)} -> ${match}`);
				}
			}
		}
		expect(offenders, `deep imports found: ${offenders}`).toEqual([]);
	});

	it("imports shared tokens and base rules in the governed order", () => {
		const globals = readFileSync(path.join(webRoot, "globals.css"), "utf8");
		const imports = [...globals.matchAll(/@import\s+["']([^"']+)["'];/g)].map(
			(match) => match[1],
		);

		expect(imports.slice(0, 4)).toEqual([
			"tailwindcss",
			"tw-animate-css",
			"@afenda/ui-system/styles.css",
			"@afenda/ui-system/base.css",
		]);
	});

	it("never references the retired @afenda/ui package", () => {
		const offenders: string[] = [];
		for (const file of collectSourceFiles(webRoot)) {
			const contents = readFileSync(file, "utf-8");
			for (const match of contents.match(RETIRED_UI_PATTERN) ?? []) {
				offenders.push(`${path.relative(webRoot, file)} -> ${match}`);
			}
		}
		expect(offenders, `retired @afenda/ui refs: ${offenders}`).toEqual([]);
	});

	it("never product-imports Studio DNA staging (shadcn-studio)", () => {
		const offenders: string[] = [];
		for (const file of collectSourceFiles(webRoot)) {
			const rel = path.relative(webRoot, file);
			if (isUnderDnaStaging(rel)) {
				continue;
			}
			const contents = readFileSync(file, "utf-8");
			if (DNA_IMPORT_PATTERN.test(contents)) {
				offenders.push(rel);
			}
		}
		expect(
			offenders,
			`product DNA imports found: ${offenders.join(", ")}`,
		).toEqual([]);
	});

	it("keeps workspace geometry behind the ui-system capability", () => {
		const offenders = collectSourceFiles(path.join(webRoot, "features"))
			.filter((file) =>
				LEGACY_WORKSPACE_GEOMETRY_PATTERN.test(readFileSync(file, "utf8")),
			)
			.map(normalizePath);

		expect(
			offenders,
			`feature-owned workspace geometry found: ${offenders.join(", ")}`,
		).toEqual([]);
	});

	it("keeps product shell page headings behind WorkspacePageHeader", () => {
		const offenders = collectSourceFiles(path.join(webRoot, "features"))
			.filter((file) => {
				const relativePath = normalizePath(file);
				if (!relativePath.endsWith("-shell.tsx")) {
					return false;
				}
				if (relativePath.startsWith("features/auth/")) {
					return false;
				}
				return /<h1(?:\s|>)/.test(readFileSync(file, "utf8"));
			})
			.map(normalizePath);

		expect(
			offenders,
			`feature shell owns a raw page heading: ${offenders.join(", ")}`,
		).toEqual([]);
	});

	it("uses the complete WorkspacePage compound wherever adopted", () => {
		const offenders = collectSourceFiles(path.join(webRoot, "features"))
			.filter((file) => {
				const contents = readFileSync(file, "utf8");
				if (!contents.includes("<WorkspacePage")) {
					return false;
				}
				return !(
					contents.includes("<WorkspacePageHeader") &&
					contents.includes("<WorkspacePageContent")
				);
			})
			.map(normalizePath);

		expect(
			offenders,
			`incomplete WorkspacePage compound usage: ${offenders.join(", ")}`,
		).toEqual([]);
	});
});
