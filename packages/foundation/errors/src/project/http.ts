/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */

import { getErrorDefinition } from "../contract/registry";
import { isTrustedFailure, readFailureRecord } from "../failure/identity";
import type { Failure } from "../failure/types";
import { projectRegistryRetry } from "../project/retry";
import type {
	CanonicalErrorCode,
	PublicErrorData,
	ResultFailure,
} from "../public-types";
import { validatedResultFailurePublicData } from "./public-data";

export type HttpErrorProjection<
	Code extends CanonicalErrorCode = CanonicalErrorCode,
> = Readonly<{
	body: Readonly<{ error: PublicErrorData<Code> }>;
	headers: Readonly<Record<string, string>>;
	status: number;
}>;

function publicDataForHttp(
	input: Failure | ResultFailure,
): PublicErrorData | undefined {
	return isTrustedFailure(input)
		? readFailureRecord(input).publicData
		: validatedResultFailurePublicData(input);
}

/** Atomically derives the complete framework-neutral HTTP error projection. */
export function http<const Code extends CanonicalErrorCode>(
	input: Failure<Code> | ResultFailure<Code>,
): HttpErrorProjection<Code> {
	const publicData = publicDataForHttp(input);
	if (publicData === undefined) {
		throw new TypeError("HTTP projection requires a canonical failure.");
	}

	const retryDisposition = projectRegistryRetry(
		publicData.code,
		publicData.details,
	);
	const headers =
		retryDisposition.retryable &&
		"retryAfterSeconds" in retryDisposition &&
		retryDisposition.retryAfterSeconds !== undefined
			? Object.freeze({
					"Retry-After": String(retryDisposition.retryAfterSeconds),
				})
			: Object.freeze({});
	return Object.freeze({
		body: Object.freeze({ error: publicData }),
		headers,
		status: getErrorDefinition(publicData.code).http.status,
	}) as HttpErrorProjection<Code>;
}
