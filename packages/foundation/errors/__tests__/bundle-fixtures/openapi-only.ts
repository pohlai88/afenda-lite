/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */

import { errorOpenApi } from "@afenda/errors";

export const bundleFixtureOpenApi = errorOpenApi.responses([
	"VALIDATION_ERROR",
	"CONFLICT",
	"CONCURRENCY_CONFLICT",
	"RATE_LIMITED",
	"INTERNAL_ERROR",
] as const);
