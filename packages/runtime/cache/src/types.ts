import type { Redis } from "@upstash/redis";

export type CacheStrategy =
	| "cache-first"
	| "network-first"
	| "stale-while-revalidate";

export interface CacheEntry<T = unknown> {
	createdAt: number;
	data: T;
	expiresAt: number;
	hitCount: number;
	tags: string[];
}

export interface CacheStats {
	evictions: number;
	hitRate: number;
	hits: number;
	l1Hits: number;
	l1Misses: number;
	l2Hits: number;
	l2Misses: number;
	misses: number;
	/** Current L1 entry count. */
	totalKeys: number;
}

export interface CacheConfig {
	defaultTTL: number;
	l1MaxSize: number;
}

export interface SetCacheOptions {
	tags?: string[];
	ttl?: number;
}

export type GetOrSetOptions = SetCacheOptions & {
	strategy?: CacheStrategy;
};

/** Optional L2 store — Upstash Redis or test doubles. */
export interface CacheL2Store {
	addToTag: (tag: string, key: string) => Promise<void>;
	clearTag: (tag: string) => Promise<void>;
	delete: (key: string) => Promise<void>;
	deleteMany: (keys: string[]) => Promise<void>;
	/** Delete all keys under the package prefix (never FLUSHDB). */
	flushPrefix: () => Promise<void>;
	get: (key: string) => Promise<CacheEntry | null>;
	/** Logical cache keys matching a glob (`*` → any run). */
	keysByPattern: (pattern: string) => Promise<string[]>;
	keysForTag: (tag: string) => Promise<string[]>;
	removeFromTag: (tag: string, key: string) => Promise<void>;
	set: (key: string, entry: CacheEntry, ttlSeconds: number) => Promise<void>;
}

export type CreateCacheManagerOptions = Partial<CacheConfig> & {
	/** Explicit L1-only (tests / local without Upstash). */
	backend?: "upstash" | "l1";
	/** Injected Upstash client (tests / override). */
	redis?: Redis;
	/** Injected L2 store (tests). */
	l2?: CacheL2Store;
};

export interface CacheUnavailableFailure {
	ok: false;
	reason: "unavailable";
	service: "upstash_redis";
}
