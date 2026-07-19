/**
 * English-only OpenAPI → MDX via official fumadocs-openapi generateFiles.
 * Document id must match lib/openapi.server.ts OPENAPI_DOCUMENT_ID.
 *
 * generateFiles is loaded via createRequire: fumadocs-openapi@11 ESM entry
 * pulls a broken xml-js named export under Node/tsx; the CJS path resolves.
 */
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { OPENAPI_DOCUMENT_ID, openapi } from "../lib/openapi.server.ts";

const require = createRequire(import.meta.url);
const { generateFiles } = require("fumadocs-openapi") as typeof import("fumadocs-openapi");

const appDir = join(fileURLToPath(import.meta.url), "../..");
const contentApiDir = join(appDir, "content/docs/api");
const indexPath = join(contentApiDir, "index.mdx");
const openApiSpecPath = join(appDir, OPENAPI_DOCUMENT_ID);
const openApiServerPath = join(appDir, "lib/openapi.server.ts");

function fail(message: string): never {
	console.error(`[generate:openapi-docs] ${message}`);
	process.exit(1);
}

function assertOpenApiDocumentIdAligned(): void {
	const serverSource = readFileSync(openApiServerPath, "utf8");
	if (!serverSource.includes(OPENAPI_DOCUMENT_ID)) {
		fail(
			`OPENAPI_DOCUMENT_ID mismatch — update scripts/generate-openapi-docs.mts or lib/openapi.server.ts`,
		);
	}
}

function assertSpecPresent(): void {
	if (!existsSync(openApiSpecPath)) {
		fail(
			`OpenAPI spec missing at ${openApiSpecPath}. Run: pnpm openapi:generate`,
		);
	}
}

assertSpecPresent();
assertOpenApiDocumentIdAligned();

mkdirSync(contentApiDir, { recursive: true });

const preservedIndex = existsSync(indexPath)
	? readFileSync(indexPath, "utf8")
	: null;

await generateFiles({
	input: openapi,
	output: "./content/docs/api",
	per: "operation",
	meta: true,
	addGeneratedComment: true,
});

if (preservedIndex !== null) {
	writeFileSync(indexPath, preservedIndex, "utf8");
}

const metaPath = join(contentApiDir, "meta.json");
let keptSlugs = new Set<string>(["index"]);
if (existsSync(metaPath)) {
	const meta = JSON.parse(readFileSync(metaPath, "utf8")) as {
		title?: string;
		pages?: string[];
	};
	const pages = meta.pages ?? [];
	const withoutIndex = pages.filter((page) => page !== "index");
	meta.title = meta.title ?? "HTTP API";
	meta.pages = ["index", ...withoutIndex];
	keptSlugs = new Set(meta.pages);
	writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
}

for (const name of readdirSync(contentApiDir)) {
	if (!name.endsWith(".mdx")) {
		continue;
	}
	const slug = name.replace(/\.mdx$/, "");
	if (!keptSlugs.has(slug)) {
		unlinkSync(join(contentApiDir, name));
	}
}

console.log(
	`generate:openapi-docs: wrote operation pages under content/docs/api (document ${OPENAPI_DOCUMENT_ID})`,
);
