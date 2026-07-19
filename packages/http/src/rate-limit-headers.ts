export const RATE_LIMIT_LIMIT_HEADER = "X-RateLimit-Limit" as const;
export const RATE_LIMIT_REMAINING_HEADER = "X-RateLimit-Remaining" as const;
export const RATE_LIMIT_RESET_HEADER = "X-RateLimit-Reset" as const;

export type RateLimitHeaderQuota = {
	readonly limit: number;
	readonly remaining: number;
	/** Window reset instant (Unix epoch milliseconds). */
	readonly resetEpochMs: number;
};

/**
 * Attach standard X-RateLimit-* headers onto Fetch Headers.
 * Reset is Unix epoch **seconds** (RFC-style clients).
 */
export function applyRateLimitHeaders(
	headers: Headers,
	quota: RateLimitHeaderQuota,
): void {
	const limit = Math.max(0, Math.floor(quota.limit));
	const remaining = Math.max(0, Math.floor(quota.remaining));
	const resetSeconds = Math.max(0, Math.floor(quota.resetEpochMs / 1000));

	headers.set(RATE_LIMIT_LIMIT_HEADER, String(limit));
	headers.set(RATE_LIMIT_REMAINING_HEADER, String(remaining));
	headers.set(RATE_LIMIT_RESET_HEADER, String(resetSeconds));
}
