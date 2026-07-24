import { fail, ok, type Result } from "@afenda/errors/result";

import {
	PAYROLL_ERROR_STALE_VERSION,
	payrollErrorDetails,
} from "../error-codes";

export function assertExpectedVersion(
	currentVersion: number,
	expectedVersion: number,
	message = "Resource version is stale",
): Result<void> {
	if (currentVersion !== expectedVersion) {
		return fail(
			"CONFLICT",
			message,
			payrollErrorDetails(PAYROLL_ERROR_STALE_VERSION),
		);
	}
	return ok(undefined);
}
