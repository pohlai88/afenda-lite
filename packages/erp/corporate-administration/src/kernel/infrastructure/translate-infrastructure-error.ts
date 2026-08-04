import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";
import { corporateAdministrationEffectiveRangeOverlapResult } from "../execution/error-codes";

const JURISDICTION_PROFILE_OVERLAP_CONSTRAINT =
	"ca_company_jurisdiction_profile_no_overlap_excl";

export function translateCorporateAdministrationInfrastructureError(
	error: unknown,
): Result<never> {
	if (isJurisdictionProfileOverlapViolation(error)) {
		return corporateAdministrationEffectiveRangeOverlapResult();
	}
	return errorProject.result(
		errorIngress.postgres(error, {
			operation: "corporate-administration.persistence",
		}),
	);
}

function isJurisdictionProfileOverlapViolation(error: unknown): boolean {
	const visited = new Set<object>();
	let current: unknown = error;
	for (let depth = 0; depth < 5; depth += 1) {
		if (
			typeof current !== "object" ||
			current === null ||
			visited.has(current)
		) {
			return false;
		}
		visited.add(current);
		const sqlState =
			readDataProperty(current, "code") ??
			readDataProperty(current, "sqlstate");
		const constraint = readDataProperty(current, "constraint");
		if (
			typeof sqlState === "string" &&
			sqlState.toUpperCase() === "23P01" &&
			constraint === JURISDICTION_PROFILE_OVERLAP_CONSTRAINT
		) {
			return true;
		}
		current =
			readDataProperty(current, "cause") ??
			readDataProperty(current, "sourceError");
	}
	return false;
}

function readDataProperty(value: object, key: string): unknown {
	try {
		const descriptor = Object.getOwnPropertyDescriptor(value, key);
		return descriptor !== undefined && "value" in descriptor
			? descriptor.value
			: undefined;
	} catch {
		// Hostile proxy traps fail closed without exposing infrastructure details.
	}
}

export function staleReservationResult(): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage:
			"Corporate Administration idempotency reservation is no longer active.",
	});
}

export function idempotencyConflictResult(): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage:
			"Corporate Administration command key was used with different input.",
	});
}
