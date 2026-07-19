import { bucketPolicy } from "./buckets";
import { retryAfterSecondsFromReset } from "./retry-after";
import type { RateLimitHitResult, RateLimitStore } from "./types";

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
				if (oldest === undefined) {
					return { allowed: false, retryAfterSeconds: 1 };
				}
				return {
					allowed: false,
					retryAfterSeconds: retryAfterSecondsFromReset(
						oldest + policy.windowMs,
						now,
					),
				};
			}

			active.push(now);
			windows.set(fullKey, active);
			return { allowed: true };
		},
	};
}
