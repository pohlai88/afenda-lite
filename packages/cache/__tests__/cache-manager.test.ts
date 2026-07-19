import { describe, expect, it, vi } from "vitest";

import { CacheManager } from "../src/cache-manager";
import { patternToRegExp } from "../src/pattern";
import type { CacheEntry, CacheL2Store } from "../src/types";

function createMemoryL2(): CacheL2Store & {
	store: Map<string, CacheEntry>;
	tags: Map<string, Set<string>>;
} {
	const store = new Map<string, CacheEntry>();
	const tags = new Map<string, Set<string>>();

	return {
		store,
		tags,
		async get(key) {
			return store.get(key) ?? null;
		},
		async set(key, entry) {
			store.set(key, entry);
		},
		async delete(key) {
			store.delete(key);
		},
		async deleteMany(keys) {
			for (const key of keys) {
				store.delete(key);
			}
		},
		async addToTag(tag, key) {
			let set = tags.get(tag);
			if (!set) {
				set = new Set();
				tags.set(tag, set);
			}
			set.add(key);
		},
		async removeFromTag(tag, key) {
			tags.get(tag)?.delete(key);
			if (tags.get(tag)?.size === 0) {
				tags.delete(tag);
			}
		},
		async keysForTag(tag) {
			return [...(tags.get(tag) ?? [])];
		},
		async keysByPattern(pattern) {
			const regex = patternToRegExp(pattern);
			return [...store.keys()].filter((key) => regex.test(key));
		},
		async clearTag(tag) {
			tags.delete(tag);
		},
		async flushPrefix() {
			store.clear();
			tags.clear();
		},
	};
}

describe("CacheManager", () => {
	it("get/set and getOrSet cache-first hit", async () => {
		const cache = new CacheManager({ defaultTTL: 60 });
		await cache.set("k1", { n: 1 }, { ttl: 60 });
		expect(await cache.get<{ n: number }>("k1")).toEqual({ n: 1 });

		const factory = vi.fn(async () => ({ n: 2 }));
		const value = await cache.getOrSet("k1", factory, { ttl: 60 });
		expect(value).toEqual({ n: 1 });
		expect(factory).not.toHaveBeenCalled();
	});

	it("getOrSet network-first prefers factory then falls back to cache", async () => {
		const cache = new CacheManager();
		await cache.set("k", "stale");

		const fresh = await cache.getOrSet("k", async () => "fresh", {
			strategy: "network-first",
		});
		expect(fresh).toBe("fresh");

		const fallback = await cache.getOrSet(
			"k",
			async () => {
				throw new Error("network down");
			},
			{ strategy: "network-first" },
		);
		expect(fallback).toBe("fresh");
	});

	it("getOrSet stale-while-revalidate returns cached then refreshes", async () => {
		const cache = new CacheManager();
		await cache.set("k", "v1");

		let resolveRefresh: ((value: string) => void) | undefined;
		const refresh = new Promise<string>((resolve) => {
			resolveRefresh = resolve;
		});

		const value = await cache.getOrSet("k", () => refresh, {
			strategy: "stale-while-revalidate",
		});
		expect(value).toBe("v1");

		resolveRefresh?.("v2");
		await refresh;
		await vi.waitFor(async () => {
			expect(await cache.get("k")).toBe("v2");
		});
	});

	it("invalidates by tag", async () => {
		const cache = new CacheManager();
		await cache.set("a", 1, { tags: ["org:1"] });
		await cache.set("b", 2, { tags: ["org:1"] });
		await cache.set("c", 3, { tags: ["org:2"] });

		const cleared = await cache.invalidateByTag("org:1");
		expect(cleared).toBe(2);
		expect(await cache.get("a")).toBeNull();
		expect(await cache.get("b")).toBeNull();
		expect(await cache.get("c")).toBe(3);
	});

	it("invalidates by pattern across L1 and L2", async () => {
		const l2 = createMemoryL2();
		const writer = new CacheManager({}, l2);
		await writer.set("org:config:1", { ok: true });
		await writer.set("org:config:2", { ok: true });
		await writer.set("session:u1", { ok: true });

		const reader = new CacheManager({}, l2);
		const cleared = await reader.invalidateByPattern("org:config:*");
		expect(cleared).toBe(2);
		expect(await reader.get("org:config:1")).toBeNull();
		expect(l2.store.has("org:config:1")).toBe(false);
		expect(await reader.get("session:u1")).toEqual({ ok: true });
	});

	it("reads through injected L2 and warms L1", async () => {
		const l2 = createMemoryL2();
		const writer = new CacheManager({}, l2);
		await writer.set("remote", { v: 9 }, { ttl: 120, tags: ["t"] });

		const reader = new CacheManager({}, l2);
		expect(reader.hasL2).toBe(true);
		expect(await reader.get<{ v: number }>("remote")).toEqual({ v: 9 });

		const stats = reader.getStats();
		expect(stats.l2Hits).toBe(1);
		expect(stats.l1Misses).toBe(1);

		expect(await reader.get<{ v: number }>("remote")).toEqual({ v: 9 });
		expect(reader.getStats().l1Hits).toBe(1);
	});

	it("delete removes L2 value and tag membership", async () => {
		const l2 = createMemoryL2();
		const cache = new CacheManager({}, l2);
		await cache.set("x", 1, { tags: ["tag-x"] });
		await cache.delete("x");
		expect(await cache.get("x")).toBeNull();
		expect(l2.store.has("x")).toBe(false);
		expect(l2.tags.get("tag-x")?.has("x") ?? false).toBe(false);

		await cache.set("y", 2);
		await cache.flush();
		expect(await cache.get("y")).toBeNull();
		expect(l2.store.size).toBe(0);
	});
});
