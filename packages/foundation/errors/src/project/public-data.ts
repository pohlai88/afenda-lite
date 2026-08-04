/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */

import { getErrorDefinition, isCanonicalErrorCode } from "../contract/registry";
import { readProperty } from "../internal/object";
import { createPublicErrorData } from "../internal/public-error-data";
import type { CanonicalErrorCode, PublicErrorData } from "../public-types";

const REQUIRED_RESULT_FAILURE_KEYS = Object.freeze([
	"code",
	"message",
	"messageKey",
	"ok",
]);
const ALLOWED_RESULT_FAILURE_KEYS = new Set([
	...REQUIRED_RESULT_FAILURE_KEYS,
	"details",
]);

function hasCanonicalResultFailureKeys(value: object): boolean {
	try {
		const keys = Object.keys(value);
		return (
			keys.length >= REQUIRED_RESULT_FAILURE_KEYS.length &&
			keys.length <= ALLOWED_RESULT_FAILURE_KEYS.size &&
			REQUIRED_RESULT_FAILURE_KEYS.every((key) => Object.hasOwn(value, key)) &&
			keys.every((key) => ALLOWED_RESULT_FAILURE_KEYS.has(key))
		);
	} catch {
		return false;
	}
}

/**
 * Validates an untrusted public Result failure and rebuilds its payload through
 * the registry-owned message and details policies.
 */
export function validatedResultFailurePublicData(
	input: unknown,
): PublicErrorData | undefined {
	if (
		typeof input !== "object" ||
		input === null ||
		Array.isArray(input) ||
		!hasCanonicalResultFailureKeys(input) ||
		readProperty(input, "ok") !== false
	) {
		return;
	}

	const code = readProperty(input, "code");
	const message = readProperty(input, "message");
	if (!isCanonicalErrorCode(code) || typeof message !== "string") {
		return;
	}

	const definition = getErrorDefinition(code);
	if (readProperty(input, "messageKey") !== definition.public.messageKey) {
		return;
	}

	const hasDetails = Object.hasOwn(input, "details");
	const details = definition.details.normalize(readProperty(input, "details"));
	if (hasDetails && details === undefined) {
		return;
	}

	const constructionInput =
		details === undefined
			? { publicMessage: message }
			: { ...details, publicMessage: message };
	const publicData = createPublicErrorData(code, constructionInput);
	return publicData.message === message
		? (publicData as PublicErrorData<CanonicalErrorCode>)
		: undefined;
}
