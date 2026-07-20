import type { BucketPolicy, RateLimitBucket } from "./types";

const ONE_MINUTE_MS = 60_000;

/** Enterprise windows — credential sign-in tighter than auth BFF posts. */
export const BUCKET_POLICIES = {
	auth_bff_post: { limit: 20, windowMs: ONE_MINUTE_MS },
	auth_sign_in: { limit: 5, windowMs: ONE_MINUTE_MS },
	/** Authenticated The Machine chat — keyed by userId. */
	ai_chat: { limit: 20, windowMs: ONE_MINUTE_MS },
} as const satisfies Record<RateLimitBucket, BucketPolicy>;

export function bucketPolicy(bucket: RateLimitBucket): BucketPolicy {
	return BUCKET_POLICIES[bucket];
}
