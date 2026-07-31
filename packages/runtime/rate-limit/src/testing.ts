import { createAllowedDecision, createRejectedDecision } from "./decision";
import type { RateLimitQuotaProjection } from "./types";

/** Test-only decision fixtures that preserve the opaque production contract. */
export const rateLimitTesting = Object.freeze({
	decision: Object.freeze({
		allowed(quota: RateLimitQuotaProjection) {
			return createAllowedDecision({ outcome: "allowed", quota });
		},
		rateLimited(input: {
			quota: RateLimitQuotaProjection;
			retryAfterSeconds: number;
		}) {
			return createRejectedDecision({
				outcome: "rate_limited",
				quota: input.quota,
				retryAfterSeconds: input.retryAfterSeconds,
			});
		},
		unavailable() {
			return createRejectedDecision({
				outcome: "unavailable",
				service: "upstash_redis",
			});
		},
	}),
});
