/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import {
	createCanonicalFailure,
	createCanonicalFailureInternal,
} from "../failure/create";
import type { Failure } from "../failure/types";
import { readProperty } from "../internal/object";
import type { FailureContext } from "../public-types";

const SQLSTATE_PATTERN = /^[0-9A-Z]{5}$/;
const MAX_CAUSE_DEPTH = 4;

type PostgresFailureCode =
	| "CONFLICT"
	| "CONCURRENCY_CONFLICT"
	| "INTERNAL_ERROR"
	| "SERVICE_UNAVAILABLE";

/**
 * The complete reviewed SQLSTATE policy. Category-prefix guessing is forbidden:
 * authentication, configuration, programming, integrity, and unknown states are
 * internal failures unless a state is explicitly admitted here.
 */
const POSTGRES_FAILURE_CODE_BY_SQLSTATE = Object.freeze({
	"08006": "SERVICE_UNAVAILABLE",
	"23505": "CONFLICT",
	"40001": "CONCURRENCY_CONFLICT",
	"40P01": "CONCURRENCY_CONFLICT",
	"53300": "SERVICE_UNAVAILABLE",
	"55P03": "CONCURRENCY_CONFLICT",
	"57P01": "SERVICE_UNAVAILABLE",
	"57P02": "SERVICE_UNAVAILABLE",
	"57P03": "SERVICE_UNAVAILABLE",
} as const satisfies Readonly<Record<string, PostgresFailureCode>>);
const POSTGRES_FAILURE_CODES: Readonly<Record<string, PostgresFailureCode>> =
	POSTGRES_FAILURE_CODE_BY_SQLSTATE;

function postgresFailureCode(sqlState: string): PostgresFailureCode {
	return POSTGRES_FAILURE_CODES[sqlState] ?? "INTERNAL_ERROR";
}

export function postgresSqlState(
	value: unknown,
	depth = 0,
): string | undefined {
	if (depth > MAX_CAUSE_DEPTH) {
		return;
	}

	for (const key of ["code", "sqlState", "sqlstate"] as const) {
		const candidate = readProperty(value, key);
		if (typeof candidate !== "string") {
			continue;
		}

		const normalized = candidate.toUpperCase();
		if (SQLSTATE_PATTERN.test(normalized)) {
			return normalized;
		}
	}

	const cause = readProperty(value, "cause");
	return cause === undefined ? undefined : postgresSqlState(cause, depth + 1);
}

export function hasPostgresSqlState(error: unknown, expected: string): boolean {
	const normalizedExpected = expected.toUpperCase();
	return (
		SQLSTATE_PATTERN.test(normalizedExpected) &&
		postgresSqlState(error) === normalizedExpected
	);
}

/**
 * Canonical, total PostgreSQL ingress. The return union is intentionally closed
 * so callers cannot receive request-validation or authorization outcomes from a
 * database-driver value.
 */
export function postgres(
	error: unknown,
	context: FailureContext,
): Failure<PostgresFailureCode> {
	const sqlState = postgresSqlState(error);
	if (sqlState === undefined) {
		return createCanonicalFailure("INTERNAL_ERROR", context);
	}

	return createCanonicalFailureInternal(
		postgresFailureCode(sqlState),
		context,
		{ source: "postgres", sqlState },
	);
}
