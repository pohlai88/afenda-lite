import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { build } from "vite";
import { describe, expect, it } from "vitest";

const appRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const stylesheetPath = path.join(appRoot, "src/storybook.css");
const previewPath = path.join(appRoot, ".storybook/preview.tsx");
const storyRoot = path.join(appRoot, "src/stories");
const webStylesheetPath = path.resolve(appRoot, "../web/globals.css");

const expectedImportRules = [
	'@import "tailwindcss" source(none);',
	'@import "tw-animate-css";',
	'@import "@afenda/ui-system/styles.css";',
	'@import "@afenda/ui-system/base.css";',
	'@import "@fontsource-variable/geist/wght.css";',
	'@import "@fontsource-variable/geist-mono/wght.css";',
] as const;
const expectedImportSpecifiers = [
	"tailwindcss",
	"tw-animate-css",
	"@afenda/ui-system/styles.css",
	"@afenda/ui-system/base.css",
	"@fontsource-variable/geist/wght.css",
	"@fontsource-variable/geist-mono/wght.css",
] as const;
const expectedSourceRules = [
	'@source "../../../packages/surfaces/ui-system/src/components";',
	'@source "../.storybook/preview.tsx";',
	'@source "./stories";',
] as const;
const testOnlySentinelClass = "w-[1379px]";

function sourceFiles(directory: string): string[] {
	return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const entryPath = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			return sourceFiles(entryPath);
		}
		return /\.(?:ts|tsx)$/.test(entry.name) ? [entryPath] : [];
	});
}

function importRules(stylesheet: string): string[] {
	return stylesheet
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.startsWith("@import "));
}

function importSpecifiers(stylesheet: string): string[] {
	return [...stylesheet.matchAll(/^@import\s+"([^"]+)"/gm)].map(
		(match) => match[1] ?? "",
	);
}

function sourceRules(stylesheet: string): string[] {
	return stylesheet
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.startsWith("@source "));
}

function cssImports(file: string): readonly string[] {
	const source = fs.readFileSync(file, "utf8");
	return [
		...source.matchAll(
			/(?:import\s+(?:[^"']+?\s+from\s+)?|import\s*\(\s*)["']([^"']+\.css)["']/g,
		),
	].map((match) => match[1] ?? "");
}

describe("Storybook CSS ownership", () => {
	it("has one exact, ordered stylesheet graph and explicit source allowlist", () => {
		const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
		const imports = importRules(stylesheet);
		const sources = sourceRules(stylesheet);

		expect(imports).toEqual(expectedImportRules);
		expect(new Set(imports).size).toBe(imports.length);
		expect(importSpecifiers(stylesheet)).toEqual(expectedImportSpecifiers);
		expect(sources).toEqual(expectedSourceRules);
		expect(new Set(sources).size).toBe(sources.length);
		expect(stylesheet).not.toContain("apps/web/globals.css");
		expect(stylesheet).not.toContain("data-visual-test");
	});

	it("keeps the preview as the sole runtime CSS importer", () => {
		const runtimeFiles = [
			...sourceFiles(path.join(appRoot, ".storybook")),
			...sourceFiles(path.join(appRoot, "src")),
		];
		const discovered = runtimeFiles.flatMap((file) =>
			cssImports(file).map((specifier) => ({
				file: path.relative(appRoot, file).replaceAll("\\", "/"),
				specifier,
			})),
		);

		expect(discovered).toEqual([
			{
				file: ".storybook/preview.tsx",
				specifier: "../src/storybook.css",
			},
		]);

		for (const file of runtimeFiles) {
			const source = fs.readFileSync(file, "utf8");
			expect(source).not.toMatch(
				/(?:from\s+|import\s*(?:\(\s*)?)["']@afenda\/ui-system\//,
			);
			expect(source).not.toContain("apps/web/globals.css");
			expect(source).not.toContain("screenshot.css");
		}
	});

	it("matches live ERP ownership without replicating semantic colors", () => {
		const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
		const webStylesheet = fs.readFileSync(webStylesheetPath, "utf8");
		const customProperties = [
			...stylesheet.matchAll(/^\s*(--[\w-]+)\s*:/gm),
		].map((match) => match[1]);
		const runtimeSource = [previewPath, ...sourceFiles(storyRoot)]
			.map((file) => fs.readFileSync(file, "utf8"))
			.join("\n");

		expect(importSpecifiers(stylesheet).slice(0, 4)).toEqual(
			importSpecifiers(webStylesheet).slice(0, 4),
		);
		expect(importRules(stylesheet)[0]).toBe(
			'@import "tailwindcss" source(none);',
		);
		expect(customProperties).toEqual(["--font-sans", "--font-mono"]);
		expect(runtimeSource).not.toMatch(
			/(?:bg|text|border|ring|outline|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-|\b)/,
		);
	});

	it("keeps screenshot CSS isolated to Playwright stylePath", () => {
		const visualConfig = fs.readFileSync(
			path.join(appRoot, "playwright.visual.config.ts"),
			"utf8",
		);
		const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
		const preview = fs.readFileSync(previewPath, "utf8");

		expect(visualConfig).toContain("stylePath: path.join(");
		expect(visualConfig).toContain('"visual-tests/screenshot.css"');
		expect(stylesheet).not.toContain("screenshot.css");
		expect(preview).not.toContain("screenshot.css");
	});

	it("emits only utilities discovered from the runtime allowlist", async () => {
		const result = await build({
			configFile: false,
			root: appRoot,
			logLevel: "silent",
			plugins: [tailwindcss()],
			build: {
				minify: false,
				write: false,
				rollupOptions: {
					input: stylesheetPath,
				},
			},
		});
		const outputs = Array.isArray(result) ? result : [result];
		const compiledStylesheet = outputs
			.flatMap((output) => ("output" in output ? output.output : []))
			.flatMap((output) => {
				if (output.type !== "asset" || !output.fileName.endsWith(".css")) {
					return [];
				}
				return [
					typeof output.source === "string"
						? output.source
						: new TextDecoder().decode(output.source),
				];
			})
			.join("\n");

		expect(compiledStylesheet).toContain(".min-h-screen");
		expect(compiledStylesheet).toContain(".bg-overlay-scrim");
		expect(compiledStylesheet).toContain(".animate-in");
		expect(compiledStylesheet).toContain(".fade-in-0");
		expect(compiledStylesheet).not.toContain(
			testOnlySentinelClass.slice(3, -1),
		);
	});
});
