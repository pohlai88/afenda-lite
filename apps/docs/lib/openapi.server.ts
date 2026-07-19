import { createOpenAPI, type OpenAPIOptions } from "fumadocs-openapi/server";

/**
 * Relative to apps/docs cwd. Must match MDX `document=` / `_openapi.preload`
 * and scripts/generate-openapi-docs.mts — single SSOT under docs-V2 (no copy).
 */
export const OPENAPI_DOCUMENT_ID =
	"../../docs-V2/api/OPEN-001-openapi.yaml" as const;

export type OpenApiDocumentId = typeof OPENAPI_DOCUMENT_ID;

const openApiServerOptions = {
	input: [OPENAPI_DOCUMENT_ID],
} satisfies OpenAPIOptions;

export const openapi = createOpenAPI(openApiServerOptions);
