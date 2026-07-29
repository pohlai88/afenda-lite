/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

/** Minimum Retry-After / rate-limit window in seconds. */
export const MIN_RETRY_AFTER_SECONDS = 1;

/** Maximum Retry-After / rate-limit window in seconds: 24 hours. */
export const MAX_RETRY_AFTER_SECONDS = 86_400;

/**
 * Clamps a numeric retry window to a bounded positive integer second count.
 *
 * Non-finite and sub-minimum values become MIN_RETRY_AFTER_SECONDS.
 * Values above MAX_RETRY_AFTER_SECONDS are capped.
 */
export function clampRetryAfterSeconds(value: number): number {
	if (!Number.isFinite(value)) {
		return MIN_RETRY_AFTER_SECONDS;
	}
	return Math.min(
		MAX_RETRY_AFTER_SECONDS,
		Math.max(MIN_RETRY_AFTER_SECONDS, Math.floor(value)),
	);
}

function readRetryAfter(details: object): unknown {
	try {
		return Reflect.get(details, "retryAfter");
	} catch {
		return undefined;
	}
}

/**
 * Extracts a valid integer `retryAfter` value for a Retry-After header.
 *
 * Returns undefined when the field is absent, non-numeric, non-finite, below the
 * minimum, above the maximum, or cannot be read safely.
 */
export function retryAfterSeconds(details: unknown): number | undefined {
	if (typeof details !== "object" || details === null) {
		return undefined;
	}
	const value = readRetryAfter(details);
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return undefined;
	}
	const seconds = Math.floor(value);
	return seconds >= MIN_RETRY_AFTER_SECONDS &&
		seconds <= MAX_RETRY_AFTER_SECONDS
		? seconds
		: undefined;
}
