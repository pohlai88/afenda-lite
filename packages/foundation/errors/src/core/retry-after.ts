/** Minimum Retry-After / rate-limit window (seconds). */
export const MIN_RETRY_AFTER_SECONDS = 1;

/**
 * Clamp a numeric rate-limit window to a positive integer second count.
 * Invalid input becomes {@link MIN_RETRY_AFTER_SECONDS}.
 */
export function clampRetryAfterSeconds(value: number): number {
	if (!Number.isFinite(value)) {
		return MIN_RETRY_AFTER_SECONDS;
	}
	return Math.max(MIN_RETRY_AFTER_SECONDS, Math.floor(value));
}

/**
 * Extract a positive finite integer `retryAfter` from error details for Retry-After.
 * Returns undefined when missing or invalid (no header should be set).
 */
export function retryAfterSeconds(details: unknown): number | undefined {
	if (typeof details !== "object" || details === null) {
		return undefined;
	}
	if (!("retryAfter" in details)) {
		return undefined;
	}
	const value = Reflect.get(details, "retryAfter");
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return undefined;
	}
	const seconds = Math.floor(value);
	return seconds >= MIN_RETRY_AFTER_SECONDS ? seconds : undefined;
}
