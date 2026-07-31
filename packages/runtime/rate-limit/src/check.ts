import { isProductionDeploymentNow } from "@afenda/env";

import { createAllowedDecision, createRejectedDecision } from "./decision";
import { createMemoryRateLimitStore } from "./memory-store";
import { resolveRateLimitBackend } from "./resolve-store";
import { keyFor, type RateLimitCheckInput } from "./semantic-registry";
import type {
	RateLimitDecision,
	RateLimitStore,
	StoreHitResult,
} from "./types";

let memoryFallbackStore: RateLimitStore | undefined;

function memoryFallback(): RateLimitStore {
	memoryFallbackStore ??= createMemoryRateLimitStore();
	return memoryFallbackStore;
}

function decisionFromHit(hit: StoreHitResult): RateLimitDecision {
	return hit.allowed
		? createAllowedDecision({ outcome: "allowed", quota: hit.quota })
		: createRejectedDecision({
				outcome: "rate_limited",
				quota: hit.quota,
				retryAfterSeconds: hit.retryAfterSeconds,
			});
}

function unavailableDecision(): RateLimitDecision {
	return createRejectedDecision({
		outcome: "unavailable",
		service: "upstash_redis",
	});
}

async function hitStore(
	store: RateLimitStore,
	input: RateLimitCheckInput,
): Promise<RateLimitDecision> {
	return decisionFromHit(
		await store.hit({ bucket: input.bucket, key: keyFor(input) }),
	);
}

async function hitResolvedStore(
	store: RateLimitStore,
	input: RateLimitCheckInput,
): Promise<RateLimitDecision> {
	try {
		return await hitStore(store, input);
	} catch {
		if (!isProductionDeploymentNow()) {
			try {
				return await hitStore(memoryFallback(), input);
			} catch {
				return unavailableDecision();
			}
		}
		return unavailableDecision();
	}
}

export function checkRateLimit(
	input: RateLimitCheckInput,
): Promise<RateLimitDecision> {
	const backend = resolveRateLimitBackend();
	return backend.kind === "unavailable"
		? Promise.resolve(unavailableDecision())
		: hitResolvedStore(backend.store, input);
}

export function checkRateLimitWithStore(
	input: RateLimitCheckInput,
	store: RateLimitStore,
): Promise<RateLimitDecision> {
	return hitStore(store, input);
}
