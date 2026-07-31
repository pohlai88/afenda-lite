import { errorIngress, errorProject } from "@afenda/errors";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cache } from "../src";
import { type CacheTestingL2Store, cacheTesting } from "../src/testing";

function memoryL2(): CacheTestingL2Store & { store: Map<string, string> } {
	const store = new Map<string, string>();
	const tags = new Map<string, Set<string>>();
	return {
		store,
		get: (key) => Promise.resolve(store.get(key) ?? null),
		set: (key, value) => {
			store.set(key, value);
			return Promise.resolve();
		},
		delete: (key) => {
			store.delete(key);
			return Promise.resolve();
		},
		deleteMany: (keys) => {
			for (const key of keys) {
				store.delete(key);
			}
			return Promise.resolve();
		},
		addToTag: (tag, key) => {
			const values = tags.get(tag) ?? new Set();
			values.add(key);
			tags.set(tag, values);
			return Promise.resolve();
		},
		removeFromTag: (tag, key) => {
			tags.get(tag)?.delete(key);
			return Promise.resolve();
		},
		keysForTag: (tag) => Promise.resolve([...(tags.get(tag) ?? [])]),
		clearTag: (tag) => {
			tags.delete(tag);
			return Promise.resolve();
		},
		flushPrefix: () => {
			store.clear();
			tags.clear();
			return Promise.resolve();
		},
	};
}

vi.mock("@afenda/env", () => ({
	env: {
		UPSTASH_REDIS_REST_TOKEN: undefined,
		UPSTASH_REDIS_REST_URL: undefined,
	},
	isProductionDeploymentNow: vi.fn(() => false),
}));

describe("cache capability", () => {
	afterEach(() => cacheTesting.resetResolvedRuntime());

	it("uses canonical keys and package-selected TTL serialization", async () => {
		const l2 = memoryL2();
		const runtime = cacheTesting.create({ l2 });
		const key = cacheTesting.key.organizationConfig({
			organizationId: "org 1",
		});
		await runtime.set(key, { value: 1, omitted: undefined });
		expect(await runtime.get(key)).toEqual({ value: 1 });
		const [[storedKey, encoded]] = [...l2.store.entries()];
		expect(storedKey).toBe("organization_config:org%201");
		expect(JSON.parse(encoded ?? "")).toMatchObject({ data: { value: 1 } });
	});

	it("warms L1 from L2 and invalidates semantic organization scope", async () => {
		const l2 = memoryL2();
		const writer = cacheTesting.create({ l2 });
		const key = cacheTesting.key.userPermissions({
			organizationId: "org-1",
			userId: "u-1",
		});
		await writer.set(key, ["read"]);
		const reader = cacheTesting.create({ l2 });
		expect(await reader.get(key)).toEqual(["read"]);
		expect(reader.diagnostics()).toMatchObject({
			backend: "upstash",
			l2Hits: 1,
		});
		expect(await reader.invalidateTag("organization:org-1")).toBe(1);
		expect(await reader.get(key)).toBeNull();
	});

	it("supports cache-first and network-first fallback", async () => {
		const runtime = cacheTesting.create();
		const key = cacheTesting.key.permissionCatalog();
		const loader = vi.fn(async () => ["first"]);
		expect(await runtime.getOrLoad(key, loader)).toEqual(["first"]);
		expect(await runtime.getOrLoad(key, loader)).toEqual(["first"]);
		expect(loader).toHaveBeenCalledTimes(1);
		expect(
			await runtime.getOrLoad(key, () => Promise.reject(new Error("down")), {
				strategy: "network-first",
			}),
		).toEqual(["first"]);

		const loaderFailure = new Error("domain loader failed");
		const uncached = cacheTesting.key.userSession({ userId: "uncached" });
		await expect(
			runtime.getOrLoad(uncached, () => Promise.reject(loaderFailure)),
		).rejects.toBe(loaderFailure);
	});

	it("normalizes invalid serialization and production unavailability", async () => {
		try {
			cache.key.userSession({ userId: " " });
			throw new Error("expected invalid key failure");
		} catch (caught) {
			expect(
				errorProject.result(
					errorIngress.unknown(caught, { operation: "cache.test" }),
				).code,
			).toBe("VALIDATION_ERROR");
		}
		const key = cache.key.userSession({ userId: "u-1" });
		try {
			await cache.set(key, BigInt(1));
			throw new Error("expected validation failure");
		} catch (caught) {
			expect(
				errorProject.result(
					errorIngress.unknown(caught, { operation: "cache.test" }),
				).code,
			).toBe("VALIDATION_ERROR");
		}

		const { isProductionDeploymentNow } = await import("@afenda/env");
		vi.mocked(isProductionDeploymentNow).mockReturnValue(true);
		cacheTesting.resetResolvedRuntime();
		try {
			await cache.get(key);
			throw new Error("expected unavailable failure");
		} catch (caught) {
			expect(
				errorProject.result(
					errorIngress.unknown(caught, { operation: "cache.test" }),
				).code,
			).toBe("SERVICE_UNAVAILABLE");
		}
	});
});
