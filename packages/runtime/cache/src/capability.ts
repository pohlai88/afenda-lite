import { normalizeCacheOperation } from "./failure";
import { resolveCacheRuntime } from "./resolve";
import { cacheKey, organizationTag, userTag } from "./semantic-registry";
import type { CacheKey, CacheLoadOptions } from "./types";

export const cache = Object.freeze({
	key: cacheKey,
	get<T>(key: CacheKey): Promise<T | null> {
		return normalizeCacheOperation(() => resolveCacheRuntime().get<T>(key));
	},
	set<T>(key: CacheKey, value: T): Promise<void> {
		return normalizeCacheOperation(() => resolveCacheRuntime().set(key, value));
	},
	delete(key: CacheKey): Promise<void> {
		return normalizeCacheOperation(() => resolveCacheRuntime().delete(key));
	},
	getOrLoad<T>(
		key: CacheKey,
		loader: () => Promise<T>,
		options?: CacheLoadOptions,
	): Promise<T> {
		if (options?.strategy === "network-first") {
			return loader().then(
				async (fresh) => {
					await cache.set(key, fresh);
					return fresh;
				},
				async (loaderError: unknown) => {
					const cached = await cache.get<T>(key);
					if (cached !== null) {
						return cached;
					}
					throw loaderError;
				},
			);
		}
		return cache.get<T>(key).then(async (cached) => {
			if (cached !== null) {
				return cached;
			}
			const fresh = await loader();
			await cache.set(key, fresh);
			return fresh;
		});
	},
	invalidate: Object.freeze({
		organization(input: { organizationId: string }): Promise<number> {
			return normalizeCacheOperation(() =>
				resolveCacheRuntime().invalidateTag(
					organizationTag(input.organizationId),
				),
			);
		},
		user(input: { userId: string }): Promise<number> {
			return normalizeCacheOperation(() =>
				resolveCacheRuntime().invalidateTag(userTag(input.userId)),
			);
		},
	}),
	diagnostics() {
		return resolveCacheRuntime().diagnostics();
	},
});
