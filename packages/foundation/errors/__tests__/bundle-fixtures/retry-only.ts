/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { errorProject, type ResultFailure } from "@afenda/errors";

const serviceUnavailable = Object.freeze({
	code: "SERVICE_UNAVAILABLE",
	message: "A required service is temporarily unavailable.",
	messageKey: "errors.serviceUnavailable",
	ok: false,
}) satisfies ResultFailure<"SERVICE_UNAVAILABLE">;

export const bundleFixtureRetry = errorProject.retry(serviceUnavailable);
