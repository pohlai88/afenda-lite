import { fail, ok, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../error-codes";

export function normalizeEmployeeNumber(
	raw: string,
): Result<{ employeeNumber: string; normalizedEmployeeNumber: string }> {
	const employeeNumber = raw.trim();
	if (employeeNumber.length === 0) {
		return fail(
			"BAD_REQUEST",
			"Employee number is required",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	if (employeeNumber.length > 64) {
		return fail(
			"BAD_REQUEST",
			"Employee number must be at most 64 characters",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok({
		employeeNumber,
		normalizedEmployeeNumber: employeeNumber.toUpperCase(),
	});
}
