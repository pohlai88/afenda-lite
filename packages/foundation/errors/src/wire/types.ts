/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */

import type { CanonicalErrorCode, PublicErrorData } from "../public-types";

export const FAILURE_WIRE_SCHEMA = "afenda.failure/v1";

/** Canonical process-boundary representation. It never carries private context. */
export type SerializedFailureEnvelope<
	Code extends CanonicalErrorCode = CanonicalErrorCode,
> = Code extends CanonicalErrorCode
	? Readonly<{
			error: PublicErrorData<Code>;
			schema: typeof FAILURE_WIRE_SCHEMA;
		}>
	: never;

export type ParsedWireFailure = Readonly<{
	code: CanonicalErrorCode;
	publicData: PublicErrorData;
}>;
