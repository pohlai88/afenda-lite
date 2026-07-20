import { AppError } from "../core/app-error";
import type { ErrorCode } from "../core/codes";

type SqlStateMap = {
	readonly code: ErrorCode;
	readonly message: string;
};

/**
 * Duck-typed Postgres / driver error shapes — no `pg` / Drizzle / Prisma deps.
 * Looks for SQLSTATE on `code`, `sqlState`, or nested `cause`.
 */
const SQLSTATE_MAP: Readonly<Record<string, SqlStateMap>> = {
	"23505": {
		code: "CONFLICT",
		message: "A conflicting record already exists",
	},
	"23503": {
		code: "BAD_REQUEST",
		message: "Referenced record does not exist",
	},
	"23502": {
		code: "BAD_REQUEST",
		message: "A required value was missing",
	},
	"23514": {
		code: "BAD_REQUEST",
		message: "A value failed a database constraint",
	},
	"22P02": {
		code: "BAD_REQUEST",
		message: "Invalid input syntax",
	},
	"28000": {
		code: "UNAUTHORIZED",
		message: "Database authentication failed",
	},
	"28P01": {
		code: "UNAUTHORIZED",
		message: "Database authentication failed",
	},
};

function readSqlState(value: unknown, depth = 0): string | undefined {
	if (depth > 3 || value === null || value === undefined) {
		return undefined;
	}
	if (typeof value !== "object") {
		return undefined;
	}
	const record = value as Record<string, unknown>;
	for (const key of ["code", "sqlState", "sqlstate"] as const) {
		const candidate = record[key];
		if (typeof candidate === "string" && /^[0-9A-Z]{5}$/.test(candidate)) {
			return candidate;
		}
	}
	return readSqlState(record.cause, depth + 1);
}

/**
 * Map a duck-typed Postgres failure to AppError, or `undefined` if not recognized.
 * Public message never includes SQL text from the driver.
 */
export function fromPostgresUnknown(error: unknown): AppError | undefined {
	const sqlState = readSqlState(error);
	if (sqlState === undefined) {
		return undefined;
	}
	const mapped = SQLSTATE_MAP[sqlState];
	if (mapped === undefined) {
		return new AppError({
			code: "INTERNAL_ERROR",
			message: "A database error occurred",
			isOperational: true,
			cause: error,
			details: { sqlState },
		});
	}
	return new AppError({
		code: mapped.code,
		message: mapped.message,
		isOperational: true,
		cause: error,
		details: { sqlState },
	});
}
