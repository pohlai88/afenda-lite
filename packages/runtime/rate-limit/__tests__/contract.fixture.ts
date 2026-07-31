import {
	type RateLimitDecision,
	type RateLimitQuotaProjection,
	rateLimit,
} from "@afenda/rate-limit";

export async function consume(): Promise<RateLimitQuotaProjection | undefined> {
	const decision: RateLimitDecision = await rateLimit.check({
		bucket: "auth_sign_in",
		identity: {
			kind: "credentials",
			ipAddress: "203.0.113.10",
			email: "user@example.test",
		},
	});
	const quota: RateLimitQuotaProjection | undefined =
		rateLimit.project.quota(decision);
	if (!decision.ok) {
		rateLimit.project.failure(decision);
	}
	return quota;
}

// @ts-expect-error consumers submit identity facts, never prebuilt keys
rateLimit.check({ bucket: "ai_chat", key: "user-1" });

declare const opaqueDecision: RateLimitDecision;
// @ts-expect-error raw quota is private decision metadata
export const leakedQuota = opaqueDecision.quota;

// @ts-expect-error policy registry is private
export const leakedPolicies = rateLimit.bucketPolicies;

// @ts-expect-error consumers request the canonical failure projection
rateLimit.toFailure({ ok: false });
