import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";

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

export function isPostgresExclusionViolation(error: unknown): boolean {
	return postgresErrorCode(error) === "23P01";
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
	_fallbackMessage: string,
): Result<never> {
	if (isCreateIdempotencyUniqueViolation(error)) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Idempotency key conflict",
		});
	}
	if (isPostgresForeignKeyViolation(error)) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Referenced record not found",
		});
	}
	if (isPostgresUniqueViolation(error)) {
		return errorResult.fail("CONFLICT", { publicMessage: "Duplicate record" });
	}
	if (isPostgresExclusionViolation(error)) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"The requested effective range overlaps a non-archived record",
		});
	}

	return errorProject.result(
		errorIngress.postgres(error, { operation: "persistence.postgres" }),
	);
}

export function mapNotFound(_message: string): Result<never> {
	return errorResult.fail("NOT_FOUND", {
		publicMessage: "The requested resource was not found",
	});
}

export function mapConflict(_message: string): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "The request conflicts with current state",
	});
}

export function mapInvalidState(_message: string): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "The request conflicts with current state",
	});
}
