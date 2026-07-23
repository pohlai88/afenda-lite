import { fail, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_DUPLICATE,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
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

export function isPostgresCheckViolation(error: unknown): boolean {
	return isRecord(error) && error.code === "23514";
}

export function isPostgresForeignKeyViolation(error: unknown): boolean {
	return isRecord(error) && error.code === "23503";
}

function postgresErrorCode(error: unknown): string | null {
	let current: unknown = error;
	for (let depth = 0; depth < 6 && current != null; depth += 1) {
		if (isRecord(current) && typeof current.code === "string") {
			return current.code;
		}
		current =
			current instanceof Error
				? current.cause
				: isRecord(current) && "cause" in current
					? current.cause
					: null;
	}
	return null;
}

function postgresErrorMessage(error: unknown): string {
	let current: unknown = error;
	const parts: string[] = [];
	for (let depth = 0; depth < 6 && current != null; depth += 1) {
		if (current instanceof Error && current.message.length > 0) {
			parts.push(current.message);
		} else if (isRecord(current) && typeof current.message === "string") {
			parts.push(current.message);
		}
		current =
			current instanceof Error
				? current.cause
				: isRecord(current) && "cause" in current
					? current.cause
					: null;
	}
	if (parts.length > 0) {
		return parts.join(" | ");
	}
	return error instanceof Error ? error.message : String(error);
}

export function isPostgresUndefinedTable(
	error: unknown,
	table?: string,
): boolean {
	const code = postgresErrorCode(error);
	const message = postgresErrorMessage(error);
	const undefinedTable =
		code === "42P01" || /relation .* does not exist/i.test(message);
	if (!undefinedTable) {
		return false;
	}
	if (table === undefined) {
		return true;
	}
	return message.includes(table);
}

export function isCreateIdempotencyUniqueViolation(error: unknown): boolean {
	if (!isPostgresUniqueViolation(error)) {
		return false;
	}
	return /_org_create_idempotency_uidx|create_idempotency_key/i.test(
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

function uniqueConstraintMatch(error: unknown, pattern: RegExp): boolean {
	return (
		isPostgresUniqueViolation(error) && pattern.test(writeErrorMessage(error))
	);
}

/**
 * Map unexpected persistence failures to a stable Result.
 * Never exposes raw SQL / Drizzle messages to callers.
 */
export function mapPersistenceFailure(
	error: unknown,
	fallbackMessage: string,
): Result<never> {
	if (isCreateIdempotencyUniqueViolation(error)) {
		return fail(
			"CONFLICT",
			"Idempotency key conflict",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
		);
	}
	if (isEmployeeNumberUniqueViolation(error)) {
		return mapEmployeeNumberDuplicate();
	}
	if (
		uniqueConstraintMatch(
			error,
			/hr_employment_org_employee_open_uidx|hr_work_assignment_org_employment_open_uidx/i,
		)
	) {
		return fail(
			"CONFLICT",
			"Open record already exists",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
		);
	}
	if (
		uniqueConstraintMatch(
			error,
			/hr_position_org_code_uidx|hr_employment_contract_org_employment_ref_uidx/i,
		)
	) {
		return fail(
			"CONFLICT",
			"Duplicate reference",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
		);
	}
	if (
		isPostgresCheckViolation(error) &&
		/date_range_check/i.test(writeErrorMessage(error))
	) {
		return fail(
			"BAD_REQUEST",
			"End date must be on or after start date",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	if (isPostgresForeignKeyViolation(error)) {
		return fail(
			"NOT_FOUND",
			"Referenced record not found",
			humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			),
		);
	}
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

export function mapNotFound(
	message: string,
	details:
		| typeof HUMAN_RESOURCES_ERROR_NOT_FOUND
		| typeof HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE = HUMAN_RESOURCES_ERROR_NOT_FOUND,
): Result<never> {
	return fail("NOT_FOUND", message, humanResourcesErrorDetails(details));
}
