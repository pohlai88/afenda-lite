import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Stable document id for MDX `document=` / `_openapi.preload` / generateFiles.
 * Shared by lib/openapi.server.ts and scripts/generate-openapi-docs.mts.
 * Must stay identical across createOpenAPI SchemaRecord keys and generated MDX.
 * Relative to the apps/docs package root (not process.cwd()).
 */
export const OPENAPI_DOCUMENT_ID =
	"../../docs-V2/api/OPEN-001-openapi.yaml" as const;

export type OpenApiDocumentId = typeof OPENAPI_DOCUMENT_ID;

/** apps/docs package root — parent of this lib/ module. */
const docsAppDir = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Absolute filesystem path to the docs-V2 OpenAPI SSOT.
 * Resolved from the apps/docs package root — cwd-independent.
 * Do not copy YAML under apps/docs/openapi/.
 */
export const OPENAPI_DOCUMENT_PATH = join(docsAppDir, OPENAPI_DOCUMENT_ID);
