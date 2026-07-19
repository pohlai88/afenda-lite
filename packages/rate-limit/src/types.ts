export const RATE_LIMIT_BUCKETS = ["auth_bff_post", "auth_sign_in"] as const;

export type RateLimitBucket = (typeof RATE_LIMIT_BUCKETS)[number];

export type RateLimitHitResult =
	| { allowed: true }
	| { allowed: false; retryAfterSeconds: number };

/** Stores resolve policy from `bucket` — callers never pass limit/window. */
export type RateLimitStore = {
	hit(input: {
		bucket: RateLimitBucket;
		key: string;
	}): Promise<RateLimitHitResult>;
};

/**
 * Discriminated limit outcome for BFF / Action adapters.
 * Prefer `toRateLimitAppError` over hand-mapping at each call site.
 */
export type RateLimitResult =
	| { ok: true }
	| { ok: false; reason: "rate_limited"; retryAfterSeconds: number }
	| { ok: false; reason: "unavailable"; service: "upstash_redis" };

export type RateLimitFailure = Extract<RateLimitResult, { ok: false }>;

export type BucketPolicy = {
	readonly limit: number;
	readonly windowMs: number;
};
