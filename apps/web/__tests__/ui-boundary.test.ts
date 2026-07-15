/**
 * S5.1 boundary — proves `@afenda/ui/playground` is the sole runtime door
 * for UI consumption, and that the gateway matches the playground lab
 * registry exactly (plus the named infra allowlist).
 *
 * `@afenda/ui/playground/providers` is checked by static source text, not
 * dynamic import: `Providers` -> settingsContext -> fonts.ts pulls in
 * `next/font/google` / `geist/font/pixel`, Next.js compiler-only constructs
 * that only execute inside Next's own bundler and would crash this plain
 * Node/Vitest process.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	ActivityDialog,
	Button,
	buttonVariants,
	cn,
	NotificationDropdown,
	ProfileDropdown,
} from "@afenda/ui/playground";
import {
	ALLOWED_UI_SUBPATHS,
	PLAYGROUND_INFRA_EXPORTS,
	PLAYGROUND_PROVIDERS_EXPORTS,
} from "@afenda/ui/playground/types";
import { describe, expect, it } from "vitest";

import { PLAYGROUND_LABS } from "@/features/playground/lab-registry";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const SKIP_DIRS = new Set(["node_modules", ".next", ".turbo"]);

function collectSourceFiles(dir: string): string[] {
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

const UI_IMPORT_PATTERN = /@afenda\/ui(?:\/[\w.\-/]+)?/g;

describe("@afenda/web ui boundary", () => {
	it("resolves every non-Providers gateway member from @afenda/ui/playground", () => {
		expect(Button).toBeTypeOf("function");
		expect(buttonVariants).toBeTypeOf("function");
		expect(ProfileDropdown).toBeTypeOf("function");
		expect(NotificationDropdown).toBeTypeOf("function");
		expect(ActivityDialog).toBeTypeOf("function");
		expect(cn("a", "b")).toContain("a");
	});

	it("primitives barrel exports equal registry exportName values plus the infra allowlist", () => {
		const registryExportNames = PLAYGROUND_LABS.map((lab) => lab.exportName);
		const expected = new Set([
			...registryExportNames,
			...PLAYGROUND_INFRA_EXPORTS,
		]);
		const actual = new Set(
			Object.keys({
				Button,
				buttonVariants,
				ProfileDropdown,
				NotificationDropdown,
				ActivityDialog,
				cn,
			}),
		);
		expect(actual).toEqual(expected);
	});

	it("@afenda/ui/playground/providers statically wires exactly the providers allowlist", () => {
		const providersSourcePath = path.join(
			webRoot,
			"..",
			"..",
			"packages/design-system/src/playground/providers.ts",
		);
		const text = readFileSync(providersSourcePath, "utf-8");
		for (const name of PLAYGROUND_PROVIDERS_EXPORTS) {
			expect(text).toContain(`as ${name} }`);
		}
	});

	it("never deep-imports @afenda/ui outside the allowed public subpaths", () => {
		const offenders: string[] = [];
		for (const file of collectSourceFiles(webRoot)) {
			const contents = readFileSync(file, "utf-8");
			const matches = contents.match(UI_IMPORT_PATTERN);
			if (!matches) continue;
			for (const match of matches) {
				if (!(ALLOWED_UI_SUBPATHS as readonly string[]).includes(match)) {
					offenders.push(`${path.relative(webRoot, file)} -> ${match}`);
				}
			}
		}
		expect(offenders).toEqual([]);
	});
});
