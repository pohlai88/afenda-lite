/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { projectErrorOpenApiResponses } from "../openapi/responses";

export const errorOpenApi = Object.freeze({
	responses: projectErrorOpenApiResponses,
});
