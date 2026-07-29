import { retryAfterSeconds as readRetryAfterSeconds } from "@afenda/errors/http";

export const RETRY_AFTER_HEADER = "Retry-After" as const;

/**
 * Attach a positive Retry-After value (seconds) onto Fetch Headers.
 * Non-positive or non-finite values are ignored (no header set).
 */
export function applyRetryAfterHeader(
	headers: Headers,
	retryAfterSeconds: number,
): void {
	const seconds = readRetryAfterSeconds({ retryAfter: retryAfterSeconds });
	if (seconds === undefined) {
		return;
	}
	headers.set(RETRY_AFTER_HEADER, String(seconds));
}
