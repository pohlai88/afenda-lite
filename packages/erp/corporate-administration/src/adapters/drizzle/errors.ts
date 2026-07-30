// biome-ignore-all lint/style/useDefaultSwitchClause: PostgreSQL error code handling is intentionally selective and falls through to the original error.
// biome-ignore-all lint/suspicious/noEmptyBlockStatements: Error metadata reflection failures intentionally fall through.
import {
	fromPostgresUnknown,
	postgresSqlState,
} from "@afenda/errors/adapters/postgres";
import { fail, failFromAppError, type Result } from "@afenda/errors/result";

import { corporateAdministrationErrorDetails } from "../../error-codes";

export type CorporateAdministrationInfrastructureFailureKind =
	| "unique_constraint_conflict"
	| "effective_range_overlap"
	| "database_unavailable"
	| "transaction_failure"
	| "serialization_failure"
	| "unexpected_infrastructure_error";

const UNIQUE_CONSTRAINT_SQLSTATE = "23505";
const EXCLUSION_CONSTRAINT_SQLSTATE = "23P01";
const SERIALIZATION_FAILURE_SQLSTATE = "40001";
const TRANSACTION_FAILURE_SQLSTATES = new Set([
	"42P01",
	"25000",
	"25001",
	"25002",
	"25003",
	"25004",
	"25005",
	"25006",
	"25007",
	"25008",
	"25P01",
	"25P02",
	"25P03",
	"2D000",
	"40P01",
]);
const DATABASE_UNAVAILABLE_SQLSTATES = new Set([
	"08000",
	"08001",
	"08003",
	"08004",
	"08006",
	"08007",
	"08P01",
	"28000",
	"28P01",
	"53300",
	"53400",
	"57P01",
	"57P02",
	"57P03",
]);
const DATABASE_UNAVAILABLE_CODES = new Set([
	"ECONNRESET",
	"ECONNREFUSED",
	"ETIMEDOUT",
	"ENOTFOUND",
	"EAI_AGAIN",
	"UND_ERR_CONNECT_TIMEOUT",
	"UND_ERR_SOCKET",
]);
const UNEXPECTED_DATABASE_SQLSTATES = new Set(["XX000", "XX001", "XX002"]);

export function translateCorporateAdministrationInfrastructureError(
	error: unknown,
): Result<never> | undefined {
	const kind = classifyInfrastructureFailure(error);
	if (kind === undefined) {
		const mapped = fromPostgresUnknown(error);
		return mapped === undefined ? undefined : failFromAppError(mapped);
	}

	switch (kind) {
		case "unique_constraint_conflict":
			return fail(
				"CONFLICT",
				"Corporate Administration write conflicts with existing data.",
				corporateAdministrationErrorDetails(
					"CORPORATE_ADMINISTRATION_CONFLICT",
					{ field: "database" },
				),
			);
		case "effective_range_overlap":
			return fail(
				"CONFLICT",
				"Corporate Administration jurisdiction profile overlaps an existing profile.",
				corporateAdministrationErrorDetails(
					"CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
					{ field: "effectiveRange" },
				),
			);
		case "serialization_failure":
			return fail(
				"CONFLICT",
				"Corporate Administration write could not be serialized.",
				corporateAdministrationErrorDetails(
					"CORPORATE_ADMINISTRATION_CONFLICT",
					{ field: "transaction" },
				),
			);
		case "transaction_failure":
			return fail(
				"SERVICE_UNAVAILABLE",
				"Corporate Administration transaction failed.",
				corporateAdministrationErrorDetails(
					"CORPORATE_ADMINISTRATION_EXTERNAL_DEPENDENCY_UNAVAILABLE",
					{ field: "transaction" },
				),
			);
		case "database_unavailable":
			return fail(
				"SERVICE_UNAVAILABLE",
				"Corporate Administration database is unavailable.",
				corporateAdministrationErrorDetails(
					"CORPORATE_ADMINISTRATION_EXTERNAL_DEPENDENCY_UNAVAILABLE",
					{ field: "database" },
				),
			);
		case "unexpected_infrastructure_error":
			return;
	}
}

export function staleReservationResult(): Result<never> {
	return fail(
		"CONFLICT",
		"Corporate Administration idempotency reservation is no longer active.",
		corporateAdministrationErrorDetails(
			"CORPORATE_ADMINISTRATION_IDEMPOTENCY_CONFLICT",
			{ field: "reservationToken" },
		),
	);
}

export function idempotencyConflictResult(): Result<never> {
	return fail(
		"CONFLICT",
		"Corporate Administration command key was used with different input.",
		corporateAdministrationErrorDetails(
			"CORPORATE_ADMINISTRATION_IDEMPOTENCY_CONFLICT",
			{ field: "idempotencyKey" },
		),
	);
}

function classifyInfrastructureFailure(
	error: unknown,
): CorporateAdministrationInfrastructureFailureKind | undefined {
	const sqlState = postgresSqlState(error);
	if (sqlState !== undefined) {
		if (sqlState === EXCLUSION_CONSTRAINT_SQLSTATE) {
			return "effective_range_overlap";
		}
		if (sqlState === UNIQUE_CONSTRAINT_SQLSTATE) {
			return "unique_constraint_conflict";
		}
		if (sqlState === SERIALIZATION_FAILURE_SQLSTATE) {
			return "serialization_failure";
		}
		if (TRANSACTION_FAILURE_SQLSTATES.has(sqlState)) {
			return "transaction_failure";
		}
		if (DATABASE_UNAVAILABLE_SQLSTATES.has(sqlState)) {
			return "database_unavailable";
		}
		if (UNEXPECTED_DATABASE_SQLSTATES.has(sqlState)) {
			return "unexpected_infrastructure_error";
		}
		return;
	}

	const driverCode = readDriverCode(error);
	if (driverCode !== undefined && DATABASE_UNAVAILABLE_CODES.has(driverCode)) {
		return "database_unavailable";
	}
}

function readDriverCode(value: unknown, depth = 0): string | undefined {
	if (depth > 3 || value === null || value === undefined) {
		return;
	}
	if (typeof value !== "object") {
		return;
	}
	const record = value as Record<string, unknown>;
	const candidate = readProperty(record, "code");
	if (typeof candidate === "string") {
		return candidate;
	}
	return readDriverCode(readProperty(record, "cause"), depth + 1);
}

function readProperty(value: Record<string, unknown>, key: string): unknown {
	try {
		return value[key];
	} catch {}
}
