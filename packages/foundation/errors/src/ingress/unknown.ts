/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */

import { createCanonicalFailure } from "../failure/create";
import { isTrustedFailure } from "../failure/identity";
import type { Failure } from "../failure/types";
import type { ExactInput, FailureContext } from "../public-types";

export function unknown<const Input>(
	error: unknown,
	context: Input & ExactInput<FailureContext, NoInfer<Input>>,
): Failure {
	if (isTrustedFailure(error)) {
		return error;
	}
	return createCanonicalFailure("INTERNAL_ERROR", context);
}
