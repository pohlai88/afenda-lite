import { errorProject } from "@afenda/errors";
import { afterEach, describe, expect, it, vi } from "vitest";

import { checkRateLimit, checkRateLimitWithStore } from "../src/check";
import { createMemoryRateLimitStore } from "../src/memory-store";
import { normalizeUpstashResult } from "../src/normalization";
import { rateLimitProject } from "../src/projection";
import {
	resetResolvedRateLimitBackend,
	resolveRateLimitBackend,
} from "../src/resolve-store";
import { keyFor, policyFor } from "../src/semantic-registry";
import type { RateLimitDecision, RateLimitStore } from "../src/types";

const envMocks = vi.hoisted(() => ({
	isProductionDeploymentNow: vi.fn(() => false),
	env: {
		UPSTASH_REDIS_REST_URL: undefined as string | undefined,
		UPSTASH_REDIS_REST_TOKEN: undefined as string | undefined,
	},
}));

vi.mock("@afenda/env", () => ({
	env: envMocks.env,
	isProductionDeploymentNow: () => envMocks.isProductionDeploymentNow(),
}));

function signInAttempts(
	store: RateLimitStore,
	count: number,
): Promise<RateLimitDecision[]> {
	return Promise.all(
		Array.from({ length: count }, () =>
			checkRateLimitWithStore(
				{
					bucket: "auth_sign_in",
					identity: {
						kind: "credentials",
						ipAddress: "203.0.113.10",
						email: " User@Example.Test ",
					},
				},
				store,
			),
		),
	);
}

describe("rateLimit semantic capability", () => {
	afterEach(() => {
		resetResolvedRateLimitBackend();
		envMocks.isProductionDeploymentNow.mockReturnValue(false);
		envMocks.env.UPSTASH_REDIS_REST_URL = undefined;
		envMocks.env.UPSTASH_REDIS_REST_TOKEN = undefined;
	});

	it("owns bucket-specific normalized key policy", () => {
		expect(
			keyFor({
				bucket: "auth_bff_post",
				identity: { ipAddress: " 203.0.113.5 ", pathname: " /API/Auth " },
			}),
		).toBe("203.0.113.5:/api/auth");
		expect(
			keyFor({
				bucket: "auth_sign_in",
				identity: {
					kind: "credentials",
					ipAddress: undefined,
					email: undefined,
				},
			}),
		).toBe("unknown:credentials:_invalid");
		expect(
			keyFor({
				bucket: "auth_sign_in",
				identity: {
					kind: "dev-login",
					ipAddress: "127.0.0.1",
					role: "operator",
				},
			}),
		).toBe("127.0.0.1:dev-login:operator");
	});

	it("returns opaque decisions and owner-derived quota/failure projections", async () => {
		const store = createMemoryRateLimitStore();
		const allowed = await signInAttempts(store, 5);
		for (const [index, decision] of allowed.entries()) {
			expect(decision).toEqual({ ok: true });
			expect(rateLimitProject.quota(decision)).toMatchObject({
				limit: 5,
				remaining: 4 - index,
			});
		}

		const denied = await signInAttempts(store, 1);
		const [decision] = denied;
		expect(decision).toEqual({ ok: false });
		if (!decision || decision.ok) {
			return;
		}
		expect(rateLimitProject.diagnostics(decision)).toEqual({
			outcome: "rate_limited",
		});
		expect(rateLimitProject.quota(decision)).toMatchObject({
			limit: 5,
			remaining: 0,
		});
		expect(
			errorProject.result(rateLimitProject.failure(decision)),
		).toMatchObject({
			code: "RATE_LIMITED",
			details: { retryAfterSeconds: 60 },
		});
	});

	it("bounds and normalizes hostile Upstash quota/timing values", () => {
		const nowMs = 1_700_000_000_000;
		const policy = policyFor("auth_sign_in");
		expect(
			normalizeUpstashResult(
				policy,
				{
					success: false,
					limit: 99_999,
					remaining: -500,
					reset: nowMs + 999_999_999,
				},
				nowMs,
			),
		).toEqual({
			allowed: false,
			quota: { limit: 5, remaining: 0, resetEpochMs: nowMs + 60_000 },
			retryAfterSeconds: 60,
		});
		expect(() =>
			normalizeUpstashResult(policy, { success: true }, nowMs),
		).toThrow(/Invalid Upstash rate-limit response/);
	});

	it("fails closed when production has no Upstash credentials", async () => {
		envMocks.isProductionDeploymentNow.mockReturnValue(true);
		resetResolvedRateLimitBackend();
		expect(resolveRateLimitBackend()).toEqual({
			kind: "unavailable",
			service: "upstash_redis",
		});

		const decision = await checkRateLimit({
			bucket: "auth_bff_post",
			identity: { ipAddress: "203.0.113.10", pathname: "/api/auth" },
		});
		expect(decision.ok).toBe(false);
		if (decision.ok) {
			return;
		}
		expect(rateLimitProject.diagnostics(decision)).toEqual({
			outcome: "unavailable",
			service: "upstash_redis",
		});
		expect(rateLimitProject.quota(decision)).toBeUndefined();
		expect(errorProject.result(rateLimitProject.failure(decision)).code).toBe(
			"SERVICE_UNAVAILABLE",
		);
	});
});
