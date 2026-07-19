import { resolveRateLimitBackend } from "./resolve-store";
import type {
	RateLimitBucket,
	RateLimitHitResult,
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

function normalizeKey(key: string): string {
	return key.trim().toLowerCase();
}

function fromHit(hit: RateLimitHitResult): RateLimitResult {
	if (hit.allowed) {
		return { ok: true };
	}
	return {
		ok: false,
		reason: "rate_limited",
		retryAfterSeconds: hit.retryAfterSeconds,
	};
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
		};
	}

	const store = options?.store;
	if (store) {
		return fromHit(await store.hit({ bucket: input.bucket, key }));
	}

	const backend = resolveRateLimitBackend();
	if (backend.kind === "unavailable") {
		return { ok: false, reason: "unavailable", service: backend.service };
	}

	return fromHit(await backend.store.hit({ bucket: input.bucket, key }));
}
