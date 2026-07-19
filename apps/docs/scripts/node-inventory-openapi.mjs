/**
 * Node-inventory OpenAPI surface for `list:source-pages`.
 * fumadocs-openapi pulls xml-js via a broken ESM interop under plain Node —
 * same constraint as generate-openapi-docs.mts (createRequire there).
 * Next.js / RSC keep the real `fumadocs-openapi` package.
 * SSOT: docs-V2/docs/fumadocs-mdx-node.md
 */

export function createOpenAPI() {
	return {
		loaderPlugin() {
			return undefined;
		},
	};
}

export function createOpenAPIPage() {
	return function OpenAPIPageInventory() {
		return null;
	};
}

export default {
	createOpenAPI,
	createOpenAPIPage,
};
