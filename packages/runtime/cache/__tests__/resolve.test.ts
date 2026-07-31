import { errorIngress, errorProject } from "@afenda/errors";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
	createCacheManager,
	resetResolvedCacheBackend,
	resolveCacheBackend,
} from "../src/resolve";
import { toCacheFailure } from "../src/to-failure";

vi.mock("@afenda/env", () => ({
	env: {
		UPSTASH_REDIS_REST_URL: undefined,
		UPSTASH_REDIS_REST_TOKEN: undefined,
	},
	isProductionDeploymentNow: vi.fn(() => false),
}));

describe("resolveCacheBackend", () => {
	afterEach(() => {
		resetResolvedCacheBackend();
		vi.unstubAllEnvs();
	});

	it("uses L1-only when non-production and Upstash keys are missing", async () => {
		const { isProductionDeploymentNow } = await import("@afenda/env");
		vi.mocked(isProductionDeploymentNow).mockReturnValue(false);
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
		const { isProductionDeploymentNow } = await import("@afenda/env");
		vi.mocked(isProductionDeploymentNow).mockReturnValue(true);
		resetResolvedCacheBackend();

		const backend = resolveCacheBackend();
		expect(backend).toEqual({
			kind: "unavailable",
			service: "upstash_redis",
		});

		try {
			createCacheManager();
			throw new Error("expected cache composition to fail");
		} catch (caught) {
			expect(
				errorProject.result(
					errorIngress.unknown(caught, { operation: "cache.test" }),
				).code,
			).toBe("SERVICE_UNAVAILABLE");
		}

		const error = toCacheFailure({
			ok: false,
			reason: "unavailable",
			service: "upstash_redis",
		});
		expect(errorProject.result(error).code).toBe("SERVICE_UNAVAILABLE");
	});

	it("allows explicit L1 inject without process resolve", async () => {
		const { isProductionDeploymentNow } = await import("@afenda/env");
		vi.mocked(isProductionDeploymentNow).mockReturnValue(true);
		resetResolvedCacheBackend();

		const cache = createCacheManager({ backend: "l1" });
		await cache.set("ok", true);
		expect(await cache.get("ok")).toBe(true);
		expect(cache.hasL2).toBe(false);
	});

	it("applies TTL overrides without bypassing fail-closed production", async () => {
		const { isProductionDeploymentNow } = await import("@afenda/env");
		vi.mocked(isProductionDeploymentNow).mockReturnValue(true);
		resetResolvedCacheBackend();

		try {
			createCacheManager({ defaultTTL: 60 });
			throw new Error("expected cache composition to fail");
		} catch (caught) {
			expect(
				errorProject.result(
					errorIngress.unknown(caught, { operation: "cache.test" }),
				).code,
			).toBe("SERVICE_UNAVAILABLE");
		}

		vi.mocked(isProductionDeploymentNow).mockReturnValue(false);
		resetResolvedCacheBackend();
		const cache = createCacheManager({ defaultTTL: 60, backend: "l1" });
		await cache.set("k", "v");
		expect(await cache.get("k")).toBe("v");
	});
});
