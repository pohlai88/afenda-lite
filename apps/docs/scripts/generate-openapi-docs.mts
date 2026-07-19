/**
 * English-only OpenAPI → MDX via official fumadocs-openapi generateFiles.
 * SSOT options: docs-V2/docs/openapi-generate-files.md · YAML/UI: docs-V2/docs/openapi.md
 * Document id must match lib/openapi-document-id.ts OPENAPI_DOCUMENT_ID.
 * AsyncAPI generateFiles Outside baseline — docs-V2/docs/asyncapi.md (do not mix packages).
 *
 * createOpenAPI + generateFiles load via createRequire: fumadocs-openapi@11 ESM
 * entry dual-loads a broken @scalar/openapi-upgrader path under Node/tsx when
 * mixed with lib/openapi.server.ts ESM; the CJS path resolves.
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
import {
	OPENAPI_DOCUMENT_ID,
	OPENAPI_DOCUMENT_PATH,
} from "../lib/openapi-document-id.ts";

const require = createRequire(import.meta.url);
const { generateFiles } = require("fumadocs-openapi") as typeof import("fumadocs-openapi");
const { createOpenAPI } = require("fumadocs-openapi/server") as typeof import("fumadocs-openapi/server");

const openapi = createOpenAPI({
	input: {
		[OPENAPI_DOCUMENT_ID]: OPENAPI_DOCUMENT_PATH,
	},
});

const appDir = join(fileURLToPath(import.meta.url), "../..");
const contentApiDir = join(appDir, "content/docs/api");
const indexPath = join(contentApiDir, "index.mdx");
const documentIdPath = join(appDir, "lib/openapi-document-id.ts");
const openApiServerPath = join(appDir, "lib/openapi.server.ts");

function fail(message: string): never {
	console.error(`[generate:openapi-docs] ${message}`);
	process.exit(1);
}

function assertOpenApiDocumentIdAligned(): void {
	const documentIdSource = readFileSync(documentIdPath, "utf8");
	const serverSource = readFileSync(openApiServerPath, "utf8");
	if (!documentIdSource.includes(OPENAPI_DOCUMENT_ID)) {
		fail(
			`OPENAPI_DOCUMENT_ID mismatch — update scripts/generate-openapi-docs.mts or lib/openapi-document-id.ts`,
		);
	}
	if (!documentIdSource.includes("OPENAPI_DOCUMENT_PATH")) {
		fail(
			`lib/openapi-document-id.ts must export OPENAPI_DOCUMENT_PATH`,
		);
	}
	if (!serverSource.includes("openapi-document-id")) {
		fail(
			`lib/openapi.server.ts must import OPENAPI_DOCUMENT_ID from openapi-document-id.ts`,
		);
	}
	if (!serverSource.includes("OPENAPI_DOCUMENT_PATH")) {
		fail(
			`lib/openapi.server.ts must use OPENAPI_DOCUMENT_PATH in SchemaRecord input`,
		);
	}
}

function assertSpecPresent(): void {
	if (!existsSync(OPENAPI_DOCUMENT_PATH)) {
		fail(
			`OpenAPI spec missing at ${OPENAPI_DOCUMENT_PATH}. Run: pnpm openapi:generate`,
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
		icon?: string;
	};
	const pages = meta.pages ?? [];
	const withoutIndex = pages.filter((page) => page !== "index");
	meta.title = meta.title ?? "HTTP API";
	meta.pages = ["index", ...withoutIndex];
	/** Keep Lucide sidebar icon across generateFiles meta rewrite — docs-V2/docs/loader-plugins.md */
	/** Code2 left lucide-react `icons` map (v1.x) — lucideIconsPlugin resolves via `icons` only */
	if (meta.icon === undefined || meta.icon === "Code2") {
		meta.icon = "CodeXml";
	}
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
