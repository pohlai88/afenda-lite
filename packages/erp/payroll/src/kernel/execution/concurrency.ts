import { errorResult, type Result } from "@afenda/errors";

export function assertExpectedVersion(
	currentVersion: number,
	expectedVersion: number,
	_message = "Resource version is stale",
): Result<void> {
	if (currentVersion !== expectedVersion) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "The request conflicts with current state",
		});
	}
	return errorResult.ok(undefined);
}
