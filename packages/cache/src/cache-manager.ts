import { patternToRegExp } from "./pattern";
import type {
	CacheConfig,
	CacheEntry,
	CacheL2Store,
	CacheStats,
	CacheStrategy,
	GetOrSetOptions,
	SetCacheOptions,
} from "./types";

const DEFAULT_CONFIG: CacheConfig = {
	defaultTTL: 300,
	l1MaxSize: 1000,
};

export class CacheManager {
	private readonly l1 = new Map<string, CacheEntry>();
	private readonly tagIndex = new Map<string, Set<string>>();
	private readonly config: CacheConfig;
	private readonly l2: CacheL2Store | undefined;
	private l1Hits = 0;
	private l1Misses = 0;
	private l2Hits = 0;
	private l2Misses = 0;
	private evictions = 0;

	constructor(config: Partial<CacheConfig> = {}, l2?: CacheL2Store) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.l2 = l2;
	}

	/** True when an Upstash (or injected) L2 store is attached. */
	get hasL2(): boolean {
		return this.l2 !== undefined;
	}

	async get<T>(key: string): Promise<T | null> {
		const now = Date.now();
		const l1Entry = this.l1.get(key);
		if (l1Entry) {
			if (l1Entry.expiresAt > now) {
				l1Entry.hitCount += 1;
				this.l1Hits += 1;
				return l1Entry.data as T;
			}
			this.removeL1(key, l1Entry);
		}

		this.l1Misses += 1;

		if (!this.l2) {
			return null;
		}

		const l2Entry = await this.l2.get(key);
		if (!l2Entry || l2Entry.expiresAt <= now) {
			this.l2Misses += 1;
			if (l2Entry) {
				await this.l2.delete(key);
			}
			return null;
		}

		this.l2Hits += 1;
		this.writeL1(key, l2Entry);
		return l2Entry.data as T;
	}

	async set<T>(
		key: string,
		value: T,
		options: SetCacheOptions = {},
	): Promise<void> {
		const ttl = options.ttl ?? this.config.defaultTTL;
		const tags = options.tags ?? [];
		const now = Date.now();
		const entry: CacheEntry<T> = {
			data: value,
			createdAt: now,
			expiresAt: now + ttl * 1000,
			tags,
			hitCount: 0,
		};

		this.writeL1(key, entry);

		if (this.l2) {
			await this.l2.set(key, entry, ttl);
			for (const tag of tags) {
				await this.l2.addToTag(tag, key);
			}
		}
	}

	async delete(key: string): Promise<void> {
		const existing = this.l1.get(key);
		let tags = existing?.tags ?? [];
		if (existing) {
			this.removeL1(key, existing);
		}

		if (!this.l2) {
			return;
		}

		if (!existing) {
			const remote = await this.l2.get(key);
			if (remote) {
				tags = remote.tags;
			}
		}

		await this.l2.delete(key);
		for (const tag of tags) {
			await this.l2.removeFromTag(tag, key);
		}
	}

	async invalidateByTag(tag: string): Promise<number> {
		const keys = new Set<string>(this.tagIndex.get(tag) ?? []);

		if (this.l2) {
			for (const key of await this.l2.keysForTag(tag)) {
				keys.add(key);
			}
		}

		if (keys.size === 0) {
			this.tagIndex.delete(tag);
			if (this.l2) {
				await this.l2.clearTag(tag);
			}
			return 0;
		}

		for (const key of keys) {
			const entry = this.l1.get(key);
			if (entry) {
				this.removeL1(key, entry);
			} else {
				this.l1.delete(key);
			}
		}

		if (this.l2) {
			await this.l2.deleteMany([...keys]);
			await this.l2.clearTag(tag);
		}

		this.tagIndex.delete(tag);
		return keys.size;
	}

	async invalidateByPattern(pattern: string): Promise<number> {
		const regex = patternToRegExp(pattern);
		const matched = new Set<string>();

		for (const key of this.l1.keys()) {
			if (regex.test(key)) {
				matched.add(key);
			}
		}

		if (this.l2) {
			for (const key of await this.l2.keysByPattern(pattern)) {
				matched.add(key);
			}
		}

		for (const key of matched) {
			await this.delete(key);
		}

		return matched.size;
	}

	async getOrSet<T>(
		key: string,
		factory: () => Promise<T>,
		options: GetOrSetOptions = {},
	): Promise<T> {
		const strategy: CacheStrategy = options.strategy ?? "cache-first";

		switch (strategy) {
			case "cache-first": {
				const cached = await this.get<T>(key);
				if (cached !== null) {
					return cached;
				}
				const value = await factory();
				await this.set(key, value, options);
				return value;
			}
			case "stale-while-revalidate": {
				const cached = await this.get<T>(key);
				if (cached !== null) {
					void factory()
						.then((value) => this.set(key, value, options))
						.catch(() => {
							/* background revalidate failures stay silent */
						});
					return cached;
				}
				const value = await factory();
				await this.set(key, value, options);
				return value;
			}
			case "network-first": {
				try {
					const value = await factory();
					await this.set(key, value, options);
					return value;
				} catch (error) {
					const cached = await this.get<T>(key);
					if (cached !== null) {
						return cached;
					}
					throw error;
				}
			}
			default: {
				const _exhaustive: never = strategy;
				return _exhaustive;
			}
		}
	}

	async mget<T>(keys: string[]): Promise<Map<string, T | null>> {
		const results = new Map<string, T | null>();
		for (const key of keys) {
			results.set(key, await this.get<T>(key));
		}
		return results;
	}

	async mset<T>(
		entries: Array<{
			key: string;
			value: T;
			ttl?: number;
			tags?: string[];
		}>,
	): Promise<void> {
		for (const entry of entries) {
			await this.set(entry.key, entry.value, {
				ttl: entry.ttl,
				tags: entry.tags,
			});
		}
	}

	getStats(): CacheStats {
		const hits = this.l1Hits + this.l2Hits;
		const misses = this.l1Misses + this.l2Misses;
		const total = hits + misses;
		return {
			hits,
			misses,
			hitRate: total > 0 ? hits / total : 0,
			totalKeys: this.l1.size,
			evictions: this.evictions,
			l1Hits: this.l1Hits,
			l1Misses: this.l1Misses,
			l2Hits: this.l2Hits,
			l2Misses: this.l2Misses,
		};
	}

	async flush(): Promise<void> {
		this.l1.clear();
		this.tagIndex.clear();
		this.l1Hits = 0;
		this.l1Misses = 0;
		this.l2Hits = 0;
		this.l2Misses = 0;
		this.evictions = 0;
		if (this.l2) {
			await this.l2.flushPrefix();
		}
	}

	private writeL1(key: string, entry: CacheEntry): void {
		const previous = this.l1.get(key);
		if (previous) {
			this.unlinkTags(key, previous.tags);
		}

		if (this.l1.size >= this.config.l1MaxSize && !this.l1.has(key)) {
			this.evictL1();
		}

		this.l1.set(key, entry);
		for (const tag of entry.tags) {
			let set = this.tagIndex.get(tag);
			if (!set) {
				set = new Set();
				this.tagIndex.set(tag, set);
			}
			set.add(key);
		}
	}

	private removeL1(key: string, entry: CacheEntry): void {
		this.l1.delete(key);
		this.unlinkTags(key, entry.tags);
	}

	private unlinkTags(key: string, tags: string[]): void {
		for (const tag of tags) {
			const set = this.tagIndex.get(tag);
			if (!set) {
				continue;
			}
			set.delete(key);
			if (set.size === 0) {
				this.tagIndex.delete(tag);
			}
		}
	}

	private evictL1(): void {
		const entries = [...this.l1.entries()].sort(
			(a, b) => a[1].hitCount - b[1].hitCount,
		);
		const removeCount = Math.max(1, Math.floor(this.config.l1MaxSize * 0.1));
		for (let i = 0; i < removeCount && i < entries.length; i += 1) {
			const pair = entries[i];
			if (!pair) {
				break;
			}
			const [key, entry] = pair;
			this.removeL1(key, entry);
			this.evictions += 1;
		}
	}
}
