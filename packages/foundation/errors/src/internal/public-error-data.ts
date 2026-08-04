/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */
import { getErrorDefinition, isCanonicalErrorCode } from "../contract/registry";
import type { CanonicalErrorCode, PublicErrorData } from "../public-types";
import { normalizePublicMessage } from "../security/normalize";
import { readProperty } from "./object";

function assertCanonicalErrorCode(
	code: unknown,
): asserts code is CanonicalErrorCode {
	if (!isCanonicalErrorCode(code)) {
		throw new TypeError("Unknown canonical error code.");
	}
}

/** Builds the sole canonical public payload from registry-owned policy. */
export function createPublicErrorData<Code extends CanonicalErrorCode>(
	code: Code,
	input: unknown,
): PublicErrorData<Code> {
	assertCanonicalErrorCode(code);
	const definition = getErrorDefinition(code);
	const message =
		definition.public.messagePolicy === "fixed"
			? definition.public.defaultMessage
			: normalizePublicMessage(
					readProperty(input, "publicMessage"),
					definition.public.defaultMessage,
				);
	const details = definition.details.normalize(input);
	const data =
		details === undefined
			? {
					code,
					message,
					messageKey: definition.public.messageKey,
				}
			: {
					code,
					details,
					message,
					messageKey: definition.public.messageKey,
				};

	// Definition/code parity and details output are enforced by the registry DSL.
	return Object.freeze(data) as PublicErrorData<Code>;
}
