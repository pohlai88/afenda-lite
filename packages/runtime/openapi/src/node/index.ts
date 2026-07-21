/**
 * @afenda/openapi/node - Node-specific OpenAPI utilities
 * Requires node:fs - Node.js only
 */

export type {
	AfendaDocumentMeta,
	AfendaOperationStatus,
	OpenApiHttpMethod,
	OperationMetadata,
	OperationMetadataMap,
	StampableOpenApiDocument,
} from "./document";

export {
	dataEnvelope,
	formatOpenApiYaml,
	OPENAPI_DOCUMENT_ID,
	OPENAPI_VERSION,
	stampAfendaDocument,
	stampOperationMetadata,
	writeOpenApiYaml,
} from "./document";
