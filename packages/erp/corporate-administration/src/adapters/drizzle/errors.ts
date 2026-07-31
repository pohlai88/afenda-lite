import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";

export function translateCorporateAdministrationInfrastructureError(
	error: unknown,
): Result<never> {
	return errorProject.result(
		errorIngress.postgres(error, {
			operation: "corporate-administration.persistence",
		}),
	);
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
