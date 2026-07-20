export const RATE_LIMIT_BUCKETS = [
	"auth_bff_post",
	"auth_sign_in",
	"ai_chat",
] as const;

export type RateLimitBucket = (typeof RATE_LIMIT_BUCKETS)[number];

/** Quota snapshot for X-RateLimit-* response headers. */
export type RateLimitQuota = {
	readonly limit: number;
	readonly remaining: number;
	/** Window reset instant (Unix epoch milliseconds). */
	readonly resetEpochMs: number;
};

export type RateLimitHitResult =
	| { allowed: true; quota: RateLimitQuota }
	| {
			allowed: false;
			retryAfterSeconds: number;
			quota: RateLimitQuota;
	  };

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
	| { ok: true; quota: RateLimitQuota }
	| {
			ok: false;
			reason: "rate_limited";
			retryAfterSeconds: number;
			quota: RateLimitQuota;
	  }
	| { ok: false; reason: "unavailable"; service: "upstash_redis" };

export type RateLimitFailure = Extract<RateLimitResult, { ok: false }>;

export type BucketPolicy = {
	readonly limit: number;
	readonly windowMs: number;
};
