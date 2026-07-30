import { fromPostgresUnknown } from "@afenda/errors/adapters/postgres";
import { fail, failFromAppError, type Result } from "@afenda/errors/result";

import {
	PAYROLL_ERROR_CONFLICT,
	PAYROLL_ERROR_CROSS_ORGANIZATION_REFERENCE,
	PAYROLL_ERROR_DUPLICATE,
	PAYROLL_ERROR_INVALID_STATE,
	PAYROLL_ERROR_NOT_FOUND,
	PAYROLL_ERROR_PERSISTENCE_FAILURE,
	payrollErrorDetails,
} from "../error-codes";

const CREATE_IDEMPOTENCY_CONFLICT_PATTERN =
	/_org_create_idempotency_uidx|create_idempotency_key/i;
const RUN_IDENTITY_CONFLICT_PATTERN = /payroll_run_org_identity_uidx/i;

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
		// Hostile error objects may expose throwing getters; absence is intentional.
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

function postgresErrorCode(error: unknown): string | undefined {
	const code = readProperty(error, "code");
	return typeof code === "string" ? code.toUpperCase() : undefined;
}

function postgresConstraintName(error: unknown): string {
	const constraint =
		readProperty(error, "constraint") ?? readProperty(error, "constraint_name");
	return typeof constraint === "string" ? constraint : "";
}

export function isCreateIdempotencyUniqueViolation(error: unknown): boolean {
	if (!isPostgresUniqueViolation(error)) {
		return false;
	}
	return CREATE_IDEMPOTENCY_CONFLICT_PATTERN.test(
		postgresConstraintName(error),
	);
}

export function isPayrollRunIdentityUniqueViolation(error: unknown): boolean {
	if (!isPostgresUniqueViolation(error)) {
		return false;
	}
	return RUN_IDENTITY_CONFLICT_PATTERN.test(postgresConstraintName(error));
}

export function mapPersistenceFailure(
	error: unknown,
	fallbackMessage: string,
): Result<never> {
	if (isCreateIdempotencyUniqueViolation(error)) {
		return fail(
			"CONFLICT",
			"Idempotency key conflict",
			payrollErrorDetails(PAYROLL_ERROR_CONFLICT),
		);
	}
	if (isPostgresForeignKeyViolation(error)) {
		return fail(
			"NOT_FOUND",
			"Referenced record not found",
			payrollErrorDetails(PAYROLL_ERROR_CROSS_ORGANIZATION_REFERENCE),
		);
	}
	if (isPostgresUniqueViolation(error)) {
		return fail(
			"CONFLICT",
			"Duplicate record",
			payrollErrorDetails(PAYROLL_ERROR_DUPLICATE),
		);
	}

	const mapped = fromPostgresUnknown(error);
	if (mapped !== undefined) {
		return failFromAppError(mapped);
	}

	return fail(
		"INTERNAL_ERROR",
		fallbackMessage,
		payrollErrorDetails(PAYROLL_ERROR_PERSISTENCE_FAILURE),
	);
}

export function mapNotFound(message: string): Result<never> {
	return fail(
		"NOT_FOUND",
		message,
		payrollErrorDetails(PAYROLL_ERROR_NOT_FOUND),
	);
}

export function mapConflict(message: string): Result<never> {
	return fail("CONFLICT", message, payrollErrorDetails(PAYROLL_ERROR_CONFLICT));
}

export function mapInvalidState(message: string): Result<never> {
	return fail(
		"CONFLICT",
		message,
		payrollErrorDetails(PAYROLL_ERROR_INVALID_STATE),
	);
}
