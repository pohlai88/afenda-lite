import { type CacheKey, cache } from "@afenda/cache";

const key: CacheKey = cache.key.organizationConfig({ organizationId: "org-1" });
export const read = cache.get<{ enabled: boolean }>(key);
export const write = cache.set(key, { enabled: true });
export const invalidation = cache.invalidate.organization({
	organizationId: "org-1",
});

// @ts-expect-error raw strings are not cache keys
export const rawRead = cache.get("organization_config:org-1");

// @ts-expect-error consumers cannot choose arbitrary namespaces
cache.key.custom({ namespace: "raw", key: "value" });

// @ts-expect-error TTL is canonical per namespace
export const rawTtl = cache.set(key, { enabled: true }, { ttl: 5 });

// @ts-expect-error backend selection is private
cache.resolveBackend();
