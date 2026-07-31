import { env, isProductionDeploymentNow } from "@afenda/env";
import { Redis } from "@upstash/redis";

import { CacheManager } from "./cache-manager";
import { cacheUnavailable } from "./failure";
import { createUpstashL2Store } from "./l2-upstash";
import type { CacheRuntime } from "./types";

let runtime: CacheRuntime | undefined;

function credentials(): { token: string; url: string } | undefined {
	const url = env.UPSTASH_REDIS_REST_URL;
	const token = env.UPSTASH_REDIS_REST_TOKEN;
	return typeof url === "string" &&
		url.length > 0 &&
		typeof token === "string" &&
		token.length > 0
		? { token, url }
		: undefined;
}

export function resolveCacheRuntime(): CacheRuntime {
	if (runtime) {
		return runtime;
	}
	const configured = credentials();
	if (configured) {
		const redis = new Redis(configured);
		runtime = new CacheManager("upstash", createUpstashL2Store(redis));
		return runtime;
	}
	if (isProductionDeploymentNow()) {
		cacheUnavailable();
	}
	runtime = new CacheManager("l1");
	return runtime;
}

export function resetCacheRuntime() {
	runtime = undefined;
}
