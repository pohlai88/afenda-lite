import { env, isProductionDeployment } from "@afenda/env";
import { Redis } from "@upstash/redis";

import { CacheManager } from "./cache-manager";
import { createUpstashL2Store } from "./l2-upstash";
import { toCacheAppError } from "./to-app-error";
import type { CreateCacheManagerOptions } from "./types";

export type ResolvedCacheBackend =
	| { kind: "manager"; backend: "upstash" | "l1"; manager: CacheManager }
	| { kind: "unavailable"; service: "upstash_redis" };

let cached: ResolvedCacheBackend | undefined;

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

function redisFromCredentials(credentials: {
	url: string;
	token: string;
}): Redis {
	return new Redis({
		url: credentials.url,
		token: credentials.token,
	});
}

function isProductionWithoutUpstash(): boolean {
	return isProductionDeployment({
		vercelEnv: process.env.VERCEL_ENV,
	});
}

function pickConfig(
	options: CreateCacheManagerOptions,
): Partial<{ defaultTTL: number; l1MaxSize: number }> {
	return {
		...(options.defaultTTL !== undefined
			? { defaultTTL: options.defaultTTL }
			: {}),
		...(options.l1MaxSize !== undefined
			? { l1MaxSize: options.l1MaxSize }
			: {}),
	};
}

/**
 * Build a manager from options. Fail-closed in Vercel production when Upstash
 * credentials are missing and the caller did not force `backend: "l1"` / inject.
 */
function buildManager(options: CreateCacheManagerOptions = {}): CacheManager {
	const config = pickConfig(options);

	if (options.l2) {
		return new CacheManager(config, options.l2);
	}

	if (options.redis) {
		return new CacheManager(config, createUpstashL2Store(options.redis));
	}

	if (options.backend === "l1") {
		return new CacheManager(config);
	}

	const credentials = upstashCredentials();
	if (credentials) {
		return new CacheManager(
			config,
			createUpstashL2Store(redisFromCredentials(credentials)),
		);
	}

	if (options.backend === "upstash" || isProductionWithoutUpstash()) {
		throw toCacheAppError({
			ok: false,
			reason: "unavailable",
			service: "upstash_redis",
		});
	}

	return new CacheManager(config);
}

function bypassesProcessSingleton(options: CreateCacheManagerOptions): boolean {
	return (
		options.l2 !== undefined ||
		options.redis !== undefined ||
		options.backend !== undefined ||
		options.defaultTTL !== undefined ||
		options.l1MaxSize !== undefined
	);
}

/**
 * Upstash L1+L2 when configured; L1-only for non-production without keys;
 * production without Upstash keys fails closed (unavailable).
 */
export function resolveCacheBackend(): ResolvedCacheBackend {
	if (cached) {
		return cached;
	}

	const credentials = upstashCredentials();
	if (credentials) {
		cached = {
			kind: "manager",
			backend: "upstash",
			manager: new CacheManager(
				{},
				createUpstashL2Store(redisFromCredentials(credentials)),
			),
		};
		return cached;
	}

	if (isProductionWithoutUpstash()) {
		cached = { kind: "unavailable", service: "upstash_redis" };
		return cached;
	}

	cached = {
		kind: "manager",
		backend: "l1",
		manager: new CacheManager(),
	};
	return cached;
}

/**
 * Build a CacheManager. Default path uses `resolveCacheBackend` and throws
 * `SERVICE_UNAVAILABLE` when production has no Upstash credentials.
 * Pass `redis`, `l2`, `backend`, or TTL/size overrides to bypass the singleton.
 */
export function createCacheManager(
	options: CreateCacheManagerOptions = {},
): CacheManager {
	if (bypassesProcessSingleton(options)) {
		return buildManager(options);
	}

	const resolved = resolveCacheBackend();
	if (resolved.kind === "unavailable") {
		throw toCacheAppError({
			ok: false,
			reason: "unavailable",
			service: resolved.service,
		});
	}
	return resolved.manager;
}

/** Clears resolved backend cache (Vitest isolation). */
export function resetResolvedCacheBackend(): void {
	cached = undefined;
}
