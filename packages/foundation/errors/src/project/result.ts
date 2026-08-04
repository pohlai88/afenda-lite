/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */

import { isTrustedFailure, readFailureRecord } from "../failure/identity";
import type { Failure } from "../failure/types";
import type {
	CanonicalErrorCode,
	ResultFailure as CanonicalResultFailure,
} from "../public-types";

/** Projects an opaque package-owned Failure into the canonical public Result. */
export function result<Code extends CanonicalErrorCode>(
	failure: Failure<Code>,
): CanonicalResultFailure<Code> {
	if (!isTrustedFailure(failure)) {
		throw new TypeError("Result projection requires a trusted failure.");
	}
	return Object.freeze({
		ok: false,
		...readFailureRecord(failure).publicData,
	}) as CanonicalResultFailure<Code>;
}
