import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";

import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_DUPLICATE,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE,
	humanResourcesErrorDetails,
} from "../error-codes";

const HR_REGEX_1 =
	/hr_employee_org_normalized_number_uidx|normalized_employee_number/i;
const HR_REGEX_2 = /relation .* does not exist/i;
const HR_REGEX_3 = /_org_create_idempotency_uidx|create_idempotency_key/i;
const HR_REGEX_4 = /hr_worker_org_person_uidx/i;
const HR_REGEX_5 = /hr_worker_org_employee_uidx/i;
const HR_REGEX_6 =
	/hr_employment_org_employee_open_uidx|hr_work_assignment_org_employment_open_uidx/i;
const HR_REGEX_7 =
	/hr_position_org_code_uidx|hr_employment_contract_org_employment_ref(?:_active)?_uidx/i;
const HR_REGEX_8 = /date_range_check/i;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function readProperty(value: unknown, key: PropertyKey): unknown {
	if (!isRecord(value)) {
		return;
	}
	try {
		return Reflect.get(value, key);
	} catch {
		// A throwing accessor is treated as an unreadable property.
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
	for (let depth = 0; depth < 6 && current !== null; depth += 1) {
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
	for (let depth = 0; depth < 6 && current !== null; depth += 1) {
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
	for (let depth = 0; depth < 6 && current !== null; depth += 1) {
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
	const undefinedTable = code === "42P01" || HR_REGEX_2.test(message);
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
	return HR_REGEX_3.test(postgresConstraintName(error));
}

export function isEmployeeNumberUniqueViolation(error: unknown): boolean {
	if (!isPostgresUniqueViolation(error)) {
		return false;
	}
	return HR_REGEX_1.test(postgresConstraintName(error));
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
	_fallbackMessage: string,
): Result<never> {
	if (isCreateIdempotencyUniqueViolation(error)) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Idempotency key conflict",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			),
		});
	}
	if (isEmployeeNumberUniqueViolation(error)) {
		return mapEmployeeNumberDuplicate();
	}
	if (isPostgresUniqueConstraint(error, HR_REGEX_4)) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Person is already linked to a worker",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			),
		});
	}
	if (isPostgresUniqueConstraint(error, HR_REGEX_5)) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Employee is already linked to a worker",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			),
		});
	}
	if (isPostgresUniqueConstraint(error, HR_REGEX_6)) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Open record already exists",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			),
		});
	}
	if (isPostgresUniqueConstraint(error, HR_REGEX_7)) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Duplicate reference",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_DUPLICATE,
			),
		});
	}
	if (
		isPostgresCheckViolation(error) &&
		HR_REGEX_8.test(postgresConstraintName(error))
	) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "End date must be on or after start date",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	if (isPostgresForeignKeyViolation(error)) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Referenced record not found",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			),
		});
	}

	const projected = errorProject.result(
		errorIngress.postgres(error, { operation: "persistence.postgres" }),
	);
	return errorResult.withContext(
		projected,
		humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
	);
}

export function mapEmployeeNumberDuplicate(
	_message = "Employee number already exists",
): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "The request conflicts with current state",
		internalContext: humanResourcesErrorDetails(
			HUMAN_RESOURCES_ERROR_DUPLICATE,
		),
	});
}

export function mapNotFound(
	_message: string,
	_details:
		| typeof HUMAN_RESOURCES_ERROR_NOT_FOUND
		| typeof HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE = HUMAN_RESOURCES_ERROR_NOT_FOUND,
): Result<never> {
	return errorResult.fail("NOT_FOUND", {
		publicMessage: "The requested resource was not found",
		internalContext: humanResourcesErrorDetails(_details),
	});
}
