export const RATE_LIMIT_BUCKETS = [
	"auth_bff_post",
	"auth_sign_in",
	"ai_chat",
] as const;

export type RateLimitBucket = (typeof RATE_LIMIT_BUCKETS)[number];

/** Quota snapshot for X-RateLimit-* response headers. */
export interface RateLimitQuota {
	readonly limit: number;
	readonly remaining: number;
	/** Window reset instant (Unix epoch milliseconds). */
	readonly resetEpochMs: number;
}

export type RateLimitHitResult =
	| { allowed: true; quota: RateLimitQuota }
	| {
			allowed: false;
			retryAfterSeconds: number;
			quota: RateLimitQuota;
	  };

/** Stores resolve policy from `bucket` — callers never pass limit/window. */
export interface RateLimitStore {
	hit: (input: {
		bucket: RateLimitBucket;
		key: string;
	}) => Promise<RateLimitHitResult>;
}

interface RateLimitSuccess {
	ok: true;
	quota: RateLimitQuota;
}

interface RateLimitedFailure {
	ok: false;
	quota: RateLimitQuota;
	reason: "rate_limited";
	retryAfterSeconds: number;
}

interface RateLimitUnavailableFailure {
	ok: false;
	reason: "unavailable";
	service: "upstash_redis";
}

/**
 * Discriminated limit outcome for BFF / Action adapters.
 * Prefer `toRateLimitAppError` over hand-mapping at each call site.
 */
export type RateLimitResult = RateLimitSuccess | RateLimitFailure;

export type RateLimitFailure = RateLimitedFailure | RateLimitUnavailableFailure;

export interface BucketPolicy {
	readonly limit: number;
	readonly windowMs: number;
}
