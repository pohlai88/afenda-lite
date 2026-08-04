/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */

import { errorProject, type ResultFailure } from "@afenda/errors";

const serviceUnavailable = Object.freeze({
	code: "SERVICE_UNAVAILABLE",
	message: "A required service is temporarily unavailable.",
	messageKey: "errors.serviceUnavailable",
	ok: false,
}) satisfies ResultFailure<"SERVICE_UNAVAILABLE">;

export const bundleFixtureRetry = errorProject.retry(serviceUnavailable);
