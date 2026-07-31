/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { readProperty } from "../internal/object";
import { createPublicErrorData } from "../internal/public-error-data";
import type {
	CanonicalErrorCode,
	CheckedResultFailureInput,
	EmptyResultFailureInputCode,
	OptionalResultFailureInputCode,
	PublicMessageOverrideCode,
	ResultFailure,
	SingleCanonicalErrorCode,
} from "../public-types";
import { attachResultContext } from "./context";

export function fail<const Code extends PublicMessageOverrideCode, const Input>(
	code: SingleCanonicalErrorCode<Code>,
	input: Input & CheckedResultFailureInput<NoInfer<Code>, NoInfer<Input>>,
): ResultFailure<Code>;
export function fail<
	const Code extends OptionalResultFailureInputCode,
	const Input,
>(
	code: SingleCanonicalErrorCode<Code>,
	input: Input & CheckedResultFailureInput<NoInfer<Code>, NoInfer<Input>>,
): ResultFailure<Code>;
export function fail<const Code extends OptionalResultFailureInputCode>(
	code: SingleCanonicalErrorCode<Code>,
): ResultFailure<Code>;
export function fail<const Code extends EmptyResultFailureInputCode>(
	code: SingleCanonicalErrorCode<Code>,
): ResultFailure<Code>;
export function fail(code: CanonicalErrorCode, input?: unknown): ResultFailure {
	const publicData = createPublicErrorData(code, input);
	const result = Object.freeze({ ok: false, ...publicData }) as ResultFailure;
	attachResultContext(result, readProperty(input, "internalContext"));
	return result;
}
