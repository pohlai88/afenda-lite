/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */

import {
	errorProject,
	type Failure,
	type ResultSuccess,
	type RetryAfterSeconds,
	type RetryDisposition,
} from "../../../src/index";

declare const conflict: Failure<"CONFLICT">;
declare const retryDelay: RetryAfterSeconds;
declare const serviceDisposition: RetryDisposition<"SERVICE_UNAVAILABLE">;
declare const success: ResultSuccess<{ id: string }>;

errorProject.retry(conflict);

// @ts-expect-error Retry dispositions are opaque package projections.
export const rejectedManualDisposition: RetryDisposition<"CONFLICT"> = {
	retryable: false,
};

export const rejectedServiceTiming: RetryDisposition<"SERVICE_UNAVAILABLE"> = {
	...serviceDisposition,
	// @ts-expect-error SERVICE_UNAVAILABLE permits retries, not occurrence timing.
	retryAfterSeconds: retryDelay,
};

// @ts-expect-error Retry projection accepts failures, never successful results.
errorProject.retry(success);
