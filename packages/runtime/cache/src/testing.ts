import { CacheManager } from "./cache-manager";
import { resetCacheRuntime } from "./resolve";
import { cacheKey } from "./semantic-registry";
import type { CacheL2Store } from "./types";

export type CacheTestingL2Store = CacheL2Store;

export const cacheTesting = Object.freeze({
	create(input: { l2?: CacheTestingL2Store; l1MaxSize?: number } = {}) {
		return new CacheManager(
			input.l2 ? "upstash" : "l1",
			input.l2,
			input.l1MaxSize,
		);
	},
	key: cacheKey,
	resetResolvedRuntime: resetCacheRuntime,
});
