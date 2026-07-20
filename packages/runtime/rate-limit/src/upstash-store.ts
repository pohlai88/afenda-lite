import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { BUCKET_POLICIES } from "./buckets";
import { retryAfterSecondsFromReset } from "./retry-after";
import type {
	RateLimitBucket,
	RateLimitHitResult,
	RateLimitQuota,
	RateLimitStore,
} from "./types";

function windowSeconds(windowMs: number): `${number} s` {
	const seconds = Math.max(1, Math.ceil(windowMs / 1000));
	return `${seconds} s`;
}

function quotaFromUpstash(result: {
	limit: number;
	remaining: number;
	reset: number;
}): RateLimitQuota {
	return {
		limit: result.limit,
		remaining: Math.max(0, result.remaining),
		resetEpochMs: result.reset,
	};
}

export function createUpstashRateLimitStore(input: {
	url: string;
	token: string;
}): RateLimitStore {
	const redis = new Redis({
		url: input.url,
		token: input.token,
	});

	const limiters = new Map<RateLimitBucket, Ratelimit>();

	function limiterFor(bucket: RateLimitBucket): Ratelimit {
		const existing = limiters.get(bucket);
		if (existing) {
			return existing;
		}
		const policy = BUCKET_POLICIES[bucket];
		const created = new Ratelimit({
			redis,
			limiter: Ratelimit.slidingWindow(
				policy.limit,
				windowSeconds(policy.windowMs),
			),
			prefix: `@afenda/rate-limit:${bucket}`,
		});
		limiters.set(bucket, created);
		return created;
	}

	return {
		async hit(hitInput): Promise<RateLimitHitResult> {
			const result = await limiterFor(hitInput.bucket).limit(hitInput.key);
			const quota = quotaFromUpstash(result);
			if (result.success) {
				return { allowed: true, quota };
			}
			return {
				allowed: false,
				retryAfterSeconds: retryAfterSecondsFromReset(result.reset, Date.now()),
				quota,
			};
		},
	};
}
