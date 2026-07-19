import type { Redis } from "@upstash/redis";

import { patternToRegExp } from "./pattern";
import type { CacheEntry, CacheL2Store } from "./types";

/** Shared Upstash namespace — never FLUSHDB (rate-limit shares the instance). */
export const CACHE_KEY_PREFIX = "@afenda/cache:v1:";
export const CACHE_TAG_PREFIX = `${CACHE_KEY_PREFIX}tag:`;

function dataKey(key: string): string {
	return `${CACHE_KEY_PREFIX}${key}`;
}

function tagKey(tag: string): string {
	return `${CACHE_TAG_PREFIX}${tag}`;
}

function logicalKeyFromDataKey(prefixed: string): string | null {
	if (!prefixed.startsWith(CACHE_KEY_PREFIX)) {
		return null;
	}
	const logical = prefixed.slice(CACHE_KEY_PREFIX.length);
	if (logical.startsWith("tag:")) {
		return null;
	}
	return logical;
}

function isCacheEntry(value: unknown): value is CacheEntry {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return false;
	}
	if (
		!("data" in value) ||
		!("createdAt" in value) ||
		!("expiresAt" in value) ||
		!("tags" in value) ||
		!("hitCount" in value)
	) {
		return false;
	}
	return (
		typeof value.createdAt === "number" &&
		typeof value.expiresAt === "number" &&
		Array.isArray(value.tags) &&
		typeof value.hitCount === "number"
	);
}

function parseEntry(raw: unknown): CacheEntry | null {
	if (!isCacheEntry(raw)) {
		return null;
	}
	return {
		data: raw.data,
		createdAt: raw.createdAt,
		expiresAt: raw.expiresAt,
		tags: raw.tags.filter((t): t is string => typeof t === "string"),
		hitCount: raw.hitCount,
	};
}

async function scanKeys(redis: Redis, match: string): Promise<string[]> {
	const found: string[] = [];
	let cursor = "0";
	do {
		const [next, keys] = await redis.scan(cursor, {
			match,
			count: 100,
		});
		cursor = String(next);
		for (const key of keys) {
			if (typeof key === "string") {
				found.push(key);
			}
		}
	} while (cursor !== "0");
	return found;
}

export function createUpstashL2Store(redis: Redis): CacheL2Store {
	return {
		async get(key) {
			const raw = await redis.get<unknown>(dataKey(key));
			return parseEntry(raw);
		},

		async set(key, entry, ttlSeconds) {
			const ttl = Math.max(1, Math.ceil(ttlSeconds));
			await redis.set(dataKey(key), entry, { ex: ttl });
		},

		async delete(key) {
			await redis.del(dataKey(key));
		},

		async deleteMany(keys) {
			if (keys.length === 0) {
				return;
			}
			await redis.del(...keys.map(dataKey));
		},

		async addToTag(tag, key) {
			await redis.sadd(tagKey(tag), key);
		},

		async removeFromTag(tag, key) {
			await redis.srem(tagKey(tag), key);
		},

		async keysForTag(tag) {
			const members = await redis.smembers(tagKey(tag));
			return members.filter((m): m is string => typeof m === "string");
		},

		async keysByPattern(pattern) {
			const match = `${CACHE_KEY_PREFIX}${pattern}`;
			const regex = patternToRegExp(pattern);
			const prefixed = await scanKeys(redis, match);
			const logical: string[] = [];
			for (const key of prefixed) {
				const decoded = logicalKeyFromDataKey(key);
				if (decoded !== null && regex.test(decoded)) {
					logical.push(decoded);
				}
			}
			return logical;
		},

		async clearTag(tag) {
			await redis.del(tagKey(tag));
		},

		async flushPrefix() {
			const keys = await scanKeys(redis, `${CACHE_KEY_PREFIX}*`);
			if (keys.length > 0) {
				await redis.del(...keys);
			}
		},
	};
}
