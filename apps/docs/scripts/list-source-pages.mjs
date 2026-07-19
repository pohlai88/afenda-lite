/**
 * Offline page inventory via Fumadocs MDX Node Runtime Loader.
 * SSOT: docs-V2/docs/fumadocs-mdx-node.md
 *
 * Coexists with Next `createMDX` — does not replace generate:source or RSC.
 * Uses `collections/server` + `loader()` after `register()`; skips
 * `openapi.loaderPlugin` (fumadocs-openapi/xml-js is not Node-ESM-safe — same
 * constraint as generate-openapi-docs.mts createRequire).
 *
 * ESM only. Requires prior `pnpm generate:source` (or predev/prebuild).
 */
import { register as registerNode } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loader } from "fumadocs-core/source";
import { register as registerFuma } from "fumadocs-mdx/node";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

registerNode("./node-docs-resolve.mjs", import.meta.url, {
	data: { appRoot },
});

/** Default config discovery = root `source.config.ts` — do not pass configPath. */
registerFuma();

const { docs } = await import("collections/server");

const source = loader({
	baseUrl: "/docs",
	source: docs.toFumadocsSource(),
});

const pages = source.getPages();

if (pages.length === 0) {
	console.error("list:source-pages: source.getPages() returned zero pages");
	process.exitCode = 1;
} else {
	const inventory = pages.map((page) => ({
		url: page.url,
		slugs: page.slugs,
		title: page.data.title,
	}));
	console.log(
		JSON.stringify(
			{
				ok: true,
				count: inventory.length,
				pages: inventory,
			},
			null,
			2,
		),
	);
}
