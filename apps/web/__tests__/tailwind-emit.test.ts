import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const webPkgJson = path.join(webRoot, "package.json");

const SEMANTIC_CLASSES = [
	"bg-primary",
	"bg-card",
	"bg-canvas",
	"bg-surface-raised",
	"bg-surface-sunken",
	"bg-success-subtle",
	"bg-warning-subtle",
	"bg-info-subtle",
	"bg-destructive-subtle",
	"bg-destructive-soft",
	"bg-primary-subtle",
	"bg-primary-track",
	"bg-overlay-scrim",
	"bg-control-fill",
	"bg-control-fill-hover",
	"bg-control-fill-strong",
	"bg-accent-fill-hover",
	"bg-primary-hover",
	"bg-destructive-hover",
	"bg-secondary-hover",
	"bg-kbd-tooltip-fill",
	"bg-table-row-hover",
	"bg-table-stripe",
	"text-muted-foreground",
	"text-foreground-secondary",
	"text-foreground-tertiary",
	"text-sidebar-muted-foreground",
	"text-success-subtle-foreground",
	"text-warning-subtle-foreground",
	"text-info-subtle-foreground",
	"text-destructive-subtle-foreground",
	"ring-ring-focus",
	"ring-ring-destructive-focus",
	"ring-ring-destructive-focus-strong",
	"border-input",
	"border-success-border",
	"border-warning-border",
	"border-info-border",
	"border-destructive-border",
] as const;

describe("@afenda/web — Tailwind emit smoke (ADR-010 § D4)", () => {
	it("emits ui-system semantic classes via globals.css @source", async () => {
		const require = createRequire(webPkgJson);
		const tailwindPostcss = require("@tailwindcss/postcss") as () => unknown;
		const postcssPath = require.resolve("@tailwindcss/postcss");
		const postcss = createRequire(postcssPath)("postcss") as (
			plugins: unknown[],
		) => {
			process: (
				css: string,
				opts: { from: string },
			) => Promise<{ css: string }>;
		};

		const inputFile = path.join(webRoot, "globals.css");
		const result = await postcss([tailwindPostcss()]).process(
			readFileSync(inputFile, "utf8"),
			{ from: inputFile },
		);

		const missing = SEMANTIC_CLASSES.filter(
			(cls) => !result.css.includes(`.${cls}`),
		);
		expect(
			missing,
			`PostCSS compile did not emit package classes: ${missing.join(", ")}`,
		).toEqual([]);
	});
});
