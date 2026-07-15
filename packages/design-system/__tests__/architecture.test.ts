import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import * as gateway from "../src/playground/index";
import {
	ALLOWED_UI_SUBPATHS,
	PLAYGROUND_INFRA_EXPORTS,
	PLAYGROUND_PROVIDERS_EXPORTS,
} from "../src/playground/types";

/**
 * Self-contained package boundary checks. This test never imports from
 * apps/web — ARCH-024 flows apps -> packages, never the reverse. The
 * gateway-barrel-vs-registry parity check lives in
 * apps/web/__tests__/ui-boundary.test.ts, where both sides of that
 * comparison are legitimately reachable.
 *
 * `./playground/providers` is checked by static source parsing, never by
 * dynamic import: `Providers` -> settingsContext -> fonts.ts pulls in
 * `next/font/google` / `geist/font/pixel`, which only execute inside
 * Next.js's own bundler and would crash a plain Node/Vitest import.
 */

const packageRoot = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);

function readPackageJson(): { exports: Record<string, unknown> } {
	return JSON.parse(
		readFileSync(path.join(packageRoot, "package.json"), "utf-8"),
	);
}

/** Extracts exported binding names from `export { ... } from "..."` re-export statements. */
function parseReExportNames(sourcePath: string): string[] {
	const text = readFileSync(sourcePath, "utf-8");
	const names: string[] = [];
	for (const match of text.matchAll(/export\s*\{([^}]+)\}\s*from/g)) {
		for (const token of match[1].split(",")) {
			const trimmed = token.trim();
			if (!trimmed) continue;
			const asMatch = trimmed.match(/\bas\s+(\w+)$/);
			names.push(asMatch ? asMatch[1] : trimmed);
		}
	}
	return names;
}

describe("@afenda/ui (design-system) architecture", () => {
	it("exports map matches the allowed public subpaths exactly", () => {
		const { exports } = readPackageJson();
		const declaredSubpaths = Object.keys(exports).map((key) =>
			key === "." ? "@afenda/ui" : `@afenda/ui/${key.replace(/^\.\//, "")}`,
		);
		expect(new Set(declaredSubpaths)).toEqual(new Set(ALLOWED_UI_SUBPATHS));
	});

	it("primitives barrel (./playground) exports only defined values", () => {
		for (const [name, value] of Object.entries(gateway)) {
			expect(
				value,
				`playground/index.ts export "${name}" must be defined`,
			).toBeDefined();
		}
	});

	it("infra allowlist members are actually exported by the primitives barrel", () => {
		const barrelNames = new Set(Object.keys(gateway));
		for (const infraName of PLAYGROUND_INFRA_EXPORTS) {
			expect(barrelNames.has(infraName)).toBe(true);
		}
	});

	it("./playground/providers statically re-exports exactly the providers allowlist", () => {
		const providersPath = path.join(packageRoot, "src/playground/providers.ts");
		const exportedNames = parseReExportNames(providersPath);
		expect(new Set(exportedNames)).toEqual(
			new Set(PLAYGROUND_PROVIDERS_EXPORTS),
		);
	});
});
