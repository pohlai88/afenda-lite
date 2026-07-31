import { inspectCacheKey } from "./semantic-registry";
import { decodeEntry, encodeEntry, normalizeValue } from "./serialization";
import type {
	CacheDiagnostics,
	CacheEntry,
	CacheKey,
	CacheL2Store,
	CacheLoadOptions,
	CacheRuntime,
} from "./types";

const DEFAULT_L1_MAX_SIZE = 1000;

function sequential<T>(items: readonly T[], run: (item: T) => Promise<void>) {
	return items.reduce(
		(pending, item) => pending.then(() => run(item)),
		Promise.resolve(),
	);
}

export class CacheManager implements CacheRuntime {
	private readonly backend: "l1" | "upstash";
	private readonly l1 = new Map<string, CacheEntry>();
	private readonly l1MaxSize: number;
	private readonly l2: CacheL2Store | undefined;
	private readonly tagIndex = new Map<string, Set<string>>();
	private evictions = 0;
	private l1Hits = 0;
	private l1Misses = 0;
	private l2Hits = 0;
	private l2Misses = 0;

	constructor(
		backend: "l1" | "upstash",
		l2?: CacheL2Store,
		l1MaxSize = DEFAULT_L1_MAX_SIZE,
	) {
		this.backend = backend;
		this.l2 = l2;
		this.l1MaxSize = l1MaxSize;
	}

	async get<T>(key: CacheKey): Promise<T | null> {
		const { logicalKey } = inspectCacheKey(key);
		const now = Date.now();
		const local = this.l1.get(logicalKey);
		if (local && local.expiresAt > now) {
			this.l1Hits += 1;
			return local.data as T;
		}
		if (local) {
			this.removeL1(logicalKey, local);
		}
		this.l1Misses += 1;
		if (!this.l2) {
			return null;
		}
		const encoded = await this.l2.get(logicalKey);
		const remote = encoded === null ? null : decodeEntry(encoded);
		if (!remote || remote.expiresAt <= now) {
			this.l2Misses += 1;
			if (encoded !== null) {
				await this.l2.delete(logicalKey);
			}
			return null;
		}
		this.l2Hits += 1;
		this.writeL1(logicalKey, remote);
		return remote.data as T;
	}

	async set<T>(key: CacheKey, value: T): Promise<void> {
		const { logicalKey, policy, tags } = inspectCacheKey(key);
		const now = Date.now();
		const entry: CacheEntry = {
			createdAt: now,
			data: normalizeValue(value),
			expiresAt: now + policy.ttlSeconds * 1000,
			tags,
		};
		this.writeL1(logicalKey, entry);
		if (!this.l2) {
			return;
		}
		await this.l2.set(logicalKey, encodeEntry(entry), policy.ttlSeconds);
		await sequential(
			tags,
			(tag) => this.l2?.addToTag(tag, logicalKey) ?? Promise.resolve(),
		);
	}

	async delete(key: CacheKey): Promise<void> {
		const { logicalKey } = inspectCacheKey(key);
		const existing = this.l1.get(logicalKey);
		let tags = existing?.tags ?? [];
		if (existing) {
			this.removeL1(logicalKey, existing);
		}
		if (!this.l2) {
			return;
		}
		if (!existing) {
			const encoded = await this.l2.get(logicalKey);
			tags = encoded === null ? [] : (decodeEntry(encoded)?.tags ?? []);
		}
		await this.l2.delete(logicalKey);
		await sequential(
			tags,
			(tag) => this.l2?.removeFromTag(tag, logicalKey) ?? Promise.resolve(),
		);
	}

	async getOrLoad<T>(
		key: CacheKey,
		loader: () => Promise<T>,
		options: CacheLoadOptions = {},
	): Promise<T> {
		if (options.strategy === "network-first") {
			try {
				const fresh = await loader();
				await this.set(key, fresh);
				return fresh;
			} catch (error) {
				const cached = await this.get<T>(key);
				if (cached !== null) {
					return cached;
				}
				throw error;
			}
		}
		const cached = await this.get<T>(key);
		if (cached !== null) {
			return cached;
		}
		const fresh = await loader();
		await this.set(key, fresh);
		return fresh;
	}

	async invalidateTag(tag: string): Promise<number> {
		const keys = new Set(this.tagIndex.get(tag) ?? []);
		if (this.l2) {
			for (const key of await this.l2.keysForTag(tag)) {
				keys.add(key);
			}
		}
		for (const key of keys) {
			const entry = this.l1.get(key);
			if (entry) {
				this.removeL1(key, entry);
			}
		}
		if (this.l2) {
			await this.l2.deleteMany([...keys]);
			await this.l2.clearTag(tag);
		}
		this.tagIndex.delete(tag);
		return keys.size;
	}

	diagnostics(): CacheDiagnostics {
		return {
			backend: this.backend,
			evictions: this.evictions,
			l1Hits: this.l1Hits,
			l1Misses: this.l1Misses,
			l2Hits: this.l2Hits,
			l2Misses: this.l2Misses,
			totalKeys: this.l1.size,
		};
	}

	async flush(): Promise<void> {
		this.l1.clear();
		this.tagIndex.clear();
		this.evictions = 0;
		this.l1Hits = 0;
		this.l1Misses = 0;
		this.l2Hits = 0;
		this.l2Misses = 0;
		if (this.l2) {
			await this.l2.flushPrefix();
		}
	}

	private writeL1(key: string, entry: CacheEntry) {
		const previous = this.l1.get(key);
		if (previous) {
			this.unlinkTags(key, previous.tags);
		}
		if (this.l1.size >= this.l1MaxSize && !this.l1.has(key)) {
			const first = this.l1.entries().next().value as
				| [string, CacheEntry]
				| undefined;
			if (first) {
				this.removeL1(first[0], first[1]);
				this.evictions += 1;
			}
		}
		this.l1.set(key, entry);
		for (const tag of entry.tags) {
			const keys = this.tagIndex.get(tag) ?? new Set<string>();
			keys.add(key);
			this.tagIndex.set(tag, keys);
		}
	}

	private removeL1(key: string, entry: CacheEntry) {
		this.l1.delete(key);
		this.unlinkTags(key, entry.tags);
	}

	private unlinkTags(key: string, tags: readonly string[]) {
		for (const tag of tags) {
			const keys = this.tagIndex.get(tag);
			keys?.delete(key);
			if (keys?.size === 0) {
				this.tagIndex.delete(tag);
			}
		}
	}
}
