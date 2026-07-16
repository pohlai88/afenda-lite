import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const webPkgJson = path.join(webRoot, "package.json");

const SEMANTIC_CLASSES = [
	"bg-primary",
	"bg-card",
	"text-muted-foreground",
	"border-input",
] as const;

describe("@afenda/web — Tailwind emit smoke (ADR-010 § D4)", () => {
	it("emits ui-system semantic classes via globals.css @source", async () => {
		const require = createRequire(webPkgJson);
		const tailwindPostcss = require("@tailwindcss/postcss") as () => unknown;
		const postcssPath = require.resolve("@tailwindcss/postcss");
		const postcss = createRequire(postcssPath)("postcss") as {
			(plugins: unknown[]): {
				process: (
					css: string,
					opts: { from: string },
				) => Promise<{ css: string }>;
			};
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
