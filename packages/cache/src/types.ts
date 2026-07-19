import type { Redis } from "@upstash/redis";

export type CacheStrategy =
	| "cache-first"
	| "network-first"
	| "stale-while-revalidate";

export type CacheEntry<T = unknown> = {
	data: T;
	createdAt: number;
	expiresAt: number;
	tags: string[];
	hitCount: number;
};

export type CacheStats = {
	hits: number;
	misses: number;
	hitRate: number;
	/** Current L1 entry count. */
	totalKeys: number;
	evictions: number;
	l1Hits: number;
	l1Misses: number;
	l2Hits: number;
	l2Misses: number;
};

export type CacheConfig = {
	defaultTTL: number;
	l1MaxSize: number;
};

export type SetCacheOptions = {
	ttl?: number;
	tags?: string[];
};

export type GetOrSetOptions = SetCacheOptions & {
	strategy?: CacheStrategy;
};

/** Optional L2 store — Upstash Redis or test doubles. */
export type CacheL2Store = {
	get(key: string): Promise<CacheEntry | null>;
	set(key: string, entry: CacheEntry, ttlSeconds: number): Promise<void>;
	delete(key: string): Promise<void>;
	deleteMany(keys: string[]): Promise<void>;
	addToTag(tag: string, key: string): Promise<void>;
	removeFromTag(tag: string, key: string): Promise<void>;
	keysForTag(tag: string): Promise<string[]>;
	/** Logical cache keys matching a glob (`*` → any run). */
	keysByPattern(pattern: string): Promise<string[]>;
	clearTag(tag: string): Promise<void>;
	/** Delete all keys under the package prefix (never FLUSHDB). */
	flushPrefix(): Promise<void>;
};

export type CreateCacheManagerOptions = Partial<CacheConfig> & {
	/** Explicit L1-only (tests / local without Upstash). */
	backend?: "upstash" | "l1";
	/** Injected Upstash client (tests / override). */
	redis?: Redis;
	/** Injected L2 store (tests). */
	l2?: CacheL2Store;
};

export type CacheUnavailableFailure = {
	ok: false;
	reason: "unavailable";
	service: "upstash_redis";
};
