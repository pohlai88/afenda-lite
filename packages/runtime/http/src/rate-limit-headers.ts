import { toNonNegativeInteger } from "./non-negative-integer";
import { HTTP_SEMANTIC_REGISTRY } from "./semantic-registry";

export interface RateLimitHeaderQuota {
	readonly limit: number;
	readonly remaining: number;
	/** Window reset instant (Unix epoch milliseconds). */
	readonly resetEpochMs: number;
}

export function applyRateLimitHeaders(
	headers: Headers,
	quota: RateLimitHeaderQuota,
): void {
	const names = HTTP_SEMANTIC_REGISTRY.headers.rateLimit;
	headers.set(
		names.limit,
		String(toNonNegativeInteger(quota.limit, "rate-limit limit")),
	);
	headers.set(
		names.remaining,
		String(toNonNegativeInteger(quota.remaining, "rate-limit remaining")),
	);
	headers.set(
		names.reset,
		String(
			toNonNegativeInteger(quota.resetEpochMs / 1000, "rate-limit reset epoch"),
		),
	);
}
