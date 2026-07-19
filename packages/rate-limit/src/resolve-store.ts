import { env, isProductionDeployment } from "@afenda/env";

import { createMemoryRateLimitStore } from "./memory-store";
import type { RateLimitStore } from "./types";
import { createUpstashRateLimitStore } from "./upstash-store";

export type ResolvedBackend =
	| { kind: "store"; store: RateLimitStore }
	| { kind: "unavailable"; service: "upstash_redis" };

let cached: ResolvedBackend | undefined;
let memorySingleton: RateLimitStore | undefined;

function hasUpstashConfig(): boolean {
	return (
		typeof env.UPSTASH_REDIS_REST_URL === "string" &&
		env.UPSTASH_REDIS_REST_URL.length > 0 &&
		typeof env.UPSTASH_REDIS_REST_TOKEN === "string" &&
		env.UPSTASH_REDIS_REST_TOKEN.length > 0
	);
}

function memoryStore(): RateLimitStore {
	if (!memorySingleton) {
		memorySingleton = createMemoryRateLimitStore();
	}
	return memorySingleton;
}

/**
 * Upstash when configured; process memory for non-production without keys;
 * production without Upstash keys fails closed (unavailable).
 */
export function resolveRateLimitBackend(): ResolvedBackend {
	if (cached) {
		return cached;
	}

	if (hasUpstashConfig()) {
		const url = env.UPSTASH_REDIS_REST_URL;
		const token = env.UPSTASH_REDIS_REST_TOKEN;
		if (url === undefined || token === undefined) {
			cached = { kind: "unavailable", service: "upstash_redis" };
			return cached;
		}
		cached = {
			kind: "store",
			store: createUpstashRateLimitStore({ url, token }),
		};
		return cached;
	}

	if (
		isProductionDeployment({
			nodeEnv: process.env.NODE_ENV,
			vercelEnv: process.env.VERCEL_ENV,
		})
	) {
		cached = { kind: "unavailable", service: "upstash_redis" };
		return cached;
	}

	cached = { kind: "store", store: memoryStore() };
	return cached;
}

/** Clears resolved backend cache (Vitest isolation). */
export function resetResolvedRateLimitBackend(): void {
	cached = undefined;
	memorySingleton = undefined;
}
