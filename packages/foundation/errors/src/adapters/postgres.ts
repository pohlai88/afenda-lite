/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import { AppError } from "../core/app-error";
import type { ErrorCode } from "../core/codes";
import { normalizeUnknown } from "../core/normalize";

const SQLSTATE_PATTERN = /^[0-9A-Z]{5}$/;
const MAX_CAUSE_DEPTH = 4;

type SqlStateMapping = Readonly<{
	code: ErrorCode;
	message: string;
	isOperational: boolean;
	retryable?: boolean;
}>;

const SQLSTATE_MAP = {
	"23505": {
		code: "CONFLICT",
		message: "A conflicting record already exists",
		isOperational: true,
	},
	"23503": {
		code: "CONFLICT",
		message: "The operation conflicts with a referenced record",
		isOperational: true,
	},
	"23502": {
		code: "VALIDATION_ERROR",
		message: "A required value was missing",
		isOperational: true,
	},
	"23514": {
		code: "VALIDATION_ERROR",
		message: "A value failed a database constraint",
		isOperational: true,
	},
	"22P02": {
		code: "VALIDATION_ERROR",
		message: "A value has invalid syntax",
		isOperational: true,
	},
	"40001": {
		code: "CONFLICT",
		message: "The operation conflicted with another transaction",
		isOperational: true,
		retryable: true,
	},
	"40P01": {
		code: "CONFLICT",
		message: "The operation conflicted with another transaction",
		isOperational: true,
		retryable: true,
	},
	"53300": {
		code: "SERVICE_UNAVAILABLE",
		message: "The database is temporarily unavailable",
		isOperational: true,
		retryable: true,
	},
	"57P03": {
		code: "SERVICE_UNAVAILABLE",
		message: "The database is temporarily unavailable",
		isOperational: true,
		retryable: true,
	},
	"57P01": {
		code: "SERVICE_UNAVAILABLE",
		message: "The database is temporarily unavailable",
		isOperational: true,
		retryable: true,
	},
	"57P02": {
		code: "SERVICE_UNAVAILABLE",
		message: "The database is temporarily unavailable",
		isOperational: true,
		retryable: true,
	},
	"55P03": {
		code: "CONFLICT",
		message: "The operation conflicted with a database lock",
		isOperational: true,
		retryable: true,
	},
	"28000": {
		code: "SERVICE_UNAVAILABLE",
		message: "The database service could not be accessed",
		isOperational: false,
	},
	"28P01": {
		code: "SERVICE_UNAVAILABLE",
		message: "The database service could not be accessed",
		isOperational: false,
	},
} as const satisfies Readonly<Record<string, SqlStateMapping>>;

const SQLSTATE_MAPPINGS: Readonly<Record<string, SqlStateMapping>> =
	SQLSTATE_MAP;
const SQLSTATE_KEYS = ["code", "sqlState", "sqlstate"] as const;

function mappingForSqlState(sqlState: string): SqlStateMapping | undefined {
	const exact = SQLSTATE_MAPPINGS[sqlState];
	if (exact !== undefined) {
		return exact;
	}
	if (sqlState.startsWith("08") || sqlState.startsWith("53")) {
		return {
			code: "SERVICE_UNAVAILABLE",
			message: "The database is temporarily unavailable",
			isOperational: true,
			retryable: true,
		};
	}
	if (sqlState.startsWith("58") || sqlState.startsWith("XX")) {
		return {
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
			isOperational: false,
		};
	}
}

function readProperty(record: Record<string, unknown>, key: string): unknown {
	try {
		return record[key];
	} catch {
		// Hostile proxy/getter values are treated as absent database metadata.
	}
}

export function postgresSqlState(
	value: unknown,
	depth = 0,
): string | undefined {
	if (depth > MAX_CAUSE_DEPTH || typeof value !== "object" || value === null) {
		return;
	}
	const record = value as Record<string, unknown>;
	for (const key of SQLSTATE_KEYS) {
		const candidate = readProperty(record, key);
		if (typeof candidate !== "string") {
			continue;
		}
		const normalized = candidate.toUpperCase();
		if (SQLSTATE_PATTERN.test(normalized)) {
			return normalized;
		}
	}
	return postgresSqlState(readProperty(record, "cause"), depth + 1);
}

export function hasPostgresSqlState(error: unknown, expected: string): boolean {
	const normalizedExpected = expected.toUpperCase();
	return (
		SQLSTATE_PATTERN.test(normalizedExpected) &&
		postgresSqlState(error) === normalizedExpected
	);
}

/**
 * Maps a duck-typed Postgres failure to an AppError.
 *
 * Returns `undefined` when no SQLSTATE can be discovered, a mapped AppError for
 * a known SQLSTATE, and INTERNAL_ERROR for an unknown but valid SQLSTATE.
 * Driver messages, SQL text, stack traces, and raw causes are never included in
 * the public details projection.
 */
function mapPostgresUnknown(error: unknown): AppError | undefined {
	const sqlState = postgresSqlState(error);
	if (sqlState === undefined) {
		return;
	}
	const mapping = mappingForSqlState(sqlState);
	if (mapping === undefined) {
		return new AppError({
			code: "INTERNAL_ERROR",
			message: "A database error occurred",
			isOperational: false,
			cause: error,
		});
	}
	return new AppError({
		code: mapping.code,
		message: mapping.message,
		isOperational: mapping.isOperational,
		cause: error,
		retryable: mapping.retryable === true,
	});
}

/**
 * Total PostgreSQL boundary normalizer.
 *
 * Recognized SQLSTATE values use the explicit driver-free mapping. Every other
 * value becomes the same safe INTERNAL_ERROR used by generic normalization.
 */
export function normalizePostgresUnknown(
	error: unknown,
	operation?: string,
): AppError {
	const mapped = mapPostgresUnknown(error);
	if (mapped !== undefined) {
		return operation === undefined
			? mapped
			: new AppError({
					code: mapped.code,
					message: mapped.message,
					...(mapped.details === undefined ? {} : { details: mapped.details }),
					isOperational: mapped.isOperational,
					operation,
					retryable: mapped.retryable,
					cause: error,
				});
	}
	return normalizeUnknown(error, operation);
}
