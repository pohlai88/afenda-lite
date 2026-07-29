/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import { AppError } from "../core/app-error";
import type { ErrorCode } from "../core/codes";

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
		code: "BAD_REQUEST",
		message: "A referenced record does not exist or is still in use",
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

function readProperty(record: Record<string, unknown>, key: string): unknown {
	try {
		return record[key];
	} catch {
		return undefined;
	}
}

function readSqlState(value: unknown, depth = 0): string | undefined {
	if (depth > MAX_CAUSE_DEPTH || typeof value !== "object" || value === null) {
		return undefined;
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
	return readSqlState(readProperty(record, "cause"), depth + 1);
}

/**
 * Maps a duck-typed Postgres failure to an AppError.
 *
 * Returns `undefined` when no SQLSTATE can be discovered, a mapped AppError for
 * a known SQLSTATE, and INTERNAL_ERROR for an unknown but valid SQLSTATE.
 * Driver messages, SQL text, stack traces, and raw causes are never included in
 * the public details projection.
 */
export function fromPostgresUnknown(error: unknown): AppError | undefined {
	const sqlState = readSqlState(error);
	if (sqlState === undefined) {
		return undefined;
	}
	const mapping = SQLSTATE_MAPPINGS[sqlState];
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
		details: mapping.retryable === true ? { retryable: true } : undefined,
	});
}
