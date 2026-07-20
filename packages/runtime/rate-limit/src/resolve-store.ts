import { env, isProductionDeployment } from "@afenda/env";

import { createMemoryRateLimitStore } from "./memory-store";
import type { RateLimitStore } from "./types";
import { createUpstashRateLimitStore } from "./upstash-store";

export type ResolvedBackend =
	| { kind: "store"; store: RateLimitStore; backend: "upstash" | "memory" }
	| { kind: "unavailable"; service: "upstash_redis" };

let cached: ResolvedBackend | undefined;
let memorySingleton: RateLimitStore | undefined;

function upstashCredentials(): { url: string; token: string } | undefined {
	const url = env.UPSTASH_REDIS_REST_URL;
	const token = env.UPSTASH_REDIS_REST_TOKEN;
	if (
		typeof url === "string" &&
		url.length > 0 &&
		typeof token === "string" &&
		token.length > 0
	) {
		return { url, token };
	}
	return undefined;
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

	const credentials = upstashCredentials();
	if (credentials) {
		cached = {
			kind: "store",
			backend: "upstash",
			store: createUpstashRateLimitStore(credentials),
		};
		return cached;
	}

	if (
		isProductionDeployment({
			vercelEnv: process.env.VERCEL_ENV,
		})
	) {
		cached = { kind: "unavailable", service: "upstash_redis" };
		return cached;
	}

	cached = { kind: "store", backend: "memory", store: memoryStore() };
	return cached;
}

/** Clears resolved backend cache (Vitest isolation). */
export function resetResolvedRateLimitBackend(): void {
	cached = undefined;
	memorySingleton = undefined;
}
