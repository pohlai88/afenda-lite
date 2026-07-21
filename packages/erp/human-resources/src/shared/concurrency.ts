import { fail, ok, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_STALE_VERSION,
	humanResourcesErrorDetails,
} from "../error-codes";

/**
 * Optimistic concurrency guard for versioned HR aggregates.
 * Domain commands call this before versioned store updates/transitions.
 */
export function assertExpectedVersion(
	currentVersion: number,
	expectedVersion: number,
	message = "Resource version is stale",
): Result<void> {
	if (currentVersion !== expectedVersion) {
		return fail(
			"CONFLICT",
			message,
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_STALE_VERSION),
		);
	}
	return ok(undefined);
}
