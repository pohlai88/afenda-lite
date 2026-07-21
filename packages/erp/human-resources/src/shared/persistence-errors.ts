import { fail, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_DUPLICATE,
	HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE,
	humanResourcesErrorDetails,
} from "../error-codes";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function writeErrorMessage(error: unknown): string {
	if (isRecord(error) && typeof error.message === "string") {
		return error.message;
	}
	return error instanceof Error ? error.message : String(error);
}

export function isPostgresUniqueViolation(error: unknown): boolean {
	return isRecord(error) && error.code === "23505";
}

export function isCreateIdempotencyUniqueViolation(error: unknown): boolean {
	if (!isPostgresUniqueViolation(error)) {
		return false;
	}
	return /hr_employee_org_create_idempotency_uidx|create_idempotency_key/i.test(
		writeErrorMessage(error),
	);
}

export function isEmployeeNumberUniqueViolation(error: unknown): boolean {
	if (!isPostgresUniqueViolation(error)) {
		return false;
	}
	return /hr_employee_org_normalized_number_uidx|normalized_employee_number/i.test(
		writeErrorMessage(error),
	);
}

/**
 * Map unexpected persistence failures to a stable Result.
 * Never exposes raw SQL / Drizzle messages to callers.
 */
export function mapPersistenceFailure(
	_error: unknown,
	fallbackMessage: string,
): Result<never> {
	return fail(
		"INTERNAL_ERROR",
		fallbackMessage,
		humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
	);
}

export function mapEmployeeNumberDuplicate(
	message = "Employee number already exists",
): Result<never> {
	return fail(
		"CONFLICT",
		message,
		humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
	);
}
