import type { RateLimitBucket } from "./semantic-registry";

export interface RateLimitQuotaProjection {
	readonly limit: number;
	readonly remaining: number;
	readonly resetEpochMs: number;
}

export interface RateLimitAllowedDecision {
	readonly ok: true;
}

export interface RateLimitRejectedDecision {
	readonly ok: false;
}

export type RateLimitDecision =
	| RateLimitAllowedDecision
	| RateLimitRejectedDecision;

export type RateLimitOutcome = "allowed" | "rate_limited" | "unavailable";

export type RateLimitDiagnosticsProjection = Readonly<{
	outcome: RateLimitOutcome;
	service?: "upstash_redis";
}>;

export type RateLimitDecisionMetadata =
	| Readonly<{
			outcome: "allowed";
			quota: RateLimitQuotaProjection;
	  }>
	| Readonly<{
			outcome: "rate_limited";
			quota: RateLimitQuotaProjection;
			retryAfterSeconds: number;
	  }>
	| Readonly<{
			outcome: "unavailable";
			service: "upstash_redis";
	  }>;

export type StoreHitResult =
	| Readonly<{
			allowed: true;
			quota: RateLimitQuotaProjection;
	  }>
	| Readonly<{
			allowed: false;
			quota: RateLimitQuotaProjection;
			retryAfterSeconds: number;
	  }>;

export interface RateLimitStore {
	hit: (input: {
		bucket: RateLimitBucket;
		key: string;
	}) => Promise<StoreHitResult>;
}
