import { afterEach, describe, expect, it, vi } from "vitest";

import { checkRateLimit } from "../src/check";
import { createMemoryRateLimitStore } from "../src/memory-store";
import {
	resetResolvedRateLimitBackend,
	resolveRateLimitBackend,
} from "../src/resolve-store";
import { toRateLimitAppError } from "../src/to-app-error";

vi.mock("@afenda/env", () => ({
	env: {
		UPSTASH_REDIS_REST_URL: undefined,
		UPSTASH_REDIS_REST_TOKEN: undefined,
	},
	isProductionDeployment: vi.fn(() => false),
}));

describe("checkRateLimit (memory store)", () => {
	afterEach(() => {
		resetResolvedRateLimitBackend();
		vi.unstubAllEnvs();
	});

	it("allows then denies within the same window", async () => {
		const store = createMemoryRateLimitStore();
		const key = `user-${crypto.randomUUID()}@example.test`;

		for (let i = 0; i < 5; i += 1) {
			const allowed = await checkRateLimit(
				{ bucket: "auth_sign_in", key },
				{ store },
			);
			expect(allowed).toEqual({ ok: true });
		}

		const denied = await checkRateLimit(
			{ bucket: "auth_sign_in", key },
			{ store },
		);
		expect(denied.ok).toBe(false);
		if (!denied.ok) {
			expect(denied.reason).toBe("rate_limited");
			if (denied.reason === "rate_limited") {
				expect(denied.retryAfterSeconds).toBeGreaterThanOrEqual(1);
			}
		}
	});

	it("isolates keys and buckets", async () => {
		const store = createMemoryRateLimitStore();
		const a = await checkRateLimit(
			{ bucket: "auth_sign_in", key: "a@example.test" },
			{ store },
		);
		const b = await checkRateLimit(
			{ bucket: "auth_bff_post", key: "a@example.test" },
			{ store },
		);
		expect(a).toEqual({ ok: true });
		expect(b).toEqual({ ok: true });
	});

	it("rate-limits empty keys", async () => {
		const result = await checkRateLimit({
			bucket: "auth_bff_post",
			key: "   ",
		});
		expect(result).toEqual({
			ok: false,
			reason: "rate_limited",
			retryAfterSeconds: 60,
		});
	});

	it("fails closed when production has no Upstash keys", async () => {
		const { isProductionDeployment } = await import("@afenda/env");
		vi.mocked(isProductionDeployment).mockReturnValue(true);
		resetResolvedRateLimitBackend();

		const backend = resolveRateLimitBackend();
		expect(backend).toEqual({
			kind: "unavailable",
			service: "upstash_redis",
		});

		const result = await checkRateLimit({
			bucket: "auth_bff_post",
			key: "203.0.113.10:/api/auth/sign-in",
		});
		expect(result).toEqual({
			ok: false,
			reason: "unavailable",
			service: "upstash_redis",
		});
	});

	it("fails closed when the resolved store throws", async () => {
		const { isProductionDeployment } = await import("@afenda/env");
		vi.mocked(isProductionDeployment).mockReturnValue(false);
		resetResolvedRateLimitBackend();

		const backend = resolveRateLimitBackend();
		expect(backend.kind).toBe("store");
		if (backend.kind !== "store") {
			return;
		}

		vi.spyOn(backend.store, "hit").mockRejectedValueOnce(
			new Error("upstash network down"),
		);

		const result = await checkRateLimit({
			bucket: "auth_bff_post",
			key: "203.0.113.10:/api/auth/sign-in",
		});
		expect(result).toEqual({
			ok: false,
			reason: "unavailable",
			service: "upstash_redis",
		});
	});
});

describe("toRateLimitAppError", () => {
	it("maps rate_limited and unavailable to AppError codes", () => {
		const limited = toRateLimitAppError({
			ok: false,
			reason: "rate_limited",
			retryAfterSeconds: 9,
		});
		expect(limited.code).toBe("RATE_LIMITED");
		expect(limited.details).toEqual({ retryAfter: 9 });

		const unavailable = toRateLimitAppError({
			ok: false,
			reason: "unavailable",
			service: "upstash_redis",
		});
		expect(unavailable.code).toBe("SERVICE_UNAVAILABLE");
		expect(unavailable.details).toEqual({ service: "upstash_redis" });
	});
});
