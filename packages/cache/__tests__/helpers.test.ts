import { describe, expect, it, vi } from "vitest";

import { BatchLoader } from "../src/batch-loader";
import { RequestDeduplicator } from "../src/dedupe";
import { CacheKeys, CacheTTL } from "../src/keys";

describe("RequestDeduplicator", () => {
	it("single-flights concurrent factories for the same key", async () => {
		const dedupe = new RequestDeduplicator();
		let calls = 0;
		const factory = vi.fn(async () => {
			calls += 1;
			await new Promise((r) => setTimeout(r, 20));
			return calls;
		});

		const [a, b] = await Promise.all([
			dedupe.dedupe("k", factory),
			dedupe.dedupe("k", factory),
		]);

		expect(a).toBe(1);
		expect(b).toBe(1);
		expect(factory).toHaveBeenCalledTimes(1);
	});
});

describe("BatchLoader", () => {
	it("batches unique keys into one batchFn call", async () => {
		const batchFn = vi.fn(async (keys: string[]) => {
			await new Promise((r) => setTimeout(r, 5));
			return new Map(keys.map((k) => [k, k.toUpperCase()]));
		});

		const loader = new BatchLoader(batchFn, {
			batchDelayMs: 15,
			maxBatchSize: 100,
		});

		const [a, b, c] = await Promise.all([
			loader.load("a"),
			loader.load("b"),
			loader.load("a"),
		]);

		expect(a).toBe("A");
		expect(b).toBe("B");
		expect(c).toBe("A");
		expect(batchFn).toHaveBeenCalledTimes(1);
		expect(batchFn.mock.calls[0]?.[0]).toEqual(["a", "b"]);
	});
});

describe("CacheKeys / CacheTTL", () => {
	it("builds platform key shapes", () => {
		expect(CacheKeys.orgConfig("org-1")).toBe("org:config:org-1");
		expect(CacheKeys.userPermissions("org-1", "u-1")).toBe("perms:org-1:u-1");
		expect(CacheTTL.MEDIUM).toBe(300);
	});
});
