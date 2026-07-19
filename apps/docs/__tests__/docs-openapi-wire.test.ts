import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const appDir = join(fileURLToPath(import.meta.url), "../..");
const openApiServerPath = join(appDir, "lib/openapi.server.ts");
const sourcePath = join(appDir, "lib/source.ts");
const globalCssPath = join(appDir, "app/global.css");
const generateScriptPath = join(appDir, "scripts/generate-openapi-docs.mts");
const searchRoutePath = join(appDir, "app/api/search/route.ts");
const guideMdxPath = join(appDir, "content/docs/guide.mdx");
const mdxComponentsPath = join(appDir, "components/mdx.tsx");
const packageJsonPath = join(appDir, "package.json");

/** SSOT string lives only in openapi.server.ts — generator imports the binding. */
const OPENAPI_DOCUMENT_ID = "../../docs-V2/api/OPEN-001-openapi.yaml";
const openApiYamlPath = join(appDir, OPENAPI_DOCUMENT_ID);

function parseSemverMajorMinorPatch(range: string): {
	readonly major: number;
	readonly minor: number;
	readonly patch: number;
} | null {
	const match = range.match(/(\d+)\.(\d+)\.(\d+)/);
	if (!match) {
		return null;
	}
	return {
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3]),
	};
}

/** Split so this test file never stores the banned registry strings verbatim. */
const BANNED_DOCS_PATTERN = new RegExp(
	["8bit" + "cn", "Component" + "Preview", "Copy" + "Command" + "Button"].join(
		"|",
	),
);

const SKIP_DIR_NAMES = new Set([
	"node_modules",
	".next",
	".source",
	".turbo",
	"dist",
]);

const PRODUCT_SOURCE_ROOTS = ["app", "components", "content", "lib", "scripts"] as const;

function collectSourceFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir)) {
		if (SKIP_DIR_NAMES.has(entry)) {
			continue;
		}
		const full = join(dir, entry);
		const st = statSync(full);
		if (st.isDirectory()) {
			out.push(...collectSourceFiles(full));
			continue;
		}
		if (/\.(?:ts|tsx|mts|mjs|js|jsx|mdx|css|json)$/.test(entry)) {
			out.push(full);
		}
	}
	return out;
}

describe("docs OpenAPI wire", () => {
	it("resolves the docs-V2 OpenAPI YAML on disk", () => {
		expect(existsSync(openApiYamlPath)).toBe(true);
	});

	it("shares OPENAPI_DOCUMENT_ID across openapi.server and generator", () => {
		const serverSource = readFileSync(openApiServerPath, "utf8");
		const generateSource = readFileSync(generateScriptPath, "utf8");

		expect(serverSource).toContain(OPENAPI_DOCUMENT_ID);
		expect(generateSource).toContain(
			'import { OPENAPI_DOCUMENT_ID, openapi } from "../lib/openapi.server.ts"',
		);
		expect(generateSource).toMatch(/\bOPENAPI_DOCUMENT_ID\b/);
		expect(generateSource).toContain("generateFiles");
		expect(generateSource).toContain("input: openapi");
	});

	it("wires createOpenAPI + loaderPlugin", () => {
		const serverSource = readFileSync(openApiServerPath, "utf8");
		const sourceSource = readFileSync(sourcePath, "utf8");

		expect(serverSource).toContain("createOpenAPI");
		expect(sourceSource).toContain("openapi.loaderPlugin()");
	});

	it("imports fumadocs-openapi CSS preset", () => {
		const css = readFileSync(globalCssPath, "utf8");
		expect(css).toContain("fumadocs-openapi/css/preset.css");
	});

	it("pins Tailwind >= 4.3.1 for fumadocs-openapi logical utilities", () => {
		const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
			devDependencies?: Record<string, string>;
		};
		const tw = pkg.devDependencies?.tailwindcss;
		const postcss = pkg.devDependencies?.["@tailwindcss/postcss"];
		expect(typeof tw).toBe("string");
		expect(typeof postcss).toBe("string");
		expect(tw).not.toBe("catalog:");
		expect(postcss).not.toBe("catalog:");
		for (const range of [tw, postcss] as string[]) {
			const parsed = parseSemverMajorMinorPatch(range);
			expect(parsed).not.toBeNull();
			expect(parsed!.major).toBeGreaterThanOrEqual(4);
			expect(
				parsed!.major > 4 ||
					parsed!.minor > 3 ||
					(parsed!.minor === 3 && parsed!.patch >= 1),
			).toBe(true);
		}
	});

	it("declares mdast-util-to-markdown for pnpm strict client resolve", () => {
		const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
			dependencies?: Record<string, string>;
		};
		expect(typeof pkg.dependencies?.["mdast-util-to-markdown"]).toBe("string");
	});

	it("wires stock Orama search via createFromSource", () => {
		expect(existsSync(searchRoutePath)).toBe(true);
		const searchSource = readFileSync(searchRoutePath, "utf8");
		expect(searchSource).toContain("createFromSource");
		expect(searchSource).toContain("fumadocs-core/search/server");
	});

	it("ships guide.mdx with required frontmatter", () => {
		expect(existsSync(guideMdxPath)).toBe(true);
		const guide = readFileSync(guideMdxPath, "utf8");
		expect(guide).toMatch(/^---\r?\ntitle:\s+.+\r?\ndescription:\s+.+\r?\n---/m);
	});

	it("registers stock fumadocs-ui MDX surfaces without registry previews", () => {
		const mdx = readFileSync(mdxComponentsPath, "utf8");
		expect(mdx).toContain("fumadocs-ui/components/accordion");
		expect(mdx).toContain("fumadocs-ui/components/steps");
		expect(mdx).toContain("fumadocs-ui/components/tabs");
		expect(mdx).toContain("fumadocs-ui/components/files");
		expect(mdx).toContain("fumadocs-ui/components/type-table");
		expect(mdx).not.toMatch(BANNED_DOCS_PATTERN);
	});

	it("keeps apps/docs sources free of banned registry preview patterns", () => {
		const hits: string[] = [];
		for (const root of PRODUCT_SOURCE_ROOTS) {
			const dir = join(appDir, root);
			if (!existsSync(dir)) {
				continue;
			}
			for (const file of collectSourceFiles(dir)) {
				if (BANNED_DOCS_PATTERN.test(readFileSync(file, "utf8"))) {
					hits.push(relative(appDir, file).replaceAll("\\", "/"));
				}
			}
		}
		// Include this test file so a full-tree rg over apps/docs stays clean.
		hits.push(
			...collectSourceFiles(join(appDir, "__tests__"))
				.filter((file) => BANNED_DOCS_PATTERN.test(readFileSync(file, "utf8")))
				.map((file) => relative(appDir, file).replaceAll("\\", "/")),
		);
		expect(hits).toEqual([]);
	});
});
