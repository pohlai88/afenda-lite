import { bucketPolicy } from "./buckets";
import { retryAfterSecondsFromReset } from "./retry-after";
import type {
	RateLimitHitResult,
	RateLimitQuota,
	RateLimitStore,
} from "./types";

function quotaAt(input: {
	limit: number;
	remaining: number;
	resetEpochMs: number;
}): RateLimitQuota {
	return {
		limit: input.limit,
		remaining: Math.max(0, input.remaining),
		resetEpochMs: input.resetEpochMs,
	};
}

/**
 * Process-local sliding window. Suitable for single-process local/dev and Vitest.
 * Not shared across Vercel isolates — production must use Upstash.
 */
export function createMemoryRateLimitStore(): RateLimitStore {
	const windows = new Map<string, number[]>();

	return {
		async hit(input): Promise<RateLimitHitResult> {
			const policy = bucketPolicy(input.bucket);
			const now = Date.now();
			const fullKey = `${input.bucket}:${input.key}`;
			const windowStart = now - policy.windowMs;
			const prior = windows.get(fullKey) ?? [];
			const active = prior.filter((ts) => ts > windowStart);

			if (active.length >= policy.limit) {
				const oldest = active[0];
				windows.set(fullKey, active);
				const resetEpochMs =
					oldest === undefined
						? now + policy.windowMs
						: oldest + policy.windowMs;
				return {
					allowed: false,
					retryAfterSeconds:
						oldest === undefined
							? 1
							: retryAfterSecondsFromReset(resetEpochMs, now),
					quota: quotaAt({
						limit: policy.limit,
						remaining: 0,
						resetEpochMs,
					}),
				};
			}

			active.push(now);
			windows.set(fullKey, active);
			const oldest = active[0] ?? now;
			return {
				allowed: true,
				quota: quotaAt({
					limit: policy.limit,
					remaining: policy.limit - active.length,
					resetEpochMs: oldest + policy.windowMs,
				}),
			};
		},
	};
}
