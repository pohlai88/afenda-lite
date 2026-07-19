import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const appDir = join(fileURLToPath(import.meta.url), "../..");
const requireFromDocs = createRequire(join(appDir, "package.json"));
const openApiServerPath = join(appDir, "lib/openapi.server.ts");
const sourcePath = join(appDir, "lib/source.ts");
const globalCssPath = join(appDir, "app/global.css");
const generateScriptPath = join(appDir, "scripts/generate-openapi-docs.mts");
const searchRoutePath = join(appDir, "app/api/search/route.ts");
const rootLayoutPath = join(appDir, "app/layout.tsx");
const docsPagePath = join(appDir, "app/docs/[[...slug]]/page.tsx");
const layoutSharedPath = join(appDir, "lib/layout.shared.tsx");
const sourceConfigPath = join(appDir, "source.config.ts");
const guideMdxPath = join(appDir, "content/docs/guide.mdx");
const mdxComponentsPath = join(appDir, "components/mdx.tsx");
const packageJsonPath = join(appDir, "package.json");
const cliJsonPath = join(appDir, "cli.json");

/** SSOT string lives in openapi-document-id.ts — server + generator import the binding. */
const OPENAPI_DOCUMENT_ID = "../../docs-V2/api/OPEN-001-openapi.yaml";
const openApiYamlPath = join(appDir, OPENAPI_DOCUMENT_ID);
const openApiDocumentIdPath = join(appDir, "lib/openapi-document-id.ts");

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
		const documentIdSource = readFileSync(openApiDocumentIdPath, "utf8");
		expect(documentIdSource).toContain("OPENAPI_DOCUMENT_PATH");
		expect(documentIdSource).toContain("fileURLToPath");
		expect(documentIdSource).toContain("dirname");
		// dirname(lib/file) → lib; join(.., "..") → apps/docs; then ../../docs-V2 → repo root.
		expect(documentIdSource).toContain(
			'join(dirname(fileURLToPath(import.meta.url)), "..")',
		);
		const { OPENAPI_DOCUMENT_PATH } = requireFromDocs(
			"./lib/openapi-document-id.ts",
		) as { OPENAPI_DOCUMENT_PATH: string };
		expect(existsSync(OPENAPI_DOCUMENT_PATH)).toBe(true);
		expect(OPENAPI_DOCUMENT_PATH.replaceAll("\\", "/")).toMatch(
			/\/docs-V2\/api\/OPEN-001-openapi\.yaml$/,
		);
		expect(OPENAPI_DOCUMENT_PATH.replaceAll("\\", "/")).not.toContain(
			"/apps/docs-V2/",
		);
	});

	it("shares OPENAPI_DOCUMENT_ID across openapi-document-id, openapi.server, and generator", () => {
		const documentIdSource = readFileSync(openApiDocumentIdPath, "utf8");
		const serverSource = readFileSync(openApiServerPath, "utf8");
		const generateSource = readFileSync(generateScriptPath, "utf8");

		expect(documentIdSource).toContain(OPENAPI_DOCUMENT_ID);
		expect(documentIdSource).toContain("OPENAPI_DOCUMENT_PATH");
		expect(serverSource).toContain('from "./openapi-document-id"');
		expect(serverSource).toContain("OPENAPI_DOCUMENT_ID");
		expect(serverSource).toContain("OPENAPI_DOCUMENT_PATH");
		expect(generateSource).toContain("OPENAPI_DOCUMENT_ID");
		expect(generateSource).toContain("OPENAPI_DOCUMENT_PATH");
		expect(generateSource).toContain(
			'from "../lib/openapi-document-id.ts"',
		);
		expect(generateSource).toContain(
			"[OPENAPI_DOCUMENT_ID]: OPENAPI_DOCUMENT_PATH",
		);
		expect(generateSource).toContain('require("fumadocs-openapi/server")');
		expect(generateSource).toContain("createOpenAPI");
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

	it("locks createOpenAPI (SchemaRecord · no proxy · server-only)", () => {
		const serverSource = readFileSync(openApiServerPath, "utf8");

		expect(serverSource).toContain('from "fumadocs-openapi/server"');
		expect(serverSource).toContain("createOpenAPI");
		expect(serverSource).toContain("OpenAPIOptions");
		expect(serverSource).toContain("satisfies OpenAPIOptions");
		expect(serverSource).toContain("[OPENAPI_DOCUMENT_ID]: OPENAPI_DOCUMENT_PATH");
		expect(serverSource).not.toMatch(/input:\s*\[\s*OPENAPI_DOCUMENT_ID\s*\]/);
		expect(readFileSync(openApiDocumentIdPath, "utf8")).toContain(
			OPENAPI_DOCUMENT_ID,
		);
		expect(readFileSync(openApiDocumentIdPath, "utf8")).toContain(
			"OPENAPI_DOCUMENT_PATH",
		);
		expect(serverSource).not.toMatch(/proxyUrl\s*:/);
		expect(serverSource).not.toMatch(/\.createProxy\s*\(/);
		expect(serverSource).not.toMatch(/allowedOrigins\s*:/);
		expect(serverSource).not.toMatch(/https?:\/\//);
		expect(serverSource).not.toMatch(/["']use client["']/);

		expect(existsSync(join(appDir, "app/api/proxy/route.ts"))).toBe(false);
		expect(existsSync(join(appDir, "app/api/proxy/route.js"))).toBe(false);

		const apiPage = readFileSync(join(appDir, "components/api-page.tsx"), "utf8");
		// Type-only `fumadocs-openapi/server` imports OK; no runtime createOpenAPI / openapi.server.
		expect(apiPage).not.toMatch(/createOpenAPI\s*\(/);
		expect(apiPage).not.toMatch(/openapi\.server/);
		expect(apiPage).not.toMatch(/import\s+\{[^}]*\bcreateOpenAPI\b/);
	});

	it("locks createOpenAPIPage (stock defaults · preload · no custom adapters)", () => {
		const apiPage = readFileSync(join(appDir, "components/api-page.tsx"), "utf8");
		expect(apiPage).toMatch(/^["']use client["']/m);
		expect(apiPage).toContain("createOpenAPIPage");
		expect(apiPage).toContain("createOpenAPIPage()");
		expect(apiPage).toContain("OpenAPIPreloadProvider");
		expect(apiPage).toContain("export function APIPage");
		expect(apiPage).toContain("useOpenApiPreload");
		expect(apiPage).toContain("DocsOpenAPIPageProps");
		expect(apiPage).not.toMatch(/OpenAPIPageProps_Spec/);
		expect(apiPage).not.toMatch(/codeUsages\s*:/);
		expect(apiPage).not.toMatch(/mediaAdapters\s*:/);
		expect(apiPage).not.toMatch(/createCodeUsageGeneratorRegistry/);
		expect(apiPage).not.toMatch(/from ["']fumadocs-openapi\/requests/);
		expect(apiPage).not.toMatch(/openapiTranslations|fumadocs-openapi\/i18n/);
		expect(apiPage).not.toMatch(/console\.log/);
		expect(apiPage).not.toMatch(/storageKeyPrefix|transformAuthInputs/);

		const mdx = readFileSync(mdxComponentsPath, "utf8");
		expect(mdx).toContain("OpenAPIPage: APIPage");
	});

	it("locks OpenAPI Framework Mode (MDX generateFiles · no Virtual Files)", () => {
		const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
			readonly dependencies?: Record<string, string>;
			readonly devDependencies?: Record<string, string>;
		};
		expect(typeof pkg.dependencies?.["fumadocs-openapi"]).toBe("string");
		expect(pkg.devDependencies?.["fumadocs-openapi"]).toBeUndefined();

		const css = readFileSync(globalCssPath, "utf8");
		expect(css).toContain("fumadocs-openapi/css/preset.css");

		const sourceSource = readFileSync(sourcePath, "utf8");
		expect(sourceSource).toContain("openapi.loaderPlugin()");
		expect(sourceSource).not.toMatch(/openapi\.staticSource|staticSource\s*\(/);
		expect(sourceSource).not.toMatch(/page\.type\s*===\s*["']openapi["']/);

		const generateSource = readFileSync(generateScriptPath, "utf8");
		expect(generateSource).toContain("generateFiles");
		expect(generateSource).toContain("input: openapi");
		expect(generateSource).toContain('output: "./content/docs/api"');
		expect(generateSource).toContain('per: "operation"');
		expect(generateSource).toContain("meta: true");
		expect(generateSource).toContain("addGeneratedComment: true");
		expect(generateSource).toContain("createRequire");
		expect(generateSource).toContain('require("fumadocs-openapi")');
		expect(generateSource).toContain("preservedIndex");
		expect(generateSource).not.toMatch(/includeDescription\s*:\s*true/);
		expect(generateSource).not.toMatch(/staticSource/);
		expect(generateSource).not.toMatch(/groupBy\s*:/);
		expect(generateSource).not.toMatch(/\bindex\s*:\s*\{/);
		expect(generateSource).not.toMatch(/\bimports\s*:/);
		expect(generateSource).not.toMatch(/\bfrontmatter\s*:/);
		expect(generateSource).not.toMatch(/per:\s*["']tag["']|per:\s*["']file["']|per:\s*["']custom["']/);
		expect(generateSource).not.toMatch(/toPages\s*\(/);

		const page = readFileSync(docsPagePath, "utf8");
		expect(page).toContain("preloadOpenAPIPage");
		expect(page).toContain("OpenAPIPreloadProvider");
		// Pass preloaded bag only — not the whole { preloaded } return (nested wrong).
		expect(page).toContain("openApiPage.preloaded");
		expect(page).toContain("openApiPreloaded = openApiPage.preloaded");
		expect(page).toContain(
			"<OpenAPIPreloadProvider preloaded={openApiPreloaded}>",
		);
		expect(page).toContain("assertOpenApiPreloadedDocs");
		expect(page).toContain("pageHasOpenApiPreload");
		expect(page).not.toMatch(/page\.type\s*===\s*["']openapi["']/);
		expect(page).not.toMatch(/getOpenAPIPageProps/);
		expect(page).not.toMatch(
			/<OpenAPIPreloadProvider\s+preloaded=\{openApiPage\}/,
		);

		const apiPage = readFileSync(join(appDir, "components/api-page.tsx"), "utf8");
		expect(apiPage).toContain("createOpenAPIPage");
		expect(apiPage).toContain("OpenAPIPreloadProvider");
		expect(apiPage).toContain("export function APIPage");
		expect(apiPage).toContain("DocsOpenAPIPageProps");
		expect(apiPage).toContain('Omit<\n\tOpenAPIPageProps_Preloaded,\n\t"preloaded"\n>');
		expect(apiPage).not.toMatch(/OpenAPIPageProps_Spec/);

		const mdx = readFileSync(mdxComponentsPath, "utf8");
		expect(mdx).toContain("OpenAPIPage: APIPage");

		expect(existsSync(join(appDir, "content/docs/api"))).toBe(true);
		expect(existsSync(join(appDir, "openapi"))).toBe(false);
	});

	it("locks Access Control Outside baseline (public single source)", () => {
		const sourceSource = readFileSync(sourcePath, "utf8");
		expect(sourceSource).toContain("export const source = loader(");
		expect(sourceSource).toContain("docs.toFumadocsSource()");
		expect(sourceSource).not.toMatch(/\bupdate\s*\(/);
		expect(sourceSource).not.toMatch(/\bcreateSource\b/);
		expect(sourceSource).not.toMatch(/\.files\s*\(/);
		expect(sourceSource).not.toMatch(/\bpermission\b/);

		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).not.toMatch(/\bpermission\b/);

		const page = readFileSync(docsPagePath, "utf8");
		expect(page).not.toMatch(/\bgetUser\b/);
		expect(page).not.toMatch(/page\.data\.permission/);
	});

	it("locks Loader API (sync loader · baseUrl · no custom url/slugs/icon/i18n)", () => {
		const sourceSource = readFileSync(sourcePath, "utf8");

		expect(sourceSource).toContain('from "fumadocs-core/source"');
		expect(sourceSource).toContain("export const source = loader(");
		expect(sourceSource).toContain('baseUrl: "/docs"');
		expect(sourceSource).toContain("docs.toFumadocsSource()");
		expect(sourceSource).toContain("openapi.loaderPlugin()");
		expect(sourceSource).not.toMatch(/\burl\s*\(/);
		expect(sourceSource).not.toMatch(/\bslugs\s*\(/);
		expect(sourceSource).not.toMatch(/\bicon\s*\(/);
		expect(sourceSource).not.toMatch(/\bi18n\s*,|\bi18n\s*:/);
		expect(sourceSource).not.toMatch(/\bdynamicLoader\b/);
		expect(sourceSource).not.toMatch(/source\/dynamic/);
		expect(sourceSource).not.toMatch(/serializePageTree|useFumadocsLoader/);
		expect(sourceSource).not.toMatch(/["']use client["']/);

		const docsLayout = readFileSync(join(appDir, "app/docs/layout.tsx"), "utf8");
		expect(docsLayout).toContain("tree={source.pageTree}");
		expect(docsLayout).not.toMatch(/getPageTree\s*\(/);

		const page = readFileSync(docsPagePath, "utf8");
		expect(page).toContain("source.getPage(params.slug)");
		expect(page).toContain("source.generateParams()");
		expect(page).not.toMatch(/serializePageTree|useFumadocsLoader/);
	});

	it("locks Loader Source (single toFumadocsSource · no multi/static/dynamic)", () => {
		const sourceSource = readFileSync(sourcePath, "utf8");

		expect(sourceSource).toContain("source: docs.toFumadocsSource()");
		expect(sourceSource).toContain('from "collections/server"');
		expect(sourceSource).not.toMatch(/StaticSource|DynamicSource/);
		expect(sourceSource).not.toMatch(/createMySource|createSanitySource/);
		expect(sourceSource).not.toMatch(/\bdynamicLoader\b/);
		expect(sourceSource).not.toMatch(/page\.type\s*===/);
		expect(sourceSource).not.toMatch(/openapi\.staticSource|staticSource\s*\(/);
		// Multi-source record entry (not the Lite `source:` property)
		expect(sourceSource).not.toMatch(/docs:\s*docs\.toFumadocsSource/);
		expect(sourceSource).not.toMatch(/blog\.toFumadocsSource/);

		expect(existsSync(join(appDir, "lib/my-content-source.ts"))).toBe(false);
		expect(existsSync(join(appDir, "lib/content-source.ts"))).toBe(false);

		const page = readFileSync(docsPagePath, "utf8");
		expect(page).not.toMatch(/page\.type\s*===/);
	});

	it("locks Loader Plugins (lucideIconsPlugin + openapi.loaderPlugin)", () => {
		const sourceSource = readFileSync(sourcePath, "utf8");

		expect(sourceSource).toContain(
			"plugins: [lucideIconsPlugin(), openapi.loaderPlugin()]",
		);
		expect(sourceSource).toContain("lucideIconsPlugin()");
		expect(sourceSource).toContain("openapi.loaderPlugin()");
		expect(sourceSource).toContain(
			'from "fumadocs-core/source/lucide-icons"',
		);
		expect(sourceSource).toContain("docs-V2/docs/loader-plugins.md");
		expect(sourceSource).not.toMatch(/\btypedPlugin\b/);
		expect(sourceSource).not.toMatch(/transformStorage/);
		expect(sourceSource).not.toMatch(/transformPageTree/);
		expect(sourceSource).not.toMatch(/asyncapi\.loaderPlugin|createAsyncAPI/);
		expect(sourceSource).not.toMatch(/plugins:\s*\(\s*\{/);
		expect(sourceSource).not.toMatch(/plugins:\s*\(\s*typedPlugin/);

		const pluginCalls = sourceSource.match(/\.loaderPlugin\s*\(/g) ?? [];
		expect(pluginCalls).toHaveLength(1);
	});

	it("locks Fumadocs MDX Browser Entry Outside baseline (no createClientLoader)", () => {
		for (const root of ["lib", "app", "components"] as const) {
			const dir = join(appDir, root);
			if (!existsSync(dir)) {
				continue;
			}
			for (const file of collectSourceFiles(dir)) {
				const body = readFileSync(file, "utf8");
				expect(body).not.toMatch(/from\s+["']collections\/browser["']/);
				expect(body).not.toMatch(/\bcreateClientLoader\s*\(/);
				expect(body).not.toMatch(/\bclientLoader\.preload\b/);
				expect(body).not.toMatch(/\buseContent\s*\(/);
				expect(body).not.toMatch(/browserCollections/);
			}
		}

		const page = readFileSync(docsPagePath, "utf8");
		expect(page).toContain("page.data.body");
		expect(page).not.toMatch(/collections\/browser|createClientLoader/);
	});

	it("locks Fumadocs MDX Dynamic Entry Outside baseline (no collections/dynamic · no load)", () => {
		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).toContain("docs-V2/docs/fumadocs-mdx-dynamic.md");
		expect(sourceConfig).not.toMatch(/\basync\s*:\s*true\b/);
		expect(sourceConfig).not.toMatch(/\bdynamic\s*:\s*true\b/);

		const sourceSource = readFileSync(sourcePath, "utf8");
		expect(sourceSource).toContain('from "collections/server"');
		expect(sourceSource).toContain("docs-V2/docs/fumadocs-mdx-dynamic.md");
		expect(sourceSource).not.toMatch(/collections\/dynamic/);

		const page = readFileSync(docsPagePath, "utf8");
		expect(page).toContain("page.data.body");
		expect(page).toContain("page.data.toc");
		expect(page).not.toMatch(/page\.data\.load\s*\(/);
		expect(page).not.toMatch(/await\s+page\.data\.load/);

		for (const root of ["lib", "app", "components"] as const) {
			const dir = join(appDir, root);
			if (!existsSync(dir)) {
				continue;
			}
			for (const file of collectSourceFiles(dir)) {
				const body = readFileSync(file, "utf8");
				expect(body).not.toMatch(/from\s+["']collections\/dynamic["']/);
			}
		}
	});

	it("locks Fumadocs MDX Entry (collections/server only · no browser/dynamic)", () => {
		const tsconfig = JSON.parse(
			readFileSync(join(appDir, "tsconfig.json"), "utf8"),
		) as {
			readonly compilerOptions?: {
				readonly paths?: Record<string, readonly string[]>;
			};
		};
		expect(tsconfig.compilerOptions?.paths?.["collections/*"]).toEqual([
			"./.source/*",
		]);

		const sourceSource = readFileSync(sourcePath, "utf8");
		expect(sourceSource).toContain('from "collections/server"');
		expect(sourceSource).toContain("docs.toFumadocsSource()");
		expect(sourceSource).toContain("docs-V2/docs/fumadocs-mdx-entry.md");
		expect(sourceSource).not.toMatch(/collections\/browser/);
		expect(sourceSource).not.toMatch(/collections\/dynamic/);
		expect(sourceSource).not.toMatch(/from\s+["']\.\/\.source\//);

		const gitignore = readFileSync(join(appDir, ".gitignore"), "utf8");
		expect(gitignore).toMatch(/^\.source\b/m);

		for (const root of ["lib", "app", "components"] as const) {
			const dir = join(appDir, root);
			if (!existsSync(dir)) {
				continue;
			}
			for (const file of collectSourceFiles(dir)) {
				const body = readFileSync(file, "utf8");
				expect(body).not.toMatch(/from\s+["']collections\/browser["']/);
				expect(body).not.toMatch(/from\s+["']collections\/dynamic["']/);
			}
		}

		const page = readFileSync(docsPagePath, "utf8");
		expect(page).toContain("source.getPage");
		expect(page).toContain("page.data.body");
		expect(page).not.toMatch(/from\s+["']collections\//);
	});

	it("locks Fumadocs MDX Performance (sync bundler · no async/dynamic lazy)", () => {
		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).toContain("docs-V2/docs/fumadocs-mdx-performance.md");
		expect(sourceConfig).not.toMatch(/\basync\s*:\s*true\b/);
		expect(sourceConfig).not.toMatch(/\bdynamic\s*:\s*true\b/);

		const sourceSource = readFileSync(sourcePath, "utf8");
		expect(sourceSource).toContain('from "collections/server"');
		expect(sourceSource).not.toMatch(/collections\/dynamic/);

		const page = readFileSync(docsPagePath, "utf8");
		expect(page).toContain("page.data.body");
		expect(page).toContain("page.data.toc");
		expect(page).not.toMatch(/page\.data\.load\s*\(/);
		expect(page).not.toMatch(/await\s+page\.data\.load/);
	});

	it("locks Fumadocs MDX Global Options (mdxOptions · default MDX · no satteri/workspaces/cache)", () => {
		const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
			readonly dependencies?: Record<string, string>;
			readonly devDependencies?: Record<string, string>;
		};
		expect(pkg.dependencies?.["@fumadocs/satteri"]).toBeUndefined();
		expect(pkg.devDependencies?.["@fumadocs/satteri"]).toBeUndefined();

		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).toContain("docs-V2/docs/fumadocs-mdx-global.md");
		expect(sourceConfig).toContain("defineConfig");
		expect(sourceConfig).toContain('providerImportSource: "@/components/mdx"');
		expect(sourceConfig).toMatch(
			/remarkPlugins:\s*\[\s*\[\s*remarkBlockId/,
		);
		expect(sourceConfig).not.toMatch(/\bcompiler\s*:/);
		expect(sourceConfig).not.toMatch(/\bsatteriOptions\s*:/);
		expect(sourceConfig).not.toMatch(/\bworkspaces\s*:/);
		expect(sourceConfig).not.toMatch(/\bexperimentalBuildCache\s*:/);
		expect(sourceConfig).not.toMatch(/\bpreset\s*:\s*['"]minimal['"]/);
		expect(sourceConfig).toContain(
			'from "fumadocs-mdx/plugins/last-modified"',
		);
		expect(sourceConfig).toMatch(/plugins:\s*\[\s*lastModified\s*\(\s*\)\s*\]/);
		expect(sourceConfig).not.toMatch(/satteri|Satteri/);
	});

	it("locks Fumadocs MDX Presets (default preset · no applyMdxPreset · no built-in option bags)", () => {
		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).toContain("docs-V2/docs/fumadocs-mdx-preset.md");
		expect(sourceConfig).toContain("defineConfig");
		expect(sourceConfig).toContain('providerImportSource: "@/components/mdx"');
		expect(sourceConfig).toMatch(
			/remarkPlugins:\s*\[\s*\[\s*remarkBlockId/,
		);
		expect(sourceConfig).not.toMatch(/\bapplyMdxPreset\b/);
		expect(sourceConfig).not.toMatch(/\bpreset\s*:\s*['"]minimal['"]/);
		expect(sourceConfig).not.toMatch(/rehypePlugins\s*:/);
		expect(sourceConfig).not.toMatch(/rehypeCodeOptions/);
		expect(sourceConfig).not.toMatch(/remarkImageOptions/);
		expect(sourceConfig).not.toMatch(/remarkHeadingOptions/);
		expect(sourceConfig).not.toMatch(/\bdefineCollections\b/);
	});

	it("locks Fumadocs MDX Getting Started (defineDocs · Next · no Vite/Runtime Loader)", () => {
		const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
			readonly dependencies?: Record<string, string>;
			readonly devDependencies?: Record<string, string>;
		};
		expect(typeof pkg.dependencies?.["fumadocs-mdx"]).toBe("string");
		expect(typeof pkg.dependencies?.["fumadocs-core"]).toBe("string");
		expect(
			typeof (pkg.dependencies?.["@types/mdx"] ?? pkg.devDependencies?.["@types/mdx"]),
		).toBe("string");

		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).toContain('from "fumadocs-mdx/config"');
		expect(sourceConfig).toContain("defineDocs");
		expect(sourceConfig).toContain("defineConfig");
		expect(sourceConfig).toContain('dir: "content/docs"');
		expect(sourceConfig).toContain("export const docs = defineDocs");
		expect(sourceConfig).toContain("extractLinkReferences: true");
		expect(sourceConfig).toContain("includeProcessedMarkdown: true");
		expect(sourceConfig).toContain('providerImportSource: "@/components/mdx"');
		expect(sourceConfig).toContain("docs-V2/docs/fumadocs-mdx.md");
		expect(sourceConfig).toContain("docs-V2/docs/fumadocs-mdx-next.md");
		expect(sourceConfig).toContain(
			'from "fumadocs-core/source/schema"',
		);
		expect(sourceConfig).toContain("pageSchema");
		expect(sourceConfig).toContain("metaSchema");
		expect(sourceConfig).toContain("schema: pageSchema");
		expect(sourceConfig).toContain("schema: metaSchema");
		expect(sourceConfig).not.toMatch(/pageSchema\.extend|metaSchema\.extend/);
		expect(sourceConfig).not.toMatch(/\bdefineCollections\b/);
		expect(sourceConfig).not.toMatch(/createMDXSource|@fumadocs\/content-collections/);

		const nextConfig = readFileSync(join(appDir, "next.config.mjs"), "utf8");
		expect(nextConfig).toContain("fumadocs-mdx/next");
		expect(nextConfig).toContain("createMDX");
		expect(nextConfig).not.toMatch(/fumadocs-mdx\/vite|@fumadocs\/mdx\/vite/);

		const sourceSource = readFileSync(sourcePath, "utf8");
		expect(sourceSource).toContain("docs.toFumadocsSource()");

		expect(existsSync(join(appDir, "vite.config.ts"))).toBe(false);
		expect(existsSync(join(appDir, "vite.config.mts"))).toBe(false);
	});

	it("locks Fumadocs MDX Node Active path (register · list:source-pages · createMDX kept)", () => {
		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).toContain("docs-V2/docs/fumadocs-mdx-node.md");

		const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
			readonly type?: string;
			readonly scripts?: Record<string, string>;
		};
		expect(pkg.type).toBe("module");
		expect(pkg.scripts?.["list:source-pages"]).toMatch(
			/list-source-pages\.mjs/,
		);

		const nextConfig = readFileSync(join(appDir, "next.config.mjs"), "utf8");
		expect(nextConfig).toContain("createMDX");
		expect(nextConfig).toContain("fumadocs-mdx/next");
		expect(nextConfig).not.toMatch(/fumadocs-mdx\/node/);

		const listScript = join(appDir, "scripts/list-source-pages.mjs");
		expect(existsSync(listScript)).toBe(true);
		const listBody = readFileSync(listScript, "utf8");
		expect(listBody).toContain('from "fumadocs-mdx/node"');
		expect(listBody).toContain("registerFuma()");
		expect(listBody).toContain('import("collections/server")');
		expect(listBody).not.toMatch(/configPath\s*:/);

		expect(existsSync(join(appDir, "scripts/node-docs-resolve.mjs"))).toBe(
			true,
		);
		expect(
			existsSync(join(appDir, "scripts/node-inventory-openapi.mjs")),
		).toBe(true);
		expect(existsSync(join(appDir, "scripts/example.js"))).toBe(false);

		for (const root of ["lib", "app", "components"] as const) {
			const dir = join(appDir, root);
			if (!existsSync(dir)) {
				continue;
			}
			for (const file of collectSourceFiles(dir)) {
				const body = readFileSync(file, "utf8");
				expect(body).not.toMatch(
					/from\s+["']fumadocs-mdx\/node(?:\/[^"']*)?["']/,
				);
			}
		}
	});

	it("locks Fumadocs MDX Next.js Active path (createMDX · collections · no configPath)", () => {
		const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
			readonly dependencies?: Record<string, string>;
			readonly devDependencies?: Record<string, string>;
			readonly scripts?: Record<string, string>;
		};
		expect(typeof pkg.dependencies?.["fumadocs-mdx"]).toBe("string");
		expect(typeof pkg.dependencies?.["fumadocs-core"]).toBe("string");
		expect(
			typeof (pkg.dependencies?.["@types/mdx"] ?? pkg.devDependencies?.["@types/mdx"]),
		).toBe("string");
		expect(pkg.scripts?.["generate:source"]).toMatch(/fumadocs-mdx/);

		expect(existsSync(join(appDir, "next.config.mjs"))).toBe(true);
		expect(existsSync(join(appDir, "next.config.ts"))).toBe(false);
		expect(existsSync(join(appDir, "next.config.js"))).toBe(false);

		const nextConfig = readFileSync(join(appDir, "next.config.mjs"), "utf8");
		expect(nextConfig).toContain('from "fumadocs-mdx/next"');
		expect(nextConfig).toContain("createMDX");
		expect(nextConfig).toMatch(/createMDX\s*\(\s*\)/);
		expect(nextConfig).not.toMatch(/configPath\s*:/);
		expect(nextConfig).toContain("reactStrictMode: true");
		expect(nextConfig).toContain("docs-V2/docs/fumadocs-mdx-next.md");
		expect(nextConfig).not.toMatch(/fumadocs-mdx\/vite|@fumadocs\/mdx\/vite/);

		const tsconfig = JSON.parse(
			readFileSync(join(appDir, "tsconfig.json"), "utf8"),
		) as {
			readonly compilerOptions?: {
				readonly baseUrl?: string;
				readonly paths?: Record<string, readonly string[]>;
			};
		};
		expect(tsconfig.compilerOptions?.baseUrl).toBeUndefined();
		expect(tsconfig.compilerOptions?.paths?.["collections/*"]).toEqual([
			"./.source/*",
		]);
		expect(tsconfig.compilerOptions?.paths?.["@/*"]).toEqual(["./*"]);

		const sourceSource = readFileSync(sourcePath, "utf8");
		expect(sourceSource).toContain('from "collections/server"');
		expect(sourceSource).toContain("docs.toFumadocsSource()");
		expect(sourceSource).toContain('baseUrl: "/docs"');

		expect(existsSync(join(appDir, "content/docs"))).toBe(true);
		expect(existsSync(join(appDir, "vite.config.ts"))).toBe(false);
		expect(existsSync(join(appDir, "vite.config.mts"))).toBe(false);
	});

	it("locks Content Source (Fumadocs MDX Loader · no CMS / low-level)", () => {
		const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
			readonly dependencies?: Record<string, string>;
			readonly devDependencies?: Record<string, string>;
		};
		expect(typeof pkg.dependencies?.["fumadocs-mdx"]).toBe("string");
		const bannedCms = [
			"basehub",
			"fumadocs-basehub",
			"@fumadocs/sanity",
			"next-sanity",
			"sanity",
			"fumadocs-sanity",
			"@portabletext/react",
			"payload",
			"@payloadcms/next",
			"fumadocs-payloadcms",
		] as const;
		for (const name of bannedCms) {
			expect(pkg.dependencies?.[name]).toBeUndefined();
			expect(pkg.devDependencies?.[name]).toBeUndefined();
		}

		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).toContain('from "fumadocs-mdx/config"');
		expect(sourceConfig).toContain("defineDocs");
		expect(sourceConfig).toContain('dir: "content/docs"');

		const sourceSource = readFileSync(sourcePath, "utf8");
		expect(sourceSource).toContain('from "collections/server"');
		expect(sourceSource).toContain("docs.toFumadocsSource()");
		expect(sourceSource).toContain("openapi.loaderPlugin()");
		expect(sourceSource).not.toMatch(/basehub|sanity|payload/i);

		const nextConfig = readFileSync(join(appDir, "next.config.mjs"), "utf8");
		expect(nextConfig).toContain("fumadocs-mdx/next");
		expect(nextConfig).toContain("createMDX");

		expect(existsSync(join(appDir, "content/docs"))).toBe(true);
		expect(existsSync(join(appDir, "content/docs/meta.json"))).toBe(true);
		expect(existsSync(join(appDir, "lib/my-content-source.ts"))).toBe(false);
		expect(existsSync(join(appDir, "lib/content-source.ts"))).toBe(false);

		const docsLayout = readFileSync(join(appDir, "app/docs/layout.tsx"), "utf8");
		expect(docsLayout).toContain("tree={source.pageTree}");
		expect(docsLayout).not.toMatch(/tree=\{\{/);
		expect(docsLayout).not.toMatch(/getPageTree\s*\(/);

		const page = readFileSync(docsPagePath, "utf8");
		expect(page).toContain("source.getPage(params.slug)");
		expect(page).toContain("page.data.body");
		expect(page).toContain("page.data.toc");
		expect(page).toContain("generateStaticParams");
		expect(page).not.toMatch(/my-content-source|getTableOfContents/);
		expect(page).not.toMatch(/from\s+["']@\/lib\/my-content-source["']/);

		for (const root of ["lib", "app", "components"] as const) {
			const dir = join(appDir, root);
			if (!existsSync(dir)) {
				continue;
			}
			for (const file of collectSourceFiles(dir)) {
				const body = readFileSync(file, "utf8");
				expect(body).not.toMatch(
					/from\s+["'](?:basehub|next-sanity|sanity|@fumadocs\/sanity|@portabletext\/react|payload|@payloadcms\/|fumadocs-basehub|fumadocs-sanity)["']/,
				);
			}
		}
	});

	it("locks Sanity Outside baseline (Fumadocs MDX only)", () => {
		const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
			readonly dependencies?: Record<string, string>;
			readonly devDependencies?: Record<string, string>;
		};
		expect(typeof pkg.dependencies?.["fumadocs-mdx"]).toBe("string");
		for (const name of [
			"@fumadocs/sanity",
			"sanity",
			"next-sanity",
			"fumadocs-sanity",
			"@portabletext/react",
		] as const) {
			expect(pkg.dependencies?.[name]).toBeUndefined();
			expect(pkg.devDependencies?.[name]).toBeUndefined();
		}

		expect(existsSync(join(appDir, "sanity"))).toBe(false);
		expect(existsSync(join(appDir, "lib/sanity"))).toBe(false);
		expect(existsSync(join(appDir, "components/sanity.ts"))).toBe(false);
		expect(existsSync(join(appDir, "components/sanity.tsx"))).toBe(false);
		expect(existsSync(join(appDir, "schemaTypes"))).toBe(false);

		const sourceSource = readFileSync(sourcePath, "utf8");
		expect(sourceSource).toContain("docs.toFumadocsSource()");
		expect(sourceSource).toContain("export const source = loader(");
		expect(sourceSource).not.toMatch(/\bcreateSanitySource\b/);
		expect(sourceSource).not.toMatch(/\bdynamicLoader\b/);
		expect(sourceSource).not.toMatch(/\bgetSource\s*\(/);
		expect(sourceSource).not.toMatch(/\bsanityFetch\b/);
		expect(sourceSource).not.toMatch(
			/from\s+["']@fumadocs\/sanity(?:\/[^"']*)?["']/,
		);

		const page = readFileSync(docsPagePath, "utf8");
		expect(page).toContain("page.data.body");
		expect(page).toContain("page.data.toc");
		expect(page).not.toMatch(/\bCustomPortableText\b/);
		expect(page).not.toMatch(/\bPortableText\b/);
		expect(page).not.toMatch(/page\.data\.load\s*\(/);
		expect(page).not.toMatch(/\brenderToc\b/);

		const docsLayout = readFileSync(join(appDir, "app/docs/layout.tsx"), "utf8");
		expect(docsLayout).toContain("tree={source.pageTree}");
		expect(docsLayout).not.toMatch(/\bgetSource\s*\(/);

		for (const root of ["lib", "app", "components", "scripts"] as const) {
			const dir = join(appDir, root);
			if (!existsSync(dir)) {
				continue;
			}
			for (const file of collectSourceFiles(dir)) {
				const body = readFileSync(file, "utf8");
				expect(body).not.toMatch(
					/from\s+["']@fumadocs\/sanity(?:\/[^"']*)?["']/,
				);
				expect(body).not.toMatch(/\bcreateSanitySource\b/);
				expect(body).not.toMatch(/fumadocs\/sanity\//);
			}
		}
	});

	it("locks Local Markdown Outside baseline (Fumadocs MDX only)", () => {
		const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
			readonly dependencies?: Record<string, string>;
			readonly devDependencies?: Record<string, string>;
			readonly scripts?: Record<string, string>;
		};
		expect(typeof pkg.dependencies?.["fumadocs-mdx"]).toBe("string");
		expect(pkg.dependencies?.["@fumadocs/local-md"]).toBeUndefined();
		expect(pkg.devDependencies?.["@fumadocs/local-md"]).toBeUndefined();
		expect(pkg.scripts?.dev ?? "").not.toMatch(/\blocal-md\b/);

		const sourceSource = readFileSync(sourcePath, "utf8");
		expect(sourceSource).toContain("export const source = loader(");
		expect(sourceSource).toContain("docs.toFumadocsSource()");
		expect(sourceSource).not.toMatch(/\blocalMd\s*\(/);
		expect(sourceSource).not.toMatch(/\bdynamicLoader\b/);
		expect(sourceSource).not.toMatch(/\bgetSource\s*\(/);
		expect(sourceSource).not.toMatch(/\bdevServer\s*\(/);
		expect(sourceSource).not.toMatch(/\bdynamicSource\s*\(/);
		expect(sourceSource).not.toMatch(/\bstaticSource\s*\(/);
		expect(sourceSource).not.toMatch(
			/from\s+["']@fumadocs\/local-md(?:\/[^"']*)?["']/,
		);
		expect(sourceSource).not.toMatch(
			/from\s+["']fumadocs-core\/source\/dynamic["']/,
		);

		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).toContain("defineDocs");
		expect(existsSync(sourceConfigPath)).toBe(true);

		const nextConfig = readFileSync(join(appDir, "next.config.mjs"), "utf8");
		expect(nextConfig).toContain("createMDX");

		const docsLayout = readFileSync(join(appDir, "app/docs/layout.tsx"), "utf8");
		expect(docsLayout).toContain("tree={source.pageTree}");
		expect(docsLayout).not.toMatch(/\bgetSource\s*\(/);
		expect(docsLayout).not.toMatch(/getPageTree\s*\(/);

		const page = readFileSync(docsPagePath, "utf8");
		expect(page).toContain("page.data.body");
		expect(page).toContain("page.data.toc");
		expect(page).not.toMatch(/page\.data\.load\s*\(/);
		expect(page).not.toMatch(/page\.data\.frontmatter/);
		expect(page).not.toMatch(/\brendererFromSerialized\b/);
		expect(page).not.toMatch(/\buseFumadocsLoader\b/);

		for (const root of ["lib", "app", "components"] as const) {
			const dir = join(appDir, root);
			if (!existsSync(dir)) {
				continue;
			}
			for (const file of collectSourceFiles(dir)) {
				const body = readFileSync(file, "utf8");
				expect(body).not.toMatch(
					/from\s+["']@fumadocs\/local-md(?:\/[^"']*)?["']/,
				);
				expect(body).not.toMatch(/\blocalMd\s*\(/);
				expect(body).not.toMatch(/\brendererFromSerialized\b/);
			}
		}
	});

	it("locks Page Tree Utils (source.pageTree · no fumadocs-core/page-tree helpers)", () => {
		const docsLayout = readFileSync(join(appDir, "app/docs/layout.tsx"), "utf8");
		expect(docsLayout).toContain("tree={source.pageTree}");
		expect(docsLayout).not.toMatch(/tree=\{\{/);
		expect(docsLayout).not.toMatch(
			/from\s+["']fumadocs-core\/page-tree["']/,
		);

		for (const root of ["lib", "app", "components"] as const) {
			const dir = join(appDir, root);
			if (!existsSync(dir)) {
				continue;
			}
			for (const file of collectSourceFiles(dir)) {
				const body = readFileSync(file, "utf8");
				expect(body).not.toMatch(
					/from\s+["']fumadocs-core\/page-tree["']/,
				);
				expect(body).not.toMatch(/\bfindNeighbour\b/);
				expect(body).not.toMatch(/\bfindSiblings\b/);
				expect(body).not.toMatch(/\bgetPageTreeRoots\b/);
				expect(body).not.toMatch(/\bfindParent\b/);
				expect(body).not.toMatch(/\bfindPath\s*\(/);
			}
		}
	});

	it("locks Get TOC Active path (page.data.toc · no getTableOfContents)", () => {
		const page = readFileSync(docsPagePath, "utf8");
		expect(page).toContain("toc={page.data.toc}");
		expect(page).toContain("items={page.data.toc}");
		expect(page).not.toMatch(/\bgetTableOfContents\b/);
		expect(page).not.toMatch(/fumadocs-core\/content\/toc/);

		const inlineToc = readFileSync(join(appDir, "components/inline-toc.tsx"), "utf8");
		expect(inlineToc).toMatch(
			/from\s+["']fumadocs-core\/toc["']/,
		);
		expect(inlineToc).toMatch(/import\s+type\s+\{\s*TOCItemType\s*\}/);
		expect(inlineToc).not.toMatch(/\bgetTableOfContents\b/);
		expect(inlineToc).not.toMatch(/fumadocs-core\/content\/toc/);

		for (const root of ["lib", "app", "components"] as const) {
			const dir = join(appDir, root);
			if (!existsSync(dir)) {
				continue;
			}
			for (const file of collectSourceFiles(dir)) {
				const body = readFileSync(file, "utf8");
				expect(body).not.toMatch(/\bgetTableOfContents\b/);
				expect(body).not.toMatch(
					/from\s+["']fumadocs-core\/content\/toc["']/,
				);
			}
		}
	});

	it("locks MDX Remote Outside baseline (Fumadocs MDX only)", () => {
		const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
			readonly dependencies?: Record<string, string>;
			readonly devDependencies?: Record<string, string>;
		};
		expect(typeof pkg.dependencies?.["fumadocs-mdx"]).toBe("string");
		expect(pkg.dependencies?.["@fumadocs/mdx-remote"]).toBeUndefined();
		expect(pkg.devDependencies?.["@fumadocs/mdx-remote"]).toBeUndefined();
		expect(pkg.dependencies?.["next-mdx-remote"]).toBeUndefined();
		expect(pkg.devDependencies?.["next-mdx-remote"]).toBeUndefined();

		const page = readFileSync(docsPagePath, "utf8");
		expect(page).toContain("source.getPage(params.slug)");
		expect(page).toContain("page.data.body");
		expect(page).not.toMatch(/\bcreateCompiler\b/);
		expect(page).not.toMatch(/\bexecuteMdxSync\b/);
		expect(page).not.toMatch(/compiler\.compile\s*\(/);
		expect(page).not.toMatch(/skipRender\s*:\s*true/);

		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).toContain("defineDocs");
		const nextConfig = readFileSync(join(appDir, "next.config.mjs"), "utf8");
		expect(nextConfig).toContain("createMDX");

		for (const root of ["lib", "app", "components"] as const) {
			const dir = join(appDir, root);
			if (!existsSync(dir)) {
				continue;
			}
			for (const file of collectSourceFiles(dir)) {
				const body = readFileSync(file, "utf8");
				expect(body).not.toMatch(
					/from\s+["']@fumadocs\/mdx-remote(?:\/[^"']*)?["']/,
				);
				expect(body).not.toMatch(/from\s+["']next-mdx-remote(?:\/[^"']*)?["']/);
				expect(body).not.toMatch(/\bcreateCompiler\s*\(/);
				expect(body).not.toMatch(/\bexecuteMdxSync\b/);
			}
		}
	});

	it("locks Content Collections Outside baseline (Fumadocs MDX only)", () => {
		const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
			readonly dependencies?: Record<string, string>;
			readonly devDependencies?: Record<string, string>;
		};
		expect(typeof pkg.dependencies?.["fumadocs-mdx"]).toBe("string");
		const bannedCc = [
			"@content-collections/core",
			"@content-collections/mdx",
			"@content-collections/next",
			"@fumadocs/content-collections",
		] as const;
		for (const name of bannedCc) {
			expect(pkg.dependencies?.[name]).toBeUndefined();
			expect(pkg.devDependencies?.[name]).toBeUndefined();
		}

		expect(existsSync(join(appDir, "content-collections.ts"))).toBe(false);
		expect(existsSync(join(appDir, "content-collections.mjs"))).toBe(false);

		const sourceSource = readFileSync(sourcePath, "utf8");
		expect(sourceSource).toContain('from "collections/server"');
		expect(sourceSource).toContain("docs.toFumadocsSource()");
		expect(sourceSource).not.toMatch(/createMDXSource/);
		expect(sourceSource).not.toMatch(/allDocs|allMetas/);
		expect(sourceSource).not.toMatch(
			/from\s+["']content-collections["']|from\s+["']@fumadocs\/content-collections/,
		);

		const page = readFileSync(docsPagePath, "utf8");
		expect(page).toContain("page.data.body");
		expect(page).not.toMatch(/MDXContent|@content-collections\/mdx/);

		for (const root of ["lib", "app", "components"] as const) {
			const dir = join(appDir, root);
			if (!existsSync(dir)) {
				continue;
			}
			for (const file of collectSourceFiles(dir)) {
				const body = readFileSync(file, "utf8");
				expect(body).not.toMatch(
					/from\s+["']@content-collections\/(?:core|mdx|next)(?:\/[^"']*)?["']/,
				);
				expect(body).not.toMatch(
					/from\s+["']@fumadocs\/content-collections(?:\/[^"']*)?["']/,
				);
				expect(body).not.toMatch(/from\s+["']content-collections["']/);
				expect(body).not.toMatch(/\bcreateMDXSource\s*\(/);
			}
		}
	});

	it("locks RSS Feed Active path (guide pages · lastModified · no OpenAPI ops)", () => {
		expect(existsSync(join(appDir, "lib/rss.ts"))).toBe(true);
		expect(existsSync(join(appDir, "app/rss.xml/route.ts"))).toBe(true);

		const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
			readonly dependencies?: Record<string, string>;
			readonly devDependencies?: Record<string, string>;
		};
		expect(pkg.dependencies?.feed).toBeDefined();

		const rss = readFileSync(join(appDir, "lib/rss.ts"), "utf8");
		expect(rss).toContain('from "feed"');
		expect(rss).toContain("from \"@afenda/env/docs\"");
		expect(rss).toContain("docsEnv.DOCS_URL");
		expect(rss).toContain("getRSS");
		expect(rss).toContain('slugs[0] !== "api"');
		expect(rss).toContain("lastModified");
		expect(rss).not.toMatch(/\bprocess\.env\b/);
		expect(rss).not.toMatch(/\bAPP_URL\b/);
		expect(rss).not.toMatch(/\bgetGithubLastEdit\b/);

		const route = readFileSync(join(appDir, "app/rss.xml/route.ts"), "utf8");
		expect(route).toContain("getRSS");
		expect(route).toContain("revalidate = false");
		expect(route).toContain("application/rss+xml");

		const layout = readFileSync(rootLayoutPath, "utf8");
		expect(layout).toContain("application/rss+xml");
		expect(layout).toContain("/rss.xml");
		expect(layout).toMatch(/\balternates\s*:/);

		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).toContain(
			'from "fumadocs-mdx/plugins/last-modified"',
		);
		expect(sourceConfig).toMatch(/plugins:\s*\[\s*lastModified\s*\(\s*\)\s*\]/);
		expect(sourceConfig).toContain("docs-V2/docs/rss.md");
	});

	it("locks Last Modified Time Outside baseline (no GitHub Commits last-edit UI)", () => {
		const page = readFileSync(docsPagePath, "utf8");
		expect(page).toContain("<DocsPage toc={page.data.toc} full={page.data.full}>");
		expect(page).not.toMatch(/\blastUpdate\b/);
		expect(page).not.toMatch(/\bgetGithubLastEdit\b/);
		expect(page).not.toMatch(/\bPageLastUpdate\b/);
		expect(page).not.toMatch(/fumadocs-core\/content\/github/);
		expect(page).not.toMatch(/\bGIT_TOKEN\b/);

		const docsEnvPath = join(appDir, "../../packages/env/src/docs.ts");
		const docsEnvSource = readFileSync(docsEnvPath, "utf8");
		expect(docsEnvSource).toContain("DOCS_URL");
		expect(docsEnvSource).toContain("GITHUB_APP_ID");
		expect(docsEnvSource).toContain("GITHUB_APP_PRIVATE_KEY");
		expect(docsEnvSource).not.toMatch(
			/(?:GIT_TOKEN|GITHUB_TOKEN)\s*:/,
		);
		expect(docsEnvSource).not.toMatch(
			/process\.env\.(?:GIT_TOKEN|GITHUB_TOKEN)\b/,
		);

		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).toContain(
			'from "fumadocs-mdx/plugins/last-modified"',
		);
		expect(sourceConfig).toContain("docs-V2/docs/rss.md");
		expect(sourceConfig).toContain("git-last-edit.md");

		for (const root of ["lib", "app", "components"] as const) {
			const dir = join(appDir, root);
			if (!existsSync(dir)) {
				continue;
			}
			for (const file of collectSourceFiles(dir)) {
				const body = readFileSync(file, "utf8");
				expect(body).not.toMatch(/\bgetGithubLastEdit\b/);
				expect(body).not.toMatch(
					/from\s+["']fumadocs-core\/content\/github["']/,
				);
			}
		}
	});

	it("locks AsyncAPI Outside baseline (OpenAPI-only API docs)", () => {
		const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
			readonly dependencies?: Record<string, string>;
			readonly devDependencies?: Record<string, string>;
			readonly scripts?: Record<string, string>;
		};
		expect(pkg.dependencies?.["@fumadocs/asyncapi"]).toBeUndefined();
		expect(pkg.devDependencies?.["@fumadocs/asyncapi"]).toBeUndefined();
		for (const script of Object.values(pkg.scripts ?? {})) {
			expect(script).not.toMatch(/asyncapi/i);
		}

		expect(existsSync(join(appDir, "lib/asyncapi.ts"))).toBe(false);
		expect(existsSync(join(appDir, "lib/asyncapi.tsx"))).toBe(false);
		expect(existsSync(join(appDir, "lib/asyncapi.server.ts"))).toBe(false);
		expect(existsSync(join(appDir, "asyncapi.yaml"))).toBe(false);
		expect(existsSync(join(appDir, "asyncapi.yml"))).toBe(false);
		expect(existsSync(join(appDir, "content/docs/asyncapi"))).toBe(false);
		expect(existsSync(join(appDir, "../../docs-V2/api/asyncapi.yaml"))).toBe(
			false,
		);
		expect(existsSync(join(appDir, "../../docs-V2/api/asyncapi.yml"))).toBe(
			false,
		);

		const scriptsDir = join(appDir, "scripts");
		if (existsSync(scriptsDir)) {
			for (const entry of readdirSync(scriptsDir)) {
				expect(entry.toLowerCase().includes("asyncapi")).toBe(false);
			}
		}

		const css = readFileSync(globalCssPath, "utf8");
		expect(css).toContain("fumadocs-openapi/css/preset.css");
		expect(css).not.toMatch(/@fumadocs\/asyncapi/);

		const openApiServer = readFileSync(openApiServerPath, "utf8");
		expect(openApiServer).toContain("createOpenAPI");
		expect(openApiServer).toContain("fumadocs-openapi/server");
		expect(openApiServer).toContain("openapi-document-id");
		expect(readFileSync(openApiDocumentIdPath, "utf8")).toContain(
			OPENAPI_DOCUMENT_ID,
		);
		expect(openApiServer).not.toMatch(/@fumadocs\/asyncapi|createAsyncAPI/);
		expect(openApiServer).not.toMatch(/disableCache/);

		const sourceSource = readFileSync(sourcePath, "utf8");
		expect(sourceSource).toContain("openapi.loaderPlugin()");
		expect(sourceSource).not.toMatch(/@fumadocs\/asyncapi/);
		expect(sourceSource).not.toMatch(/createAsyncAPI|asyncapiPlugin/);
		expect(sourceSource).not.toMatch(/asyncapi\.loaderPlugin|asyncapi\.staticSource/);

		expect(existsSync(join(appDir, "components/asyncapi-page.tsx"))).toBe(
			false,
		);
		expect(existsSync(join(appDir, "components/async-api-page.tsx"))).toBe(
			false,
		);

		const apiPage = readFileSync(join(appDir, "components/api-page.tsx"), "utf8");
		expect(apiPage).toContain("createOpenAPIPage");
		expect(apiPage).toContain("OpenAPIPreloadProvider");
		expect(apiPage).toContain("fumadocs-openapi");
		expect(apiPage).toContain('"use client"');
		expect(apiPage).not.toMatch(/@fumadocs\/asyncapi|createAsyncAPIPage/);
		expect(apiPage).not.toMatch(/renderOperationLayout|asyncapiTranslations/);
		expect(apiPage).not.toMatch(/schemaUI\s*:/);

		const mdx = readFileSync(mdxComponentsPath, "utf8");
		expect(mdx).toContain("APIPage");
		expect(mdx).toContain("OpenAPIPage");
		expect(mdx).not.toMatch(/AsyncAPIPage|@fumadocs\/asyncapi/);

		const shared = readFileSync(layoutSharedPath, "utf8");
		expect(shared).not.toMatch(/asyncapiTranslations|@fumadocs\/asyncapi/);

		expect(existsSync(generateScriptPath)).toBe(true);
		const generateSource = readFileSync(generateScriptPath, "utf8");
		expect(generateSource).toContain("fumadocs-openapi");
		expect(generateSource).toContain("generateFiles");
		expect(generateSource).not.toMatch(/@fumadocs\/asyncapi/);
		expect(generateSource).not.toMatch(/fromExtractedOperation|OperationOutput/);
		expect(generateSource).not.toMatch(/_asyncapi|includeDescription/);

		const contentApiDir = join(appDir, "content/docs/api");
		expect(existsSync(contentApiDir)).toBe(true);
		for (const entry of readdirSync(contentApiDir)) {
			if (!entry.endsWith(".mdx")) {
				continue;
			}
			const body = readFileSync(join(contentApiDir, entry), "utf8");
			expect(body).not.toMatch(/\b_asyncapi\s*:/);
			if (entry !== "index.mdx") {
				expect(body).toMatch(/\b_openapi\s*:/);
			}
		}

		expect(pkg.scripts?.["generate:openapi-docs"]).toBeDefined();
		expect(pkg.scripts?.["generate:asyncapi-docs"]).toBeUndefined();
	});

	it("locks TypeScript integration (UI AutoTypeTable · no remark plugin)", () => {
		const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
			readonly dependencies?: Record<string, string>;
		};
		expect(typeof pkg.dependencies?.["fumadocs-typescript"]).toBe("string");

		const docsTypescriptPath = join(appDir, "lib/docs-typescript.ts");
		expect(existsSync(docsTypescriptPath)).toBe(true);
		const docsTypescript = readFileSync(docsTypescriptPath, "utf8");
		expect(docsTypescript).toContain("createGenerator");
		expect(docsTypescript).toContain("createFileSystemGeneratorCache");
		expect(docsTypescript).toContain(".next/fumadocs-typescript");
		expect(docsTypescript).toContain('tsconfigPath: "./tsconfig.json"');
		expect(docsTypescript).toContain("export const docsTypeGenerator");
		expect(docsTypescript).not.toMatch(
			/import\s*\{[^}]*remarkAutoTypeTable|remarkPlugins:\s*\[[^\]]*remarkAutoTypeTable/,
		);

		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).not.toMatch(
			/import\s*\{[^}]*remarkAutoTypeTable|remarkPlugins:\s*\[[^\]]*remarkAutoTypeTable/,
		);
		expect(sourceConfig).not.toMatch(/from\s+["']fumadocs-typescript["']/);
		expect(sourceConfig).not.toMatch(/satteri|Satteri/);

		const mdx = readFileSync(mdxComponentsPath, "utf8");
		expect(mdx).toContain('from "fumadocs-typescript/ui"');
		expect(mdx).toContain("AutoTypeTable");
		expect(mdx).toContain("docsTypeGenerator");
		expect(mdx).toContain("generator={docsTypeGenerator}");
		expect(mdx).toContain('@/components/type-table');
		expect(mdx).toContain("TypeTable");
		expect(mdx).toContain("AutoTypeTable: (props) => (");

		expect(existsSync(join(appDir, "lib/demo-types.ts"))).toBe(true);
		const demoTypes = readFileSync(join(appDir, "lib/demo-types.ts"), "utf8");
		expect(demoTypes).toContain("export type DocsProjectRule");
		expect(demoTypes).toContain("@internal");
		expect(demoTypes).toContain("@remarks");

		const guide = readFileSync(guideMdxPath, "utf8");
		expect(guide).toContain("<AutoTypeTable");
		expect(guide).toContain('path="lib/demo-types.ts"');
		expect(guide).toContain('name="DocsProjectRule"');
		expect(guide).toContain("<TypeTable");
		expect(guide).not.toMatch(/<auto-type-table/i);

		expect(existsSync(join(appDir, "components/type-table.tsx"))).toBe(true);
	});

	it("locks Internationalization Outside baseline (English-only Next.js)", () => {
		expect(existsSync(join(appDir, "lib/i18n.ts"))).toBe(false);
		expect(existsSync(join(appDir, "lib/i18n.tsx"))).toBe(false);
		expect(existsSync(join(appDir, "proxy.ts"))).toBe(false);
		expect(existsSync(join(appDir, "middleware.ts"))).toBe(false);
		expect(existsSync(join(appDir, "app/[lang]"))).toBe(false);
		expect(existsSync(join(appDir, "app/[locale]"))).toBe(false);

		const contentDocs = join(appDir, "content/docs");
		expect(existsSync(join(contentDocs, "en"))).toBe(false);
		expect(existsSync(join(contentDocs, "cn"))).toBe(false);
		expect(existsSync(join(contentDocs, "zh"))).toBe(false);

		const sourceSource = readFileSync(sourcePath, "utf8");
		expect(sourceSource).toContain("export const source = loader(");
		expect(sourceSource).not.toMatch(/\bi18n\s*,/);
		expect(sourceSource).not.toMatch(/\bi18n\s*:/);
		expect(sourceSource).not.toMatch(/defineI18n|createI18nMiddleware/);

		const docsLayout = readFileSync(join(appDir, "app/docs/layout.tsx"), "utf8");
		expect(docsLayout).toContain("tree={source.pageTree}");
		expect(docsLayout).toContain("{...baseOptions()}");
		expect(docsLayout).not.toMatch(/getPageTree\s*\(/);
		expect(docsLayout).not.toMatch(/baseOptions\s*\(\s*lang/);
		expect(docsLayout).not.toMatch(/baseOptions\s*\(\s*locale/);
		expect(docsLayout).not.toMatch(/params:\s*Promise<\{[^}]*lang/);

		const shared = readFileSync(layoutSharedPath, "utf8");
		expect(shared).toContain("export function baseOptions()");
		expect(shared).not.toMatch(/baseOptions\s*\(\s*locale/);
		expect(shared).not.toMatch(/uiTranslations|i18nProvider/);
		expect(shared).not.toMatch(/\.translations\s*\(/);

		const layout = readFileSync(rootLayoutPath, "utf8");
		expect(layout).toContain('lang="en"');
		expect(layout).toContain("<RootProvider>{children}</RootProvider>");
		expect(layout).not.toMatch(/\bi18n\s*=/);
		expect(layout).not.toMatch(/from\s+["']fumadocs-ui\/i18n["']/);
		expect(layout).not.toMatch(/i18n=\{/);

		const page = readFileSync(docsPagePath, "utf8");
		expect(page).not.toMatch(/getPage\s*\([^)]+,\s*lang/);
		expect(page).not.toMatch(/getPages\s*\(\s*lang/);
		expect(page).not.toMatch(/generateParams\s*\(\s*["']slug["']\s*,/);

		const searchSource = readFileSync(searchRoutePath, "utf8");
		expect(searchSource).toContain('language: "english"');
		expect(searchSource).not.toMatch(/\blocale\b/);

		const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
			readonly dependencies?: Record<string, string>;
			readonly devDependencies?: Record<string, string>;
		};
		expect(pkg.dependencies?.["@fumadocs/i18n"]).toBeUndefined();
		expect(pkg.devDependencies?.["@fumadocs/i18n"]).toBeUndefined();

		for (const file of collectSourceFiles(join(appDir, "app"))) {
			const body = readFileSync(file, "utf8");
			expect(body).not.toMatch(/createI18nMiddleware|defineI18n/);
			expect(body).not.toMatch(/from\s+["']fumadocs-ui\/i18n["']/);
			expect(body).not.toMatch(/from\s+["']fumadocs-core\/dynamic-link["']/);
		}
		for (const file of collectSourceFiles(join(appDir, "lib"))) {
			const body = readFileSync(file, "utf8");
			expect(body).not.toMatch(/createI18nMiddleware|defineI18n/);
			expect(body).not.toMatch(/from\s+["']fumadocs-ui\/i18n["']/);
		}
	});

	it("locks Deploying baseline (Vercel Node · no Edge/static/Docker)", () => {
		const vercelJsonPath = join(appDir, "vercel.json");
		expect(existsSync(vercelJsonPath)).toBe(true);
		const vercel = JSON.parse(readFileSync(vercelJsonPath, "utf8")) as {
			readonly framework?: string;
			readonly regions?: readonly string[];
			readonly installCommand?: string;
			readonly buildCommand?: string;
			readonly ignoreCommand?: string;
		};
		expect(vercel.framework).toBe("nextjs");
		expect(vercel.regions).toEqual(["sin1"]);
		expect(vercel.installCommand).toContain("pnpm install --frozen-lockfile");
		expect(vercel.buildCommand).toContain("--filter=@afenda/docs");
		expect(vercel.ignoreCommand).toContain("VERCEL_ENV");
		expect(vercel.ignoreCommand).toContain("production");

		expect(existsSync(join(appDir, "source.config.ts"))).toBe(true);
		expect(existsSync(join(appDir, "next.config.mjs"))).toBe(true);
		expect(existsSync(join(appDir, "Dockerfile"))).toBe(false);
		expect(existsSync(join(appDir, "dockerfile"))).toBe(false);

		const nextConfig = readFileSync(join(appDir, "next.config.mjs"), "utf8");
		expect(nextConfig).toContain("createMDX");
		expect(nextConfig).not.toMatch(/output\s*:\s*["']export["']/);
		expect(nextConfig).not.toMatch(/output\s*:\s*["']standalone["']/);

		const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
			readonly dependencies?: Record<string, string>;
			readonly devDependencies?: Record<string, string>;
		};
		expect(pkg.dependencies?.["@opennextjs/cloudflare"]).toBeUndefined();
		expect(pkg.devDependencies?.["@opennextjs/cloudflare"]).toBeUndefined();
		expect(pkg.dependencies?.wrangler).toBeUndefined();
		expect(pkg.devDependencies?.wrangler).toBeUndefined();

		for (const root of PRODUCT_SOURCE_ROOTS) {
			const dir = join(appDir, root);
			if (!existsSync(dir)) {
				continue;
			}
			for (const file of collectSourceFiles(dir)) {
				const body = readFileSync(file, "utf8");
				expect(body).not.toMatch(/runtime\s*=\s*["']edge["']/);
				expect(body).not.toMatch(/@opennextjs\/cloudflare/);
			}
		}
	});

	it("locks MDX Plugins (defaults + remarkBlockId only)", () => {
		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).toContain('providerImportSource: "@/components/mdx"');
		expect(sourceConfig).toContain(
			'fumadocs-core/mdx-plugins/remark-block-id',
		);
		expect(sourceConfig).toContain("remarkBlockId");
		expect(sourceConfig).toContain('addDataAttribute: "feedback"');
		expect(sourceConfig).toMatch(
			/remarkPlugins:\s*\[\s*\[\s*remarkBlockId/,
		);
		expect(sourceConfig).not.toMatch(/rehypePlugins\s*:/);
		expect(sourceConfig).not.toMatch(/remarkCodeTabOptions/);
		expect(sourceConfig).not.toMatch(/parseMdx\s*:\s*true/);
		expect(sourceConfig).not.toMatch(/remark-steps|remarkSteps/);
		expect(sourceConfig).not.toMatch(/remarkAutoTypeTable/);
		expect(sourceConfig).not.toMatch(/remarkInstall|fumadocs-docgen/);
		expect(sourceConfig).not.toMatch(
			/remarkAdmonition|remarkDirectiveAdmonition|remark-admonition|remark-directive/,
		);
		expect(sourceConfig).not.toMatch(
			/remarkTs2js|remark-ts2js|remarkTypeScriptToJavaScript/,
		);
		expect(sourceConfig).not.toMatch(/oxc-transform/);
		expect(sourceConfig).not.toMatch(/remarkMdxFiles|remark-mdx-files/);
		expect(sourceConfig).not.toMatch(/\bremarkLLMs\b/);
		expect(sourceConfig).not.toMatch(
			/from\s+["']fumadocs-core\/mdx-plugins\/remark-llms/,
		);
		expect(sourceConfig).not.toMatch(/mdxAsPlaceholder/);
		expect(sourceConfig).not.toMatch(/includeProcessedMarkdown\s*:\s*\{/);
		expect(sourceConfig).not.toMatch(/\bremarkHeading\b/);
		expect(sourceConfig).not.toMatch(/\brehypeToc\b/);
		expect(sourceConfig).not.toMatch(/generateToc\s*:\s*false/);
		expect(sourceConfig).not.toMatch(/\brehypeCode\b/);
		expect(sourceConfig).not.toMatch(/rehypeCodeOptions/);
		expect(sourceConfig).not.toMatch(/\bremarkImage\b/);
		expect(sourceConfig).not.toMatch(/useImport\s*:/);
		expect(sourceConfig).not.toMatch(/publicDir\s*:/);
		expect(sourceConfig).not.toMatch(/\bremarkStructure\b/);
		expect(sourceConfig).not.toMatch(/remarkStructureOptions/);
		expect(sourceConfig).toContain("docs-V2/docs/remark-structure.md");

		const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
			readonly dependencies?: Record<string, string>;
			readonly devDependencies?: Record<string, string>;
		};
		expect(pkg.dependencies?.["fumadocs-docgen"]).toBeUndefined();
		expect(pkg.devDependencies?.["fumadocs-docgen"]).toBeUndefined();
		expect(pkg.dependencies?.["oxc-transform"]).toBeUndefined();
		expect(pkg.devDependencies?.["oxc-transform"]).toBeUndefined();
		expect(pkg.dependencies?.["@fumadocs/satteri"]).toBeUndefined();
		expect(pkg.devDependencies?.["@fumadocs/satteri"]).toBeUndefined();
		expect(pkg.dependencies?.["remark-directive"]).toBeUndefined();
		expect(pkg.devDependencies?.["remark-directive"]).toBeUndefined();
	});

	it("locks Remark TS→JS Outside baseline (no oxc-transform · hand Tabs)", () => {
		const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
			readonly dependencies?: Record<string, string>;
			readonly devDependencies?: Record<string, string>;
		};
		expect(pkg.dependencies?.["fumadocs-docgen"]).toBeUndefined();
		expect(pkg.devDependencies?.["fumadocs-docgen"]).toBeUndefined();
		expect(pkg.dependencies?.["oxc-transform"]).toBeUndefined();
		expect(pkg.devDependencies?.["oxc-transform"]).toBeUndefined();
		expect(pkg.dependencies?.["@fumadocs/satteri"]).toBeUndefined();
		expect(pkg.devDependencies?.["@fumadocs/satteri"]).toBeUndefined();

		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).toMatch(
			/remarkPlugins:\s*\[\s*\[\s*remarkBlockId/,
		);
		expect(sourceConfig).not.toMatch(/\bremarkTypeScriptToJavaScript\b/);
		expect(sourceConfig).not.toMatch(/\bremarkTs2js\b/);
		expect(sourceConfig).not.toMatch(/oxc-transform/);
		expect(sourceConfig).toContain("hand Tabs only");

		const nextConfig = readFileSync(join(appDir, "next.config.mjs"), "utf8");
		expect(nextConfig).not.toMatch(/oxc-transform/);
		expect(nextConfig).not.toMatch(/serverExternalPackages/);

		const mdx = readFileSync(mdxComponentsPath, "utf8");
		expect(mdx).toContain("Tab");
		expect(mdx).toContain("Tabs");
	});

	it("locks Remark LLMs Active path (includeProcessedMarkdown boolean · no LLMsOptions)", () => {
		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).toContain("includeProcessedMarkdown: true");
		expect(sourceConfig).not.toMatch(/includeProcessedMarkdown\s*:\s*\{/);
		expect(sourceConfig).not.toMatch(/\bremarkLLMs\b/);
		expect(sourceConfig).not.toMatch(/mdxAsPlaceholder/);
		expect(sourceConfig).not.toMatch(/renderPlaceholder/);
		expect(sourceConfig).not.toMatch(
			/from\s+["']fumadocs-core\/mdx-plugins\/remark-llms/,
		);
		expect(sourceConfig).toContain("docs-V2/docs/remark-llms.md");
		expect(sourceConfig).toMatch(
			/remarkPlugins:\s*\[\s*\[\s*remarkBlockId/,
		);

		const getLlmText = readFileSync(join(appDir, "lib/get-llm-text.ts"), "utf8");
		expect(getLlmText).toContain('getText("processed")');
		expect(getLlmText).toContain("getLLMText");
	});

	it("locks Remark Image Active path (default sizes · ImageZoom · no options override)", () => {
		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).toMatch(
			/remarkPlugins:\s*\[\s*\[\s*remarkBlockId/,
		);
		expect(sourceConfig).not.toMatch(/\bremarkImage\b/);
		expect(sourceConfig).not.toMatch(/useImport\s*:/);
		expect(sourceConfig).not.toMatch(/publicDir\s*:/);
		expect(sourceConfig).not.toMatch(/placeholder\s*:\s*['"]blur['"]/);
		expect(sourceConfig).toContain("docs-V2/docs/remark-image.md");

		const mdx = readFileSync(mdxComponentsPath, "utf8");
		expect(mdx).toContain("ImageZoom");
		expect(mdx).toContain("img: MdxZoomImage");

		const imageZoom = readFileSync(join(appDir, "components/image-zoom.tsx"), "utf8");
		expect(imageZoom).toContain("fumadocs-core/framework");
		expect(imageZoom).toContain("export function ImageZoom");
		expect(imageZoom).toContain("react-medium-image-zoom");
	});

	it("locks Remark Structure Active path (default extract · Orama · no options override)", () => {
		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).toMatch(
			/remarkPlugins:\s*\[\s*\[\s*remarkBlockId/,
		);
		expect(sourceConfig).not.toMatch(/\bremarkStructure\b/);
		expect(sourceConfig).not.toMatch(/remarkStructureOptions/);
		expect(sourceConfig).not.toMatch(
			/from\s+["']fumadocs-core\/mdx-plugins["']/,
		);
		expect(sourceConfig).toContain("docs-V2/docs/remark-structure.md");

		expect(existsSync(searchRoutePath)).toBe(true);
		const searchSource = readFileSync(searchRoutePath, "utf8");
		expect(searchSource).toContain("createFromSource");
		expect(searchSource).toContain('language: "english"');
		expect(searchSource).toContain('from "@/lib/source"');
	});

	it("locks Remark Admonition Outside baseline (JSX Callout · no remark-directive)", () => {
		const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
			readonly dependencies?: Record<string, string>;
			readonly devDependencies?: Record<string, string>;
		};
		expect(pkg.dependencies?.["remark-directive"]).toBeUndefined();
		expect(pkg.devDependencies?.["remark-directive"]).toBeUndefined();

		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).toMatch(
			/remarkPlugins:\s*\[\s*\[\s*remarkBlockId/,
		);
		expect(sourceConfig).not.toMatch(/\bremarkDirective\b/);
		expect(sourceConfig).not.toMatch(/\bremarkDirectiveAdmonition\b/);
		expect(sourceConfig).not.toMatch(/remark-directive/);
		expect(sourceConfig).toContain("JSX Callout only");

		const mdx = readFileSync(mdxComponentsPath, "utf8");
		expect(mdx).toContain("Callout");

		const callout = readFileSync(join(appDir, "components/callout.tsx"), "utf8");
		expect(callout).toContain("export function Callout");
		expect(callout).toContain("CalloutContainer");
	});

	it("locks Remark Files Outside baseline (JSX Files · no remarkMdxFiles)", () => {
		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).toMatch(
			/remarkPlugins:\s*\[\s*\[\s*remarkBlockId/,
		);
		expect(sourceConfig).not.toMatch(/\bremarkMdxFiles\b/);
		expect(sourceConfig).not.toMatch(/remark-mdx-files/);
		expect(sourceConfig).toContain("JSX Files");

		const mdx = readFileSync(mdxComponentsPath, "utf8");
		expect(mdx).toContain("Files");
		expect(mdx).toContain("Folder");
		expect(mdx).toContain("File");

		const files = readFileSync(join(appDir, "components/files.tsx"), "utf8");
		expect(files).toContain("export function Files");
		expect(files).toContain("export function Folder");
		expect(files).toContain("export function File");

		const guide = readFileSync(guideMdxPath, "utf8");
		expect(guide).toContain("<Files>");
		expect(guide).not.toMatch(/```files\b/);
	});

	it("locks Remark Steps Outside baseline (JSX Steps · no remarkSteps)", () => {
		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).toMatch(
			/remarkPlugins:\s*\[\s*\[\s*remarkBlockId/,
		);
		expect(sourceConfig).not.toMatch(/\bremarkSteps\b/);
		expect(sourceConfig).not.toMatch(/remark-steps/);
		expect(sourceConfig).toContain("JSX Steps");

		const mdx = readFileSync(mdxComponentsPath, "utf8");
		expect(mdx).toContain("Steps");
		expect(mdx).toContain("Step");

		const steps = readFileSync(join(appDir, "components/steps.tsx"), "utf8");
		expect(steps).toContain("export function Steps");
		expect(steps).toContain("export function Step");

		const guide = readFileSync(guideMdxPath, "utf8");
		expect(guide).toContain("<Steps>");
		expect(guide).toContain("<Step>");
		expect(guide).not.toMatch(/\[step\]/);
	});

	it("locks Rehype Code Active path (default Shiki · CodeBlock · no options override)", () => {
		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).toMatch(
			/remarkPlugins:\s*\[\s*\[\s*remarkBlockId/,
		);
		expect(sourceConfig).not.toMatch(/\brehypeCode\b/);
		expect(sourceConfig).not.toMatch(/rehypeCodeOptions/);
		expect(sourceConfig).not.toMatch(/rehypePlugins\s*:/);
		expect(sourceConfig).not.toMatch(/tailing-curly-colon/);
		expect(sourceConfig).toContain("docs-V2/docs/rehype-code.md");

		const mdx = readFileSync(mdxComponentsPath, "utf8");
		expect(mdx).toContain("CodeBlock");
		expect(mdx).toContain("Pre");

		const codeblock = readFileSync(join(appDir, "components/codeblock.tsx"), "utf8");
		expect(codeblock).toContain("title");
		expect(codeblock).toContain("icon");
		expect(codeblock).toContain("dangerouslySetInnerHTML");
		expect(codeblock).toContain("shiki");
		expect(codeblock).toMatch(/--shiki-light-bg|--shiki-dark-bg/);
	});

	it("locks Package Install Outside baseline (no fumadocs-docgen · deprecated)", () => {
		const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
			readonly dependencies?: Record<string, string>;
			readonly devDependencies?: Record<string, string>;
		};
		expect(pkg.dependencies?.["fumadocs-docgen"]).toBeUndefined();
		expect(pkg.devDependencies?.["fumadocs-docgen"]).toBeUndefined();

		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).not.toMatch(/\bremarkInstall\b/);
		expect(sourceConfig).not.toMatch(/fumadocs-docgen/);
		expect(sourceConfig).not.toMatch(/package-install/);

		const mdx = readFileSync(mdxComponentsPath, "utf8");
		expect(mdx).toContain("Tab");
		expect(mdx).toContain("Tabs");
	});

	it("locks Headings Active path (default extract · Loader TOC · no rehypeToc)", () => {
		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).toMatch(
			/remarkPlugins:\s*\[\s*\[\s*remarkBlockId/,
		);
		expect(sourceConfig).not.toMatch(/\bremarkHeading\b/);
		expect(sourceConfig).not.toMatch(/\brehypeToc\b/);
		expect(sourceConfig).not.toMatch(/rehypePlugins\s*:/);
		expect(sourceConfig).not.toMatch(/generateToc\s*:/);

		const page = readFileSync(docsPagePath, "utf8");
		expect(page).toContain("toc={page.data.toc}");
		expect(page).toContain("items={page.data.toc}");
		expect(page).not.toMatch(/\brehypeToc\b/);
		expect(page).not.toMatch(/\bremarkHeading\b/);
	});

	it("locks Markdown / MDX authoring wire", () => {
		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).toContain('providerImportSource: "@/components/mdx"');
		expect(sourceConfig).not.toMatch(/remarkCodeTabOptions/);
		expect(sourceConfig).not.toMatch(/parseMdx\s*:\s*true/);
		expect(sourceConfig).not.toMatch(/remark-steps|remarkSteps/);

		const mdx = readFileSync(mdxComponentsPath, "utf8");
		expect(mdx).toContain("Callout");
		expect(mdx).toContain("Card");
		expect(mdx).toContain("Cards");
		expect(mdx).toContain("Steps");
		expect(mdx).toContain("Step");
		expect(mdx).toContain("CodeBlock");
		expect(mdx).toContain("Heading");
		expect(mdx).not.toMatch(/getPageTreePeers/);

		const page = readFileSync(docsPagePath, "utf8");
		expect(page).toContain("createRelativeLink");
		expect(page).toContain("a: createRelativeLink(source, page)");
		expect(page).not.toMatch(/getPageTreePeers/);
		expect(page).not.toMatch(/\bDocsCategory\b/);

		const guide = readFileSync(guideMdxPath, "utf8");
		expect(guide).toContain("<Callout");
		expect(guide).toContain("<Steps>");
		expect(guide).toContain("<Step>");
	});

	it("locks Navigation (Layout Links · sidebar · no versioning)", () => {
		const shared = readFileSync(layoutSharedPath, "utf8");
		expect(shared).toContain('url: "/docs/guide"');
		expect(shared).toContain('url: "/docs/api"');
		expect(shared).toContain("CodeXml");
		expect(shared).not.toContain("Code2");
		expect(shared).toContain('active: "nested-url"');
		expect(shared).toContain('type: "custom"');
		expect(shared).toContain('@/components/github-info');
		expect(shared).not.toContain('type: "menu"');

		const docsLayout = readFileSync(join(appDir, "app/docs/layout.tsx"), "utf8");
		expect(docsLayout).toContain("tree={source.pageTree}");
		expect(docsLayout).toContain("{...baseOptions()}");
		expect(docsLayout).toContain("tabs={false}");
		expect(docsLayout).not.toMatch(/links=\{/);
		expect(docsLayout).not.toMatch(/nav=\{/);
		expect(docsLayout).not.toMatch(/tree=\{\{/);

		const contentDocs = join(appDir, "content/docs");
		expect(existsSync(join(contentDocs, "v1"))).toBe(false);
		expect(existsSync(join(contentDocs, "v2"))).toBe(false);
		expect(existsSync(join(contentDocs, "java-sdk"))).toBe(false);
	});

	it("locks page conventions (slugs · meta · no root tabs folders)", () => {
		const rootMetaPath = join(appDir, "content/docs/meta.json");
		expect(existsSync(rootMetaPath)).toBe(true);
		const rootMeta = JSON.parse(readFileSync(rootMetaPath, "utf8")) as {
			readonly pages?: readonly string[];
			readonly root?: boolean;
		};
		expect(rootMeta.pages).toEqual(["index", "guide", "api"]);
		expect(rootMeta.root).toBeUndefined();

		const apiMetaPath = join(appDir, "content/docs/api/meta.json");
		expect(existsSync(apiMetaPath)).toBe(true);
		const apiMeta = JSON.parse(readFileSync(apiMetaPath, "utf8")) as {
			readonly pages?: readonly string[];
			readonly title?: string;
			readonly root?: boolean;
			readonly icon?: string;
		};
		expect(apiMeta.title).toBe("HTTP API");
		expect(apiMeta.pages?.[0]).toBe("index");
		expect(apiMeta.root).toBeUndefined();
		expect(apiMeta.icon).toBe("CodeXml");

		const generateSource = readFileSync(generateScriptPath, "utf8");
		expect(generateSource).toContain('meta.icon = "CodeXml"');
		expect(generateSource).toContain('meta.icon === "Code2"');

		const contentDocs = join(appDir, "content/docs");
		for (const entry of readdirSync(contentDocs)) {
			expect(entry.startsWith("(") && entry.endsWith(")")).toBe(false);
			const full = join(contentDocs, entry);
			if (statSync(full).isDirectory() && entry.endsWith(".json") === false) {
				const folderMeta = join(full, "meta.json");
				if (existsSync(folderMeta)) {
					const meta = JSON.parse(readFileSync(folderMeta, "utf8")) as {
						readonly root?: boolean;
						readonly icon?: string;
					};
					expect(meta.root).not.toBe(true);
					if (meta.icon !== undefined) {
						expect(meta.icon).not.toBe("Code2");
					}
				}
			}
		}

		const sourceSource = readFileSync(sourcePath, "utf8");
		expect(sourceSource).toContain("lucideIconsPlugin()");
		expect(sourceSource).not.toMatch(/loader\(\s*\{[^}]*\bicon\s*:/);

		const guide = readFileSync(guideMdxPath, "utf8");
		expect(guide).toMatch(
			/^---\r?\ntitle:\s+.+\r?\ndescription:\s+.+\r?\nicon:\s+\S+\r?\n---/m,
		);

		const indexBody = readFileSync(join(appDir, "content/docs/index.mdx"), "utf8");
		expect(indexBody).toMatch(
			/^---\r?\ntitle:\s+.+\r?\ndescription:\s+.+\r?\n---/m,
		);
	});

	it("locks Fumadocs UI theme to neutral + presets", () => {
		const css = readFileSync(globalCssPath, "utf8");
		expect(css).toContain('@import "tailwindcss"');
		expect(css).toContain("fumadocs-ui/css/neutral.css");
		expect(css).toContain("fumadocs-ui/css/preset.css");
		expect(css).toContain("fumadocs-openapi/css/preset.css");
		expect(css).toContain("--fd-layout-width: 1400px");
		expect(css).not.toMatch(
			/fumadocs-ui\/css\/(?:black|vitepress|dusk|catppuccin|ocean|purple|solar|emerald|ruby|aspen|shadcn)\.css/,
		);
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

	it("locks fumadocs-ui on the Radix package (not Base UI alias)", () => {
		const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
			dependencies?: Record<string, string>;
		};
		const fumadocsUi = pkg.dependencies?.["fumadocs-ui"];
		expect(typeof fumadocsUi).toBe("string");
		expect(fumadocsUi).not.toMatch(/@fumadocs\/base-ui/);
		expect(fumadocsUi).not.toMatch(/^npm:/);

		const resolvedPkgPath = requireFromDocs.resolve("fumadocs-ui/package.json");
		const resolvedPkg = JSON.parse(readFileSync(resolvedPkgPath, "utf8")) as {
			name?: string;
			description?: string;
			dependencies?: Record<string, string>;
		};
		expect(resolvedPkg.name).toBe("fumadocs-ui");
		expect(resolvedPkg.description).toMatch(/Radix UI/i);
		expect(
			Object.keys(resolvedPkg.dependencies ?? {}).some((name) =>
				name.startsWith("@radix-ui/"),
			),
		).toBe(true);
		expect(resolvedPkg.dependencies?.["@base-ui/react"]).toBeUndefined();
	});

	it("locks Search UI to stock RootProvider + Orama createFromSource", () => {
		expect(existsSync(searchRoutePath)).toBe(true);
		const searchSource = readFileSync(searchRoutePath, "utf8");
		expect(searchSource).toContain("createFromSource");
		expect(searchSource).toContain("fumadocs-core/search/server");
		expect(searchSource).toContain("export const { GET }");
		expect(searchSource).toContain('language: "english"');

		const nextConfig = readFileSync(join(appDir, "next.config.mjs"), "utf8");
		expect(nextConfig).toContain("fumadocs-mdx/next");
		expect(nextConfig).toContain("createMDX");
		expect(nextConfig).toContain("reactStrictMode: true");

		const tsconfig = JSON.parse(
			readFileSync(join(appDir, "tsconfig.json"), "utf8"),
		) as {
			readonly compilerOptions?: {
				readonly paths?: Record<string, readonly string[]>;
			};
		};
		expect(tsconfig.compilerOptions?.paths?.["collections/*"]).toEqual([
			"./.source/*",
		]);

		const sourceTs = readFileSync(join(appDir, "lib/source.ts"), "utf8");
		expect(sourceTs).toContain('from "collections/server"');
		expect(sourceTs).toContain("docs.toFumadocsSource()");
		expect(sourceTs).toContain('baseUrl: "/docs"');

		const layout = readFileSync(rootLayoutPath, "utf8");
		expect(layout).toContain("fumadocs-ui/provider/next");
		expect(layout).toContain('@/components/banner');
		expect(layout).toContain('<Banner id="afenda-lite-docs">');
		expect(layout).toContain("official documentation site");
		expect(layout).not.toMatch(/docs mirror|documentation mirror/i);
		expect(layout).toContain("<RootProvider>{children}</RootProvider>");
		expect(layout).not.toMatch(/\bsearch\s*=\s*\{/);
		expect(layout).not.toMatch(/enabled:\s*false/);
		expect(layout).not.toMatch(/\bSearchDialog\b/);

		const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
			readonly description?: string;
		};
		expect(pkg.description).toMatch(/official documentation site/i);
		expect(pkg.description).not.toMatch(/mirror/i);
	});

	it("ships guide.mdx with required frontmatter", () => {
		expect(existsSync(guideMdxPath)).toBe(true);
		const guide = readFileSync(guideMdxPath, "utf8");
		expect(guide).toMatch(
			/^---\r?\ntitle:\s+.+\r?\ndescription:\s+.+\r?\nicon:\s+BookOpen\r?\n---/m,
		);
	});

	it("locks next/og Metadata Image (fumadocs-ui/og)", () => {
		const layout = readFileSync(rootLayoutPath, "utf8");
		expect(layout).toContain('@afenda/env/docs');
		expect(layout).toContain("docsEnv");
		expect(layout).toContain("metadataBase");
		expect(layout).toContain("docsEnv.DOCS_URL");
		expect(layout).not.toMatch(/\bAPP_URL\b/);
		expect(layout).not.toMatch(/process\.env\./);

		const docsEnvPath = join(appDir, "../../packages/env/src/docs.ts");
		const docsEnvSource = readFileSync(docsEnvPath, "utf8");
		expect(docsEnvSource).toContain("DOCS_URL");
		expect(docsEnvSource).toContain("http://localhost:3001");

		const sourceTs = readFileSync(sourcePath, "utf8");
		expect(sourceTs).toContain("export function getPageImage");
		expect(sourceTs).toContain('docsAppName = "Afenda-Lite Docs"');
		expect(sourceTs).toContain("image.png");
		expect(sourceTs).toContain("/og/docs/");

		const page = readFileSync(docsPagePath, "utf8");
		expect(page).toContain("getPageImage");
		expect(page).toContain("openGraph");
		expect(page).toContain("images: getPageImage(page).url");

		const ogRoutePath = join(appDir, "app/og/docs/[...slug]/route.tsx");
		expect(existsSync(ogRoutePath)).toBe(true);
		const ogRoute = readFileSync(ogRoutePath, "utf8");
		expect(ogRoute).toContain('from "fumadocs-ui/og"');
		expect(ogRoute).toContain("ImageResponse");
		expect(ogRoute).toContain("DefaultImage");
		expect(ogRoute).toContain("docsAppName");
		expect(ogRoute).toContain("getPageImage");
		expect(ogRoute).toContain("slug.slice(0, -1)");
		expect(ogRoute).toContain("revalidate = false");
		expect(ogRoute).toContain("generateStaticParams");
		expect(ogRoute).not.toMatch(/\blang\b/);
		expect(ogRoute).toContain("primaryColor");
		expect(ogRoute).toContain("primaryTextColor");
		expect(ogRoute).not.toMatch(/255,\s*150,\s*255/);

		expect(existsSync(join(appDir, "components/og"))).toBe(false);
	});

	it("locks Validate Links (next-validate-link · tsx content walk)", () => {
		const lintLinksPath = join(appDir, "scripts/lint-links.mts");
		expect(existsSync(lintLinksPath)).toBe(true);
		const lintLinks = readFileSync(lintLinksPath, "utf8");
		expect(lintLinks).toContain('from "next-validate-link"');
		expect(lintLinks).toContain('preset: "next"');
		expect(lintLinks).toContain('"docs/[[...slug]]"');
		expect(lintLinks).toContain("Card");
		expect(lintLinks).toContain('attributes: ["href"]');
		expect(lintLinks).toContain('checkRelativePaths: "as-url"');
		expect(lintLinks).toContain("printErrors");
		expect(lintLinks).toContain("validateFiles");
		expect(lintLinks).toContain("scanURLs");
		expect(lintLinks).toContain("content/docs");
		expect(lintLinks).not.toMatch(/from ["']@\/lib\/source["']/);
		expect(lintLinks).not.toMatch(/from ["']\.\.\/lib\/source/);
		expect(lintLinks).not.toMatch(/\bbun\b/);

		const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
			readonly scripts?: Record<string, string>;
			readonly dependencies?: Record<string, string>;
			readonly devDependencies?: Record<string, string>;
		};
		expect(pkg.scripts?.["lint:links"]).toContain("lint-links.mts");
		expect(pkg.scripts?.["lint:links"]).toContain("tsx");
		expect(
			pkg.dependencies?.["next-validate-link"] ??
				pkg.devDependencies?.["next-validate-link"],
		).toBeDefined();

		const rootPkg = JSON.parse(
			readFileSync(join(appDir, "../../package.json"), "utf8"),
		) as { readonly scripts?: Record<string, string> };
		expect(rootPkg.scripts?.["check:docs-app"]).toContain("lint:links");
	});

	it("locks AI & LLMs text surfaces (no Ask AI)", () => {
		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).toContain("includeProcessedMarkdown: true");
		expect(sourceConfig).toContain("extractLinkReferences: true");

		expect(existsSync(join(appDir, "lib/get-llm-text.ts"))).toBe(true);
		expect(existsSync(join(appDir, "app/llms.txt/route.ts"))).toBe(true);
		expect(existsSync(join(appDir, "app/llms-full.txt/route.ts"))).toBe(true);
		expect(
			existsSync(join(appDir, "app/llms.mdx/docs/[[...slug]]/route.ts")),
		).toBe(true);

		const getLlmText = readFileSync(join(appDir, "lib/get-llm-text.ts"), "utf8");
		expect(getLlmText).toContain('getText("processed")');
		expect(getLlmText).toContain("getLLMText");

		const llmsTxt = readFileSync(join(appDir, "app/llms.txt/route.ts"), "utf8");
		expect(llmsTxt).toContain('from "fumadocs-core/source"');
		expect(llmsTxt).toContain("llms(source).index()");
		expect(llmsTxt).toContain("revalidate = false");

		const llmsFull = readFileSync(
			join(appDir, "app/llms-full.txt/route.ts"),
			"utf8",
		);
		expect(llmsFull).toContain("getLLMText");
		expect(llmsFull).toContain("source.getPages()");
		expect(llmsFull).toContain("revalidate = false");

		const mdRoute = readFileSync(
			join(appDir, "app/llms.mdx/docs/[[...slug]]/route.ts"),
			"utf8",
		);
		expect(mdRoute).toContain("getLLMText");
		expect(mdRoute).toContain("text/markdown");
		expect(mdRoute).toContain("generateStaticParams");

		const nextConfig = readFileSync(join(appDir, "next.config.mjs"), "utf8");
		expect(nextConfig).toContain('source: "/docs/:path*.md"');
		expect(nextConfig).toContain('destination: "/llms.mdx/docs/:path*"');

		expect(existsSync(join(appDir, "components/ai"))).toBe(false);
		expect(existsSync(join(appDir, "app/api/chat"))).toBe(false);
		expect(existsSync(join(appDir, "proxy.ts"))).toBe(false);

		const docsLayout = readFileSync(join(appDir, "app/docs/layout.tsx"), "utf8");
		expect(docsLayout).not.toMatch(/AISearch|LLMCopyButton|ViewOptions/);

		const docsPage = readFileSync(docsPagePath, "utf8");
		expect(docsPage).toContain("MarkdownCopyButton");
		expect(docsPage).toContain("ViewOptionsPopover");
		expect(docsPage).toContain("markdownUrl");
		expect(docsPage).toContain("getPageMarkdownUrl");
		expect(docsPage).toContain("getPageGithubUrl");
		expect(docsPage).not.toMatch(/AISearch|LLMCopyButton/);
		expect(docsPage).not.toMatch(/\/api\/chat/);

		const sourceSource = readFileSync(sourcePath, "utf8");
		expect(sourceSource).toContain("getPageMarkdownUrl");
		expect(sourceSource).toContain("getPageGithubUrl");
		expect(sourceSource).toContain('url: "/docs.md"');
	});

	it("locks Negotiation Outside baseline (explicit .md · no Accept proxy)", () => {
		expect(existsSync(join(appDir, "proxy.ts"))).toBe(false);
		expect(existsSync(join(appDir, "middleware.ts"))).toBe(false);

		const nextConfig = readFileSync(join(appDir, "next.config.mjs"), "utf8");
		expect(nextConfig).toContain('source: "/docs/:path*.md"');
		expect(nextConfig).toContain('destination: "/llms.mdx/docs/:path*"');
		expect(
			existsSync(join(appDir, "app/llms.mdx/docs/[[...slug]]/route.ts")),
		).toBe(true);

		for (const root of ["lib", "app", "components", "scripts"] as const) {
			const dir = join(appDir, root);
			if (!existsSync(dir)) {
				continue;
			}
			for (const file of collectSourceFiles(dir)) {
				const body = readFileSync(file, "utf8");
				expect(body).not.toMatch(
					/from\s+["']fumadocs-core\/negotiation["']/,
				);
				expect(body).not.toMatch(/\bisMarkdownPreferred\b/);
				expect(body).not.toMatch(/\brewritePath\s*\(/);
			}
		}

		const nextConfigBody = readFileSync(join(appDir, "next.config.mjs"), "utf8");
		expect(nextConfigBody).not.toMatch(
			/from\s+["']fumadocs-core\/negotiation["']/,
		);
		expect(nextConfigBody).not.toMatch(/\bisMarkdownPreferred\b/);
	});

	it("locks Feedback (page · block · GitHub Discussions)", () => {
		const page = readFileSync(docsPagePath, "utf8");
		expect(page).toContain('@/components/feedback/client');
		expect(page).toContain("FeedbackText");
		expect(page).toContain("<Feedback ");
		expect(page).toContain("onSendAction={onBlockFeedbackAction}");
		expect(page).toContain("onSendAction={onPageFeedbackAction}");
		expect(page).toContain("@/lib/github-feedback");
		expect(page).not.toMatch(/console\.log/);

		const githubFeedbackPath = join(appDir, "lib/github-feedback.ts");
		expect(existsSync(githubFeedbackPath)).toBe(true);
		const githubFeedback = readFileSync(githubFeedbackPath, "utf8");
		expect(githubFeedback).toContain('@afenda/env/docs');
		expect(githubFeedback).toContain("docsEnv");
		expect(githubFeedback).toContain("onPageFeedbackAction");
		expect(githubFeedback).toContain("onBlockFeedbackAction");
		expect(githubFeedback).toContain('DocsCategory = "Docs Feedback"');
		expect(githubFeedback).toContain('owner = "pohlai88"');
		expect(githubFeedback).toContain('repo = "afenda-lite"');
		expect(githubFeedback).toContain("requireAppCredentials");
		expect(githubFeedback).toContain("discussionTitleForPage");
		expect(githubFeedback).toContain("docs-V2/docs/feedback.md");
		expect(githubFeedback).toContain(
			"Docs feedback requires GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY",
		);
		expect(githubFeedback).not.toMatch(/console\.log/);
		expect(githubFeedback).not.toMatch(/githubUrl:\s*undefined/);

		const feedbackClient = readFileSync(
			join(appDir, "components/feedback/client.tsx"),
			"utf8",
		);
		expect(feedbackClient).toContain("FeedbackThanksActions");
		expect(feedbackClient).toContain("feedbackActionErrorMessage");
		expect(feedbackClient).toContain('role="alert"');
		expect(existsSync(join(appDir, "components/feedback/schema.ts"))).toBe(
			true,
		);

		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).toContain(
			'fumadocs-core/mdx-plugins/remark-block-id',
		);
		expect(sourceConfig).toContain("remarkBlockId");
		expect(sourceConfig).toContain('addDataAttribute: "feedback"');

		const nextConfig = readFileSync(join(appDir, "next.config.mjs"), "utf8");
		expect(nextConfig).toContain("loadEnvConfig");
		expect(nextConfig).toContain("repoRoot");
	});

	it("locks full Components catalog + relative links + layout chrome", () => {
		const mdx = readFileSync(mdxComponentsPath, "utf8");
		expect(mdx).toContain('from "fumadocs-ui/mdx"');
		expect(mdx).toContain("...defaultMdxComponents");
		expect(mdx).toContain('@/components/accordion');
		expect(mdx).toContain('@/components/codeblock');
		expect(mdx).toContain("fumadocs-ui/components/dynamic-codeblock");
		expect(mdx).toContain('@/components/files');
		expect(mdx).toContain('@/components/image-zoom');
		expect(mdx).toContain('@/components/inline-toc');
		expect(mdx).toContain('@/components/steps');
		expect(mdx).toContain('@/components/tabs');
		expect(mdx).toContain('@/components/type-table');
		expect(mdx).toContain('@/components/callout');
		expect(mdx).toContain('@/components/card');
		expect(mdx).toContain('@/components/heading');
		expect(mdx).toContain("fumadocs-typescript/ui");
		expect(mdx).toContain("AutoTypeTable");
		expect(mdx).toContain("DocsGraphView");
		expect(mdx).toContain("img: MdxZoomImage");
		expect(mdx).not.toMatch(BANNED_DOCS_PATTERN);

		const page = readFileSync(docsPagePath, "utf8");
		expect(page).toContain("createRelativeLink");
		expect(page).toContain("a: createRelativeLink(source, page)");
		expect(page).toContain("InlineTOC");
		expect(page).toContain("items={page.data.toc}");
		expect(page).toContain('@/components/feedback/client');

		const shared = readFileSync(layoutSharedPath, "utf8");
		expect(shared).toContain('title: "Afenda-Lite Docs"');
		expect(shared).toContain('url: "/docs"');
		expect(shared).toContain('transparentMode: "none"');
		expect(shared).not.toMatch(/component:\s*</);
		expect(shared).toContain(
			'githubUrl: "https://github.com/pohlai88/afenda-lite"',
		);
		expect(shared).toContain('url: "/docs/guide"');
		expect(shared).toContain('url: "/docs/api"');
		expect(shared).toContain('active: "nested-url"');
		expect(shared).toContain("type: \"custom\"");
		expect(shared).toContain("secondary: true");
		expect(shared).toContain('@/components/github-info');
		expect(shared).toContain('owner="pohlai88"');
		expect(shared).toContain('repo="afenda-lite"');
		expect(shared).not.toMatch(/GITHUB_TOKEN|token=/);
		expect(shared).not.toContain('type: "menu"');
		expect(shared).not.toContain("NavbarMenu");

		const rootLayout = readFileSync(rootLayoutPath, "utf8");
		expect(rootLayout).toContain('@/components/banner');

		const docsLayout = readFileSync(join(appDir, "app/docs/layout.tsx"), "utf8");
		expect(docsLayout).toContain("fumadocs-ui/layouts/docs");
		expect(docsLayout).not.toMatch(/from ["']@\/layouts\//);
		expect(docsLayout).not.toMatch(/from ["']@\/components\/layout\//);
		expect(docsLayout).toContain("tree={source.pageTree}");
		expect(docsLayout).toContain("{...baseOptions()}");
		expect(docsLayout).toContain("enabled: true");
		expect(docsLayout).toContain("collapsible: true");
		expect(docsLayout).toContain("prefetch: false");
		expect(docsLayout).toContain("tabs={false}");
		expect(docsLayout).not.toMatch(/links=\{/);
		expect(docsLayout).not.toMatch(/nav=\{/);
		expect(docsLayout).not.toMatch(/tree=\{\{/);
		expect(docsLayout).not.toContain("getPageTree");
		expect(docsLayout).not.toMatch(/containerProps/);
		expect(existsSync(join(appDir, "layouts"))).toBe(false);

		const sourceConfig = readFileSync(sourceConfigPath, "utf8");
		expect(sourceConfig).toContain("extractLinkReferences: true");
		expect(sourceConfig).toContain(
			'fumadocs-core/mdx-plugins/remark-block-id',
		);
		expect(sourceConfig).toContain("remarkBlockId");
		expect(sourceConfig).toContain('addDataAttribute: "feedback"');

		const css = readFileSync(globalCssPath, "utf8");
		expect(css).toContain('@import "./image-zoom.css"');
		expect(css).not.toContain("image-zoom2.css");
		expect(css).not.toContain("--fd-nav-height");
		expect(css).not.toMatch(/#nd-subnav/);
		expect(css).not.toMatch(/\[data-toc-popover\]\s*>/);

		const cliOwned = [
			"components/accordion.tsx",
			"components/banner.tsx",
			"components/callout.tsx",
			"components/card.tsx",
			"components/codeblock.tsx",
			"components/files.tsx",
			"components/github-info.tsx",
			"components/graph-view.tsx",
			"components/heading.tsx",
			"components/image-zoom.tsx",
			"components/inline-toc.tsx",
			"components/steps.tsx",
			"components/tabs.tsx",
			"components/type-table.tsx",
			"components/feedback/client.tsx",
			"components/ui/accordion.tsx",
			"components/ui/button.tsx",
			"components/ui/tabs.tsx",
			"components/ui/collapsible.tsx",
			"lib/build-graph.ts",
			"lib/cn.ts",
			"app/image-zoom.css",
		];
		for (const rel of cliOwned) {
			expect(existsSync(join(appDir, rel))).toBe(true);
		}

		expect(existsSync(cliJsonPath)).toBe(true);
		const cliJson = JSON.parse(readFileSync(cliJsonPath, "utf8")) as {
			readonly uiLibrary?: string;
			readonly framework?: string;
			readonly aliases?: { readonly componentsDir?: string; readonly libDir?: string };
		};
		expect(cliJson.uiLibrary).toBe("radix-ui");
		expect(cliJson.framework).toBe("next");
		expect(cliJson.aliases?.componentsDir).toBe("./components");
		expect(cliJson.aliases?.libDir).toBe("./lib");

		const pkgJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
			readonly dependencies?: Record<string, string>;
			readonly devDependencies?: Record<string, string>;
			readonly scripts?: Record<string, string>;
		};
		expect(pkgJson.devDependencies?.["@fumadocs/cli"]).toBeDefined();
		expect(pkgJson.dependencies?.["@radix-ui/react-accordion"]).toBeDefined();
		expect(pkgJson.dependencies?.["react-medium-image-zoom"]).toBeDefined();
		expect(pkgJson.dependencies?.octokit).toBeDefined();
		expect(pkgJson.dependencies?.["@afenda/env"]).toBe("workspace:*");
		expect(pkgJson.scripts?.fd).toBe("cli");
		expect(pkgJson.scripts?.["fd:add"]).toBe("cli add");
		expect(pkgJson.scripts?.["fd:add:silent"]).toContain("cli-add-silent.mts");
		expect(pkgJson.scripts?.["fd:customize"]).toBe("cli customize");
		expect(pkgJson.scripts?.["fd:tree"]).toBe("cli tree");
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
