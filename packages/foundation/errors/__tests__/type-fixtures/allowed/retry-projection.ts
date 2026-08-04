/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */

import {
	type CanonicalErrorCode,
	errorProject,
	type Failure,
	type ResultFailure,
	type RetryDisposition,
} from "../../../src/index";

declare const conflictFailure: Failure<"CONFLICT">;
declare const rateLimitedResult: ResultFailure<"RATE_LIMITED">;

export const nonRetryableDisposition: RetryDisposition<"CONFLICT"> =
	errorProject.retry(conflictFailure);
export const retryableDisposition: RetryDisposition<"RATE_LIMITED"> =
	errorProject.retry(rateLimitedResult);
export const boundedDelay = retryableDisposition.retryAfterSeconds;

type RetryDispositionTable = Readonly<{
	[Code in CanonicalErrorCode]: RetryDisposition<Code>;
}>;

declare const failureByCode: {
	[Code in CanonicalErrorCode]: Failure<Code>;
};

export const exhaustiveRetryDispositionTable: RetryDispositionTable = {
	BAD_REQUEST: errorProject.retry(failureByCode.BAD_REQUEST),
	CONCURRENCY_CONFLICT: errorProject.retry(failureByCode.CONCURRENCY_CONFLICT),
	CONFLICT: errorProject.retry(failureByCode.CONFLICT),
	FORBIDDEN: errorProject.retry(failureByCode.FORBIDDEN),
	INTERNAL_ERROR: errorProject.retry(failureByCode.INTERNAL_ERROR),
	NOT_FOUND: errorProject.retry(failureByCode.NOT_FOUND),
	RATE_LIMITED: errorProject.retry(failureByCode.RATE_LIMITED),
	SERVICE_UNAVAILABLE: errorProject.retry(failureByCode.SERVICE_UNAVAILABLE),
	UNAUTHORIZED: errorProject.retry(failureByCode.UNAUTHORIZED),
	VALIDATION_ERROR: errorProject.retry(failureByCode.VALIDATION_ERROR),
};
