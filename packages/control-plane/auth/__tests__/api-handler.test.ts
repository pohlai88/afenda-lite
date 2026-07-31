import { errorProject, errorResult } from "@afenda/errors";
import { http } from "@afenda/http";
import { rateLimitTesting } from "@afenda/rate-limit/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getHandlerMock = vi.fn();
const handlerGet = vi.fn();
const handlerPost = vi.fn();

const rateLimitMocks = vi.hoisted(() => ({
	check: vi.fn(),
}));

const envMocks = vi.hoisted(() => ({
	isProductionDeploymentNow: vi.fn(() => false),
}));

vi.mock("@neondatabase/auth/next/server", () => ({
	createNeonAuth: () => ({
		getSession: vi.fn(),
		handler: () => getHandlerMock(),
		middleware: vi.fn(),
		organization: {
			getActiveMemberRole: vi.fn(),
		},
	}),
}));

vi.mock("@afenda/env", () => ({
	env: {
		APP_URL: "https://www.nexuscanon.com",
		DATABASE_URL: "postgresql://u:p@ep-x-pooler.example/db?sslmode=require",
		NEON_AUTH_BASE_URL: "https://auth.example.test",
		NEON_AUTH_COOKIE_SECRET: "x".repeat(32),
	},
	isProductionDeploymentNow: envMocks.isProductionDeploymentNow,
}));

vi.mock("@afenda/rate-limit", async () => {
	const actual =
		await vi.importActual<typeof import("@afenda/rate-limit")>(
			"@afenda/rate-limit",
		);
	return {
		...actual,
		rateLimit: { ...actual.rateLimit, check: rateLimitMocks.check },
	};
});

const APP_ORIGIN = "https://www.nexuscanon.com";
const CORRELATION_ID = "11111111-1111-4111-8111-111111111111";
const SERVER_TIMING_PATTERN = /^auth_bff;dur=\d+(\.\d)?$/;

function authRequest(method: "GET" | "POST", headers?: HeadersInit): Request {
	return new Request(`${APP_ORIGIN}/api/auth/get-session`, {
		headers,
		method,
	});
}

describe("createAuthApiHandlers (PL-S7 BFF)", () => {
	beforeEach(() => {
		getHandlerMock.mockReset();
		handlerGet.mockReset();
		handlerPost.mockReset();
		rateLimitMocks.check.mockReset();
		rateLimitMocks.check.mockResolvedValue(
			rateLimitTesting.decision.allowed({
				limit: 20,
				remaining: 19,
				resetEpochMs: Date.now() + 60_000,
			}),
		);
		getHandlerMock.mockReturnValue({
			GET: handlerGet,
			POST: handlerPost,
		});
		envMocks.isProductionDeploymentNow.mockReturnValue(false);
	});

	it("exports only GET and POST package-sourced wrappers", async () => {
		const { createAuthApiHandlers } = await import("../src/api-handler");
		const handlers = createAuthApiHandlers();
		expect(getHandlerMock).toHaveBeenCalledTimes(1);
		expect(Object.keys(handlers).sort()).toEqual(["GET", "POST"]);
		expect(handlers.GET).not.toBe(handlerGet);
		expect(handlers.POST).not.toBe(handlerPost);
		expect(typeof handlers.GET).toBe("function");
		expect(typeof handlers.POST).toBe("function");
	});

	it("stamps x-correlation-id and preserves provider Set-Cookie", async () => {
		handlerGet.mockResolvedValue(
			new Response(JSON.stringify({ ok: true }), {
				headers: {
					"content-type": "application/json",
					"set-cookie": "session_data=abc; Path=/; HttpOnly",
				},
				status: 200,
			}),
		);

		const { createAuthApiHandlers } = await import("../src/api-handler");
		const { GET } = createAuthApiHandlers();
		const response = await GET(
			authRequest("GET", {
				[http.correlation.header]: CORRELATION_ID,
			}),
			{},
		);

		expect(handlerGet).toHaveBeenCalledTimes(1);
		expect(response.status).toBe(200);
		expect(response.headers.get(http.correlation.header)).toBe(CORRELATION_ID);
		expect(response.headers.get("set-cookie")).toBe(
			"session_data=abc; Path=/; HttpOnly",
		);
		await expect(response.json()).resolves.toEqual({ ok: true });
	});

	it("rejects POST from untrusted Origin with safe 403", async () => {
		const { createAuthApiHandlers } = await import("../src/api-handler");
		const { POST } = createAuthApiHandlers();
		const response = await POST(
			authRequest("POST", {
				Origin: "https://evil.example",
				[http.correlation.header]: CORRELATION_ID,
			}),
			{},
		);

		expect(handlerPost).not.toHaveBeenCalled();
		expect(response.status).toBe(403);
		expect(response.headers.get(http.correlation.header)).toBe(CORRELATION_ID);
		await expect(response.json()).resolves.toEqual(
			errorProject.http(errorResult.fail("FORBIDDEN")).body,
		);
	});

	it("allows POST when Origin matches APP_URL", async () => {
		handlerPost.mockResolvedValue(new Response(null, { status: 204 }));

		const { createAuthApiHandlers } = await import("../src/api-handler");
		const { POST } = createAuthApiHandlers();
		const response = await POST(
			authRequest("POST", { Origin: APP_ORIGIN }),
			{},
		);

		expect(handlerPost).toHaveBeenCalledTimes(1);
		expect(response.status).toBe(204);
	});

	it("allows POST from loopback Origin when not Vercel production", async () => {
		handlerPost.mockResolvedValue(new Response(null, { status: 204 }));

		const { createAuthApiHandlers } = await import("../src/api-handler");
		const { POST } = createAuthApiHandlers();
		const response = await POST(
			authRequest("POST", { Origin: "http://localhost:3000" }),
			{},
		);

		expect(handlerPost).toHaveBeenCalledTimes(1);
		expect(response.status).toBe(204);
	});

	it("rejects POST from loopback Origin on Vercel production", async () => {
		envMocks.isProductionDeploymentNow.mockReturnValue(true);

		const { createAuthApiHandlers } = await import("../src/api-handler");
		const { POST } = createAuthApiHandlers();
		const response = await POST(
			authRequest("POST", {
				Origin: "http://localhost:3000",
				[http.correlation.header]: CORRELATION_ID,
			}),
			{},
		);

		expect(handlerPost).not.toHaveBeenCalled();
		expect(response.status).toBe(403);
	});

	it("allows POST without Origin when Host matches APP_URL", async () => {
		handlerPost.mockResolvedValue(new Response(null, { status: 204 }));

		const { createAuthApiHandlers } = await import("../src/api-handler");
		const { POST } = createAuthApiHandlers();
		const response = await POST(
			authRequest("POST", { Host: "www.nexuscanon.com" }),
			{},
		);

		expect(handlerPost).toHaveBeenCalledTimes(1);
		expect(response.status).toBe(204);
	});

	it("returns RATE_LIMITED 429 with Retry-After and correlation on over-limit POST", async () => {
		const resetEpochMs = 1_700_000_042_000;
		rateLimitMocks.check.mockResolvedValue(
			rateLimitTesting.decision.rateLimited({
				quota: { limit: 20, remaining: 0, resetEpochMs },
				retryAfterSeconds: 42,
			}),
		);
		const { createAuthApiHandlers } = await import("../src/api-handler");
		const { POST } = createAuthApiHandlers();
		const response = await POST(
			authRequest("POST", {
				Origin: APP_ORIGIN,
				"x-forwarded-for": "203.0.113.10",
				[http.correlation.header]: CORRELATION_ID,
			}),
			{},
		);

		expect(handlerPost).not.toHaveBeenCalled();
		expect(response.status).toBe(429);
		expect(response.headers.get("Retry-After")).toBe("42");
		expect(response.headers.get("X-RateLimit-Limit")).toBe("20");
		expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
		expect(response.headers.get("X-RateLimit-Reset")).toBe("1700000042");
		expect(response.headers.get("Server-Timing")).toMatch(
			SERVER_TIMING_PATTERN,
		);
		expect(response.headers.get(http.correlation.header)).toBe(CORRELATION_ID);
		await expect(response.json()).resolves.toMatchObject(
			errorProject.http(errorResult.fail("RATE_LIMITED")).body,
		);
	});

	it("returns safe empty 500 when the provider throws", async () => {
		handlerGet.mockRejectedValue(new Error("upstream secret token leak"));

		const { createAuthApiHandlers } = await import("../src/api-handler");
		const { GET } = createAuthApiHandlers();
		const response = await GET(
			authRequest("GET", {
				[http.correlation.header]: CORRELATION_ID,
			}),
			{},
		);

		expect(response.status).toBe(500);
		const body = await response.json();
		expect(body).toMatchObject(
			errorProject.http(errorResult.fail("INTERNAL_ERROR")).body,
		);
		expect(response.headers.get(http.correlation.header)).toBe(CORRELATION_ID);

		expect(JSON.stringify(body)).not.toContain("secret");
	});
});
