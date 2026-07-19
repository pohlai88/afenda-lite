import { afterEach, describe, expect, it, vi } from "vitest";

import {
	createCacheManager,
	resetResolvedCacheBackend,
	resolveCacheBackend,
} from "../src/resolve";
import { toCacheAppError } from "../src/to-app-error";

vi.mock("@afenda/env", () => ({
	env: {
		UPSTASH_REDIS_REST_URL: undefined,
		UPSTASH_REDIS_REST_TOKEN: undefined,
	},
	isProductionDeployment: vi.fn(() => false),
}));

describe("resolveCacheBackend", () => {
	afterEach(() => {
		resetResolvedCacheBackend();
		vi.unstubAllEnvs();
	});

	it("uses L1-only when non-production and Upstash keys are missing", async () => {
		const { isProductionDeployment } = await import("@afenda/env");
		vi.mocked(isProductionDeployment).mockReturnValue(false);
		resetResolvedCacheBackend();

		const backend = resolveCacheBackend();
		expect(backend.kind).toBe("manager");
		if (backend.kind === "manager") {
			expect(backend.backend).toBe("l1");
			expect(backend.manager.hasL2).toBe(false);
			await backend.manager.set("local", 1);
			expect(await backend.manager.get("local")).toBe(1);
		}
	});

	it("fails closed when production has no Upstash keys", async () => {
		const { isProductionDeployment } = await import("@afenda/env");
		vi.mocked(isProductionDeployment).mockReturnValue(true);
		resetResolvedCacheBackend();

		const backend = resolveCacheBackend();
		expect(backend).toEqual({
			kind: "unavailable",
			service: "upstash_redis",
		});

		expect(() => createCacheManager()).toThrowError(
			expect.objectContaining({ code: "SERVICE_UNAVAILABLE" }),
		);

		const error = toCacheAppError({
			ok: false,
			reason: "unavailable",
			service: "upstash_redis",
		});
		expect(error.code).toBe("SERVICE_UNAVAILABLE");
		expect(error.details).toEqual({ service: "upstash_redis" });
	});

	it("allows explicit L1 inject without process resolve", async () => {
		const { isProductionDeployment } = await import("@afenda/env");
		vi.mocked(isProductionDeployment).mockReturnValue(true);
		resetResolvedCacheBackend();

		const cache = createCacheManager({ backend: "l1" });
		await cache.set("ok", true);
		expect(await cache.get("ok")).toBe(true);
		expect(cache.hasL2).toBe(false);
	});

	it("applies TTL overrides without bypassing fail-closed production", async () => {
		const { isProductionDeployment } = await import("@afenda/env");
		vi.mocked(isProductionDeployment).mockReturnValue(true);
		resetResolvedCacheBackend();

		expect(() => createCacheManager({ defaultTTL: 60 })).toThrowError(
			expect.objectContaining({ code: "SERVICE_UNAVAILABLE" }),
		);

		vi.mocked(isProductionDeployment).mockReturnValue(false);
		resetResolvedCacheBackend();
		const cache = createCacheManager({ defaultTTL: 60, backend: "l1" });
		await cache.set("k", "v");
		expect(await cache.get("k")).toBe("v");
	});
});
