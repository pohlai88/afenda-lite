import { errorResult, type Result } from "@afenda/errors";

import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../error-codes";

export function normalizeEmployeeNumber(
	raw: string,
): Result<{ employeeNumber: string; normalizedEmployeeNumber: string }> {
	const employeeNumber = raw.trim();
	if (employeeNumber.length === 0) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "The request is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	if (employeeNumber.length > 64) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "The request is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	return errorResult.ok({
		employeeNumber,
		normalizedEmployeeNumber: employeeNumber.toUpperCase(),
	});
}
