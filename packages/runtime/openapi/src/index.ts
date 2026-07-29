/**
 * @afenda/openapi - Universal OpenAPI utilities
 * For Node-specific document writing, import from @afenda/openapi/node
 */

export {
	API_ERROR_CODES,
	type ApiErrorCode,
	isApiErrorCode,
} from "@afenda/errors";
export {
	OpenAPIRegistry,
	OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";

export { z } from "./zod";
