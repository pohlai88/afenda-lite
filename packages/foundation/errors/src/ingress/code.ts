/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { createCanonicalFailure } from "../failure/create";
import type { Failure } from "../failure/types";
import type {
	CanonicalErrorCode,
	CheckedFailureInput,
	SingleCanonicalErrorCode,
} from "../public-types";

export function code<const Code extends CanonicalErrorCode, const Input>(
	errorCode: SingleCanonicalErrorCode<Code>,
	input: Input & CheckedFailureInput<NoInfer<Code>, NoInfer<Input>>,
): Failure<Code> {
	return createCanonicalFailure(errorCode, input);
}
