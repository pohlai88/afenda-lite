import { errorResult, type Result } from "@afenda/errors";
import type { EstablishmentStatus } from "../../../kernel/contracts/domain";
import { normalize } from "../../../kernel/validation/parse-input";

export function normalizeEstablishmentRegistrationIdentifier(
	value: string,
): string {
	return normalize(value);
}

/**
 * BR-04: only explicit allowed lifecycle transitions succeed.
 * Approved per CA-FD-EST-01, matching the
 * `ca_legal_establishment_status_check` constraint already in
 * @afenda/db (registered/active/suspended/closed).
 */
const ALLOWED_TRANSITIONS: Readonly<
	Record<EstablishmentStatus, readonly EstablishmentStatus[]>
> = {
	registered: ["active", "closed"],
	active: ["suspended", "closed"],
	suspended: ["active", "closed"],
	closed: [],
};

export function validateEstablishmentStatusTransition(input: {
	from: EstablishmentStatus;
	to: EstablishmentStatus;
}): Result<void> {
	return ALLOWED_TRANSITIONS[input.from].includes(input.to)
		? errorResult.ok(undefined)
		: errorResult.fail("CONFLICT", {
				publicMessage: "Establishment status transition is invalid.",
			});
}
