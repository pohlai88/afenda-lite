declare const cacheKeyBrand: unique symbol;

/** Opaque key produced only by the canonical cache key capability. */
export type CacheKey = Readonly<{ [cacheKeyBrand]: "CacheKey" }>;

export type CacheLoadStrategy = "cache-first" | "network-first";

export interface CacheLoadOptions {
	strategy?: CacheLoadStrategy;
}

export interface CacheDiagnostics {
	backend: "l1" | "upstash";
	evictions: number;
	l1Hits: number;
	l1Misses: number;
	l2Hits: number;
	l2Misses: number;
	totalKeys: number;
}

export interface CacheEntry {
	createdAt: number;
	data: unknown;
	expiresAt: number;
	tags: readonly string[];
}

export interface CacheL2Store {
	addToTag: (tag: string, key: string) => Promise<void>;
	clearTag: (tag: string) => Promise<void>;
	delete: (key: string) => Promise<void>;
	deleteMany: (keys: readonly string[]) => Promise<void>;
	flushPrefix: () => Promise<void>;
	get: (key: string) => Promise<string | null>;
	keysForTag: (tag: string) => Promise<readonly string[]>;
	removeFromTag: (tag: string, key: string) => Promise<void>;
	set: (key: string, encodedEntry: string, ttlSeconds: number) => Promise<void>;
}

export interface CachePolicy {
	readonly namespace: CacheNamespace;
	readonly ttlSeconds: number;
}

export type CacheNamespace =
	| "organization_config"
	| "organization_features"
	| "permission_catalog"
	| "user_permissions"
	| "user_session";

export interface InternalCacheKey {
	logicalKey: string;
	policy: CachePolicy;
	tags: readonly string[];
}

export interface CacheRuntime {
	delete: (key: CacheKey) => Promise<void>;
	diagnostics: () => CacheDiagnostics;
	flush: () => Promise<void>;
	get: <T>(key: CacheKey) => Promise<T | null>;
	getOrLoad: <T>(
		key: CacheKey,
		loader: () => Promise<T>,
		options?: CacheLoadOptions,
	) => Promise<T>;
	invalidateTag: (tag: string) => Promise<number>;
	set: <T>(key: CacheKey, value: T) => Promise<void>;
}
