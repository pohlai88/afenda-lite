import type {
	RateLimitAllowedDecision,
	RateLimitDecision,
	RateLimitDecisionMetadata,
	RateLimitRejectedDecision,
} from "./types";

const metadataByDecision = new WeakMap<
	RateLimitDecision,
	RateLimitDecisionMetadata
>();

export function metadataFor(
	decision: RateLimitDecision,
): RateLimitDecisionMetadata {
	const metadata = metadataByDecision.get(decision);
	if (!metadata) {
		throw new TypeError("Unknown rate-limit decision.");
	}
	return metadata;
}

export function createAllowedDecision(
	metadata: Extract<RateLimitDecisionMetadata, { outcome: "allowed" }>,
): RateLimitAllowedDecision {
	const decision: RateLimitAllowedDecision = Object.freeze({ ok: true });
	metadataByDecision.set(decision, metadata);
	return decision;
}

export function createRejectedDecision(
	metadata: Exclude<RateLimitDecisionMetadata, { outcome: "allowed" }>,
): RateLimitRejectedDecision {
	const decision: RateLimitRejectedDecision = Object.freeze({ ok: false });
	metadataByDecision.set(decision, metadata);
	return decision;
}
