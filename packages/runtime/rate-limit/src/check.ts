import { resolveRateLimitBackend } from "./resolve-store";
import type {
	RateLimitBucket,
	RateLimitHitResult,
	RateLimitQuota,
	RateLimitResult,
	RateLimitStore,
} from "./types";

export type CheckRateLimitInput = {
	bucket: RateLimitBucket;
	/** Opaque composite identity (email, org:user, IP+path). Never log secrets. */
	key: string;
};

export type CheckRateLimitOptions = {
	/** Injected store for Vitest; production callers omit this. */
	store?: RateLimitStore;
};

const EMPTY_KEY_RETRY_AFTER_SECONDS = 60;

const STORE_UNAVAILABLE: RateLimitResult = {
	ok: false,
	reason: "unavailable",
	service: "upstash_redis",
};

function emptyKeyQuota(nowMs: number): RateLimitQuota {
	return {
		limit: 0,
		remaining: 0,
		resetEpochMs: nowMs + EMPTY_KEY_RETRY_AFTER_SECONDS * 1000,
	};
}

function normalizeKey(key: string): string {
	return key.trim().toLowerCase();
}

function fromHit(hit: RateLimitHitResult): RateLimitResult {
	if (hit.allowed) {
		return { ok: true, quota: hit.quota };
	}
	return {
		ok: false,
		reason: "rate_limited",
		retryAfterSeconds: hit.retryAfterSeconds,
		quota: hit.quota,
	};
}

async function hitResolvedStore(
	store: RateLimitStore,
	input: { bucket: RateLimitBucket; key: string },
): Promise<RateLimitResult> {
	try {
		return fromHit(await store.hit(input));
	} catch {
		// Fail closed — Upstash/network faults must not bypass abuse limits as 500s.
		return STORE_UNAVAILABLE;
	}
}

export async function checkRateLimit(
	input: CheckRateLimitInput,
	options?: CheckRateLimitOptions,
): Promise<RateLimitResult> {
	const key = normalizeKey(input.key);
	if (key.length === 0) {
		return {
			ok: false,
			reason: "rate_limited",
			retryAfterSeconds: EMPTY_KEY_RETRY_AFTER_SECONDS,
			quota: emptyKeyQuota(Date.now()),
		};
	}

	const injected = options?.store;
	if (injected) {
		return fromHit(await injected.hit({ bucket: input.bucket, key }));
	}

	const backend = resolveRateLimitBackend();
	if (backend.kind === "unavailable") {
		return { ok: false, reason: "unavailable", service: backend.service };
	}

	return hitResolvedStore(backend.store, { bucket: input.bucket, key });
}
