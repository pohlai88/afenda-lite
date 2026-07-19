import { bucketPolicy } from "./buckets";
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
				if (oldest === undefined) {
					windows.set(fullKey, active);
					return { allowed: false, retryAfterSeconds: 1 };
				}
				const retryAfterSeconds = Math.max(
					1,
					Math.ceil((oldest + policy.windowMs - now) / 1000),
				);
				windows.set(fullKey, active);
				return { allowed: false, retryAfterSeconds };
			}

			active.push(now);
			windows.set(fullKey, active);
			return { allowed: true };
		},
	};
}
