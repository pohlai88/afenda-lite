/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */

import { projectErrorOpenApiResponses } from "../openapi/responses";

export const errorOpenApi = Object.freeze({
	responses: projectErrorOpenApiResponses,
});
