export const RETRY_AFTER_HEADER = "Retry-After" as const;

const MIN_RETRY_AFTER_SECONDS = 1;

/**
 * Attach a positive Retry-After value (seconds) onto Fetch Headers.
 * Non-positive or non-finite values are ignored (no header set).
 */
export function applyRetryAfterHeader(
	headers: Headers,
	retryAfterSeconds: number,
): void {
	if (
		!Number.isFinite(retryAfterSeconds) ||
		retryAfterSeconds < MIN_RETRY_AFTER_SECONDS
	) {
		return;
	}
	headers.set(RETRY_AFTER_HEADER, String(Math.floor(retryAfterSeconds)));
}
