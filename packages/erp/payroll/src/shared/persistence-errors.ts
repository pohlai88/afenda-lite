import { fail, type Result } from "@afenda/errors/result";

import {
	PAYROLL_ERROR_CONFLICT,
	PAYROLL_ERROR_CROSS_ORGANIZATION_REFERENCE,
	PAYROLL_ERROR_DUPLICATE,
	PAYROLL_ERROR_INVALID_STATE,
	PAYROLL_ERROR_NOT_FOUND,
	PAYROLL_ERROR_PERSISTENCE_FAILURE,
	payrollErrorDetails,
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

export function isCreateIdempotencyUniqueViolation(error: unknown): boolean {
	if (!isPostgresUniqueViolation(error)) {
		return false;
	}
	return /_org_create_idempotency_uidx|create_idempotency_key/i.test(
		writeErrorMessage(error),
	);
}

export function isPayrollRunIdentityUniqueViolation(error: unknown): boolean {
	if (!isPostgresUniqueViolation(error)) {
		return false;
	}
	return /payroll_run_org_identity_uidx/i.test(writeErrorMessage(error));
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
	return fail(
		"INTERNAL_ERROR",
		fallbackMessage,
		payrollErrorDetails(PAYROLL_ERROR_PERSISTENCE_FAILURE),
	);
}

export function mapNotFound(message: string): Result<never> {
	return fail("NOT_FOUND", message, payrollErrorDetails(PAYROLL_ERROR_NOT_FOUND));
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
