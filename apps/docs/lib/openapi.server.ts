import { createOpenAPI, type OpenAPIOptions } from "fumadocs-openapi/server";
import {
	OPENAPI_DOCUMENT_ID,
	OPENAPI_DOCUMENT_PATH,
	type OpenApiDocumentId,
} from "./openapi-document-id";

/**
 * SchemaRecord: document id (MDX) → absolute load path (cwd-independent).
 * Must match MDX `document=` / `_openapi.preload` and generate-openapi-docs.mts.
 * SSOT under docs-V2 (no copy). Framework Mode: docs-V2/docs/openapi.md ·
 * createOpenAPI options: docs-V2/docs/openapi-server.md
 * Server-only — do not import from client. No proxyUrl / createProxy (Outside).
 * Event/message API server Outside baseline — docs-V2/docs/asyncapi.md
 */
export {
	OPENAPI_DOCUMENT_ID,
	OPENAPI_DOCUMENT_PATH,
	type OpenApiDocumentId,
};

const openApiServerOptions = {
	input: {
		[OPENAPI_DOCUMENT_ID]: OPENAPI_DOCUMENT_PATH,
	},
} satisfies OpenAPIOptions;

export const openapi = createOpenAPI(openApiServerOptions);
