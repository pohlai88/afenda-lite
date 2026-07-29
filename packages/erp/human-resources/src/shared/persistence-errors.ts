import { fromPostgresUnknown } from "@afenda/errors/adapters/postgres";
import { fail, failFromAppError, type Result } from "@afenda/errors/result";

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

function readProperty(value: unknown, key: PropertyKey): unknown {
	if (!isRecord(value)) {
		return undefined;
	}
	try {
		return Reflect.get(value, key);
	} catch {
		return undefined;
	}
}

export function isPostgresUniqueViolation(error: unknown): boolean {
	return postgresErrorCode(error) === "23505";
}

export function isPostgresCheckViolation(error: unknown): boolean {
	return postgresErrorCode(error) === "23514";
}

export function isPostgresForeignKeyViolation(error: unknown): boolean {
	return postgresErrorCode(error) === "23503";
}

function postgresErrorCode(error: unknown): string | null {
	let current: unknown = error;
	for (let depth = 0; depth < 6 && current != null; depth += 1) {
		const code = readProperty(current, "code");
		if (typeof code === "string") {
			return code.toUpperCase();
		}
		current =
			current instanceof Error
				? current.cause
				: (readProperty(current, "cause") ?? null);
	}
	return null;
}

function postgresConstraintName(error: unknown): string {
	let current: unknown = error;
	for (let depth = 0; depth < 6 && current != null; depth += 1) {
		const constraint =
			readProperty(current, "constraint") ??
			readProperty(current, "constraint_name");
		if (typeof constraint === "string") {
			return constraint;
		}
		current =
			current instanceof Error
				? current.cause
				: (readProperty(current, "cause") ?? null);
	}
	return "";
}

export function postgresErrorMessage(error: unknown): string {
	let current: unknown = error;
	const parts: string[] = [];
	for (let depth = 0; depth < 6 && current != null; depth += 1) {
		if (current instanceof Error && current.message.length > 0) {
			parts.push(current.message);
		} else {
			const message = readProperty(current, "message");
			if (typeof message === "string" && message.length > 0) {
				parts.push(message);
			}
		}
		current =
			current instanceof Error
				? current.cause
				: (readProperty(current, "cause") ?? null);
	}
	if (parts.length > 0) {
		return parts.join(" | ");
	}
	return typeof error === "string" ? error : "";
}

export function isPostgresUndefinedTable(
	error: unknown,
	table?: string,
): boolean {
	const code = postgresErrorCode(error);
	const relation =
		readProperty(error, "table") ??
		readProperty(error, "relation") ??
		readProperty(error, "schema");
	const message = postgresErrorMessage(error);
	const undefinedTable =
		code === "42P01" || /relation .* does not exist/i.test(message);
	if (!undefinedTable) {
		return false;
	}
	if (table === undefined) {
		return true;
	}
	return relation === table || message.includes(table);
}

export function isCreateIdempotencyUniqueViolation(error: unknown): boolean {
	if (!isPostgresUniqueViolation(error)) {
		return false;
	}
	return /_org_create_idempotency_uidx|create_idempotency_key/i.test(
		postgresConstraintName(error),
	);
}

export function isEmployeeNumberUniqueViolation(error: unknown): boolean {
	if (!isPostgresUniqueViolation(error)) {
		return false;
	}
	return /hr_employee_org_normalized_number_uidx|normalized_employee_number/i.test(
		postgresConstraintName(error),
	);
}

export function isPostgresUniqueConstraint(
	error: unknown,
	pattern: RegExp,
): boolean {
	return (
		isPostgresUniqueViolation(error) &&
		pattern.test(postgresConstraintName(error))
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
	if (isPostgresUniqueConstraint(error, /hr_worker_org_person_uidx/i)) {
		return fail(
			"CONFLICT",
			"Person is already linked to a worker",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
		);
	}
	if (isPostgresUniqueConstraint(error, /hr_worker_org_employee_uidx/i)) {
		return fail(
			"CONFLICT",
			"Employee is already linked to a worker",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
		);
	}
	if (
		isPostgresUniqueConstraint(
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
		isPostgresUniqueConstraint(
			error,
			/hr_position_org_code_uidx|hr_employment_contract_org_employment_ref(?:_active)?_uidx/i,
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
		/date_range_check/i.test(postgresConstraintName(error))
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

	const mapped = fromPostgresUnknown(error);
	if (mapped !== undefined) {
		return failFromAppError(mapped);
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
