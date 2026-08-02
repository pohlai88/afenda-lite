import { errorResult, type Result } from "@afenda/errors";

import {
	HUMAN_RESOURCES_ERROR_STALE_VERSION,
	humanResourcesErrorDetails,
} from "./error-codes";

/**
 * Optimistic concurrency guard for versioned HR aggregates.
 * Domain commands call this before versioned store updates/transitions.
 */
export function assertExpectedVersion(
	currentVersion: number,
	expectedVersion: number,
	_message = "Resource version is stale",
): Result<void> {
	if (currentVersion !== expectedVersion) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "The request conflicts with current state",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_STALE_VERSION,
			),
		});
	}
	return errorResult.ok(undefined);
}
