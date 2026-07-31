/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { errorOpenApi } from "@afenda/errors";

export const bundleFixtureOpenApi = errorOpenApi.responses([
	"VALIDATION_ERROR",
	"CONFLICT",
	"CONCURRENCY_CONFLICT",
	"RATE_LIMITED",
	"INTERNAL_ERROR",
] as const);
