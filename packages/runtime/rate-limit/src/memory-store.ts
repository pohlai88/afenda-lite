import { normalizeQuota, retryAfterSecondsFromReset } from "./normalization";
import { policyFor } from "./semantic-registry";
import type { RateLimitStore, StoreHitResult } from "./types";

function onPromiseBoundary<T>(operation: () => T | PromiseLike<T>): Promise<T> {
	return Promise.resolve().then(operation);
}

/**
 * Process-local sliding window. Suitable for single-process local/dev and Vitest.
 * Not shared across Vercel isolates — production must use Upstash.
 */
export function createMemoryRateLimitStore(): RateLimitStore {
	const windows = new Map<string, number[]>();

	return {
		hit(input): Promise<StoreHitResult> {
			return onPromiseBoundary(() => {
				const policy = policyFor(input.bucket);
				const now = Date.now();
				const fullKey = `${input.bucket}:${input.key}`;
				const windowStart = now - policy.windowMs;
				const prior = windows.get(fullKey) ?? [];
				const active = prior.filter((ts) => ts > windowStart);

				if (active.length >= policy.limit) {
					const [oldest] = active;
					windows.set(fullKey, active);
					const resetEpochMs =
						oldest === undefined
							? now + policy.windowMs
							: oldest + policy.windowMs;
					return {
						allowed: false,
						retryAfterSeconds: retryAfterSecondsFromReset(
							policy,
							resetEpochMs,
							now,
						),
						quota: normalizeQuota(
							policy,
							{
								remaining: 0,
								resetEpochMs,
							},
							now,
						),
					};
				}

				active.push(now);
				windows.set(fullKey, active);
				const [oldest = now] = active;
				return {
					allowed: true,
					quota: normalizeQuota(
						policy,
						{
							remaining: policy.limit - active.length,
							resetEpochMs: oldest + policy.windowMs,
						},
						now,
					),
				};
			});
		},
	};
}
