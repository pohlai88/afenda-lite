/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { getErrorDefinition, isCanonicalErrorCode } from "../contract/registry";
import { isTrustedFailure, readFailureRecord } from "../failure/identity";
import type { Failure } from "../failure/types";
import { readProperty } from "../internal/object";
import type {
	CanonicalErrorCode,
	ResultFailure,
	RetryDisposition,
} from "../public-types";
import { normalizeRetryAfterSeconds } from "../security/normalize";

const NON_RETRYABLE_DISPOSITION = Object.freeze({ retryable: false } as const);
const RETRYABLE_DISPOSITION = Object.freeze({ retryable: true } as const);

/**
 * Projects one scheduling decision from registry policy and normalized public
 * occurrence details. No private context or diagnostic data is inspected.
 */
export function projectRegistryRetry<Code extends CanonicalErrorCode>(
	code: Code,
	publicDetails: unknown,
): RetryDisposition<Code> {
	const definition = getErrorDefinition(code);
	if (!definition.retry.retryable) {
		return NON_RETRYABLE_DISPOSITION as RetryDisposition<Code>;
	}

	const retryAfterSeconds =
		definition.retry.retryAfter === "details.retryAfterSeconds"
			? normalizeRetryAfterSeconds(
					readProperty(publicDetails, "retryAfterSeconds"),
				)
			: undefined;
	if (retryAfterSeconds === undefined) {
		return RETRYABLE_DISPOSITION as RetryDisposition<Code>;
	}

	return Object.freeze({
		retryable: true,
		retryAfterSeconds,
	}) as RetryDisposition<Code>;
}

export function retry<const Code extends CanonicalErrorCode>(
	input: Failure<Code>,
): RetryDisposition<Code>;
export function retry<const Input extends ResultFailure>(
	input: Input,
): RetryDisposition<Input["code"]>;
export function retry(input: Failure | ResultFailure): RetryDisposition {
	if (isTrustedFailure(input)) {
		const record = readFailureRecord(input);
		return projectRegistryRetry(record.code, record.publicData.details);
	}

	const code = readProperty(input, "code");
	if (readProperty(input, "ok") !== false || !isCanonicalErrorCode(code)) {
		throw new TypeError("Retry projection requires a canonical failure.");
	}

	return projectRegistryRetry(code, readProperty(input, "details"));
}
