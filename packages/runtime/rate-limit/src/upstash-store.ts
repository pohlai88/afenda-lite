import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { normalizeUpstashResult } from "./normalization";
import { policyFor, type RateLimitBucket } from "./semantic-registry";
import type { RateLimitStore, StoreHitResult } from "./types";

function windowSeconds(windowMs: number): `${number} s` {
	const seconds = Math.max(1, Math.ceil(windowMs / 1000));
	return `${seconds} s`;
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
		const policy = policyFor(bucket);
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
		async hit(hitInput): Promise<StoreHitResult> {
			const result = await limiterFor(hitInput.bucket).limit(hitInput.key);
			return normalizeUpstashResult(
				policyFor(hitInput.bucket),
				result,
				Date.now(),
			);
		},
	};
}
