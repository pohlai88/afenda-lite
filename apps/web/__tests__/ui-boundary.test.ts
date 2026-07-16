/**
 * UI boundary — proves `@afenda/ui-system` is the sole runtime door for UI in
 * @afenda/web: the flat barrel (`@afenda/ui-system`) and its stylesheet
 * (`@afenda/ui-system/styles.css`) are the only allowed specifiers, and no
 * source deep-imports internal component paths or the retired `@afenda/ui`.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Button, Card, cn, Dialog, Input, Label } from "@afenda/ui-system";
import { describe, expect, it } from "vitest";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const SKIP_DIRS = new Set(["node_modules", ".next", ".turbo", "__tests__"]);

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

const ALLOWED_SPECIFIERS = new Set([
	"@afenda/ui-system",
	"@afenda/ui-system/styles.css",
]);
const UI_SYSTEM_PATTERN = /@afenda\/ui-system(?:\/[\w.\-/]+)?/g;
const RETIRED_UI_PATTERN = /@afenda\/ui(?![\w-])(?:\/[\w.\-/]+)?/g;

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
});
