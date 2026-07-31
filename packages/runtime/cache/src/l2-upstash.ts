import type { Redis } from "@upstash/redis";

import type { CacheL2Store } from "./types";

const CACHE_KEY_PREFIX = "@afenda/cache:v1:";
const CACHE_TAG_PREFIX = `${CACHE_KEY_PREFIX}tag:`;

function dataKey(key: string) {
	return `${CACHE_KEY_PREFIX}${key}`;
}

function tagKey(tag: string) {
	return `${CACHE_TAG_PREFIX}${tag}`;
}

async function scan(
	redis: Redis,
	match: string,
	cursor = "0",
	found: string[] = [],
): Promise<string[]> {
	const [next, keys] = await redis.scan(cursor, { match, count: 100 });
	for (const key of keys) {
		if (typeof key === "string") {
			found.push(key);
		}
	}
	return String(next) === "0" ? found : scan(redis, match, String(next), found);
}

export function createUpstashL2Store(redis: Redis): CacheL2Store {
	return {
		async get(key) {
			const value = await redis.get<unknown>(dataKey(key));
			if (typeof value === "string") {
				return value;
			}
			return value === null ? null : JSON.stringify(value);
		},
		async set(key, encodedEntry, ttlSeconds) {
			await redis.set(dataKey(key), encodedEntry, {
				ex: Math.max(1, Math.ceil(ttlSeconds)),
			});
		},
		async delete(key) {
			await redis.del(dataKey(key));
		},
		async deleteMany(keys) {
			if (keys.length > 0) {
				await redis.del(...keys.map(dataKey));
			}
		},
		async addToTag(tag, key) {
			await redis.sadd(tagKey(tag), key);
		},
		async removeFromTag(tag, key) {
			await redis.srem(tagKey(tag), key);
		},
		async keysForTag(tag) {
			const values = await redis.smembers(tagKey(tag));
			return values.filter(
				(value): value is string => typeof value === "string",
			);
		},
		async clearTag(tag) {
			await redis.del(tagKey(tag));
		},
		async flushPrefix() {
			const keys = await scan(redis, `${CACHE_KEY_PREFIX}*`);
			if (keys.length > 0) {
				await redis.del(...keys);
			}
		},
	};
}
