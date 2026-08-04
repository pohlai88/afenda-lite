/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */
import type { CanonicalErrorCode } from "../public-types";
import type { Failure, InternalFailureRecord } from "./types";

const failureRecords = new WeakMap<
	object,
	InternalFailureRecord<CanonicalErrorCode>
>();

export function createFailureIdentity<C extends CanonicalErrorCode>(
	record: InternalFailureRecord<C>,
): Failure<C> {
	const identity = Object.freeze({});
	// Erasing C in the private store is safe because reads are bound to this identity.
	failureRecords.set(
		identity,
		record as InternalFailureRecord<CanonicalErrorCode>,
	);
	return identity as Failure<C>;
}

export function isTrustedFailure(value: unknown): value is Failure {
	return (
		typeof value === "object" && value !== null && failureRecords.has(value)
	);
}

export function readFailureRecord<C extends CanonicalErrorCode>(
	failure: Failure<C>,
): InternalFailureRecord<C> {
	const record = failureRecords.get(failure);
	if (record === undefined) {
		throw new TypeError(
			"Failure identity is not owned by this package instance.",
		);
	}

	// The private map is the authority that binds an identity to its code generic.
	return record as InternalFailureRecord<C>;
}
