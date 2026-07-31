/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import {
	errorOpenApi,
	type OpenApiResponsesProjection,
} from "../../../src/index";

export const conflictResponses = errorOpenApi.responses([
	"CONCURRENCY_CONFLICT",
	"CONFLICT",
] as const);

export const mixedResponses = errorOpenApi.responses([
	"INTERNAL_ERROR",
	"BAD_REQUEST",
	"RATE_LIMITED",
] as const);

export const { 409: conflictResponse } = conflictResponses;
export const {
	400: badRequestResponse,
	429: rateLimitedResponse,
	500: internalResponse,
} = mixedResponses;

export const exactStatusProof: OpenApiResponsesProjection<
	readonly ["BAD_REQUEST", "RATE_LIMITED", "INTERNAL_ERROR"]
> = mixedResponses;
