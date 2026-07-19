import { beforeEach, describe, expect, it, vi } from "vitest";

const getHandlerMock = vi.fn();
const handlerGet = vi.fn();
const handlerPost = vi.fn();

const rateLimitMocks = vi.hoisted(() => ({
	checkRateLimit: vi.fn(),
}));

vi.mock("@neondatabase/auth/next/server", () => ({
	createNeonAuth: () => ({
		getSession: vi.fn(),
		handler: () => getHandlerMock(),
		organization: {
			getActiveMemberRole: vi.fn(),
		},
		middleware: vi.fn(),
	}),
}));

vi.mock("@afenda/env", () => ({
	env: {
		NEON_AUTH_BASE_URL: "https://auth.example.test",
		NEON_AUTH_COOKIE_SECRET: "x".repeat(32),
		DATABASE_URL: "postgresql://u:p@ep-x-pooler.example/db?sslmode=require",
		APP_URL: "https://www.nexuscanon.com",
	},
	isProductionDeployment: () => false,
}));

vi.mock("@afenda/rate-limit", async () => {
	const actual =
		await vi.importActual<typeof import("@afenda/rate-limit")>(
			"@afenda/rate-limit",
		);
	return {
		...actual,
		checkRateLimit: rateLimitMocks.checkRateLimit,
	};
});

const APP_ORIGIN = "https://www.nexuscanon.com";
const CORRELATION_ID = "11111111-1111-4111-8111-111111111111";

function authRequest(method: "GET" | "POST", headers?: HeadersInit): Request {
	return new Request(`${APP_ORIGIN}/api/auth/get-session`, {
		method,
		headers,
	});
}

describe("createAuthApiHandlers (PL-S7 BFF)", () => {
	beforeEach(() => {
		vi.resetModules();
		getHandlerMock.mockReset();
		handlerGet.mockReset();
		handlerPost.mockReset();
		rateLimitMocks.checkRateLimit.mockReset();
		rateLimitMocks.checkRateLimit.mockResolvedValue({
			ok: true,
			quota: {
				limit: 20,
				remaining: 19,
				resetEpochMs: Date.now() + 60_000,
			},
		});
		getHandlerMock.mockReturnValue({
			GET: handlerGet,
			POST: handlerPost,
		});
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
				status: 200,
				headers: {
					"set-cookie": "session_data=abc; Path=/; HttpOnly",
					"content-type": "application/json",
				},
			}),
		);

		const { AUTH_BFF_CORRELATION_HEADER, createAuthApiHandlers } = await import(
			"../src/api-handler"
		);
		const { GET } = createAuthApiHandlers();
		const response = await GET(
			authRequest("GET", {
				[AUTH_BFF_CORRELATION_HEADER]: CORRELATION_ID,
			}),
			{},
		);

		expect(handlerGet).toHaveBeenCalledTimes(1);
		expect(response.status).toBe(200);
		expect(response.headers.get(AUTH_BFF_CORRELATION_HEADER)).toBe(
			CORRELATION_ID,
		);
		expect(response.headers.get("set-cookie")).toBe(
			"session_data=abc; Path=/; HttpOnly",
		);
		await expect(response.json()).resolves.toEqual({ ok: true });
	});

	it("rejects POST from untrusted Origin with safe 403", async () => {
		const { AUTH_BFF_CORRELATION_HEADER, createAuthApiHandlers } = await import(
			"../src/api-handler"
		);
		const { POST } = createAuthApiHandlers();
		const response = await POST(
			authRequest("POST", {
				Origin: "https://evil.example",
				[AUTH_BFF_CORRELATION_HEADER]: CORRELATION_ID,
			}),
			{},
		);

		expect(handlerPost).not.toHaveBeenCalled();
		expect(response.status).toBe(403);
		expect(response.headers.get(AUTH_BFF_CORRELATION_HEADER)).toBe(
			CORRELATION_ID,
		);
		expect(await response.text()).toBe("");
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
		vi.stubEnv("VERCEL_ENV", "");

		const { createAuthApiHandlers } = await import("../src/api-handler");
		const { POST } = createAuthApiHandlers();
		const response = await POST(
			authRequest("POST", { Origin: "http://localhost:3000" }),
			{},
		);

		expect(handlerPost).toHaveBeenCalledTimes(1);
		expect(response.status).toBe(204);
		vi.unstubAllEnvs();
	});

	it("rejects POST from loopback Origin on Vercel production", async () => {
		vi.stubEnv("VERCEL_ENV", "production");

		const { AUTH_BFF_CORRELATION_HEADER, createAuthApiHandlers } = await import(
			"../src/api-handler"
		);
		const { POST } = createAuthApiHandlers();
		const response = await POST(
			authRequest("POST", {
				Origin: "http://localhost:3000",
				[AUTH_BFF_CORRELATION_HEADER]: CORRELATION_ID,
			}),
			{},
		);

		expect(handlerPost).not.toHaveBeenCalled();
		expect(response.status).toBe(403);
		vi.unstubAllEnvs();
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
		rateLimitMocks.checkRateLimit.mockResolvedValue({
			ok: false,
			reason: "rate_limited",
			retryAfterSeconds: 42,
			quota: { limit: 20, remaining: 0, resetEpochMs },
		});
		const chunks: string[] = [];
		const writeSpy = vi
			.spyOn(process.stdout, "write")
			.mockImplementation((chunk) => {
				chunks.push(String(chunk));
				return true;
			});

		const { AUTH_BFF_CORRELATION_HEADER, createAuthApiHandlers } = await import(
			"../src/api-handler"
		);
		const { POST } = createAuthApiHandlers();
		const response = await POST(
			authRequest("POST", {
				Origin: APP_ORIGIN,
				"x-forwarded-for": "203.0.113.10",
				[AUTH_BFF_CORRELATION_HEADER]: CORRELATION_ID,
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
			/^auth_bff;dur=\d+(\.\d)?$/,
		);
		expect(response.headers.get(AUTH_BFF_CORRELATION_HEADER)).toBe(
			CORRELATION_ID,
		);
		await expect(response.json()).resolves.toEqual({
			error: {
				code: "RATE_LIMITED",
				message: "Too many requests. Try again later.",
				details: { retryAfter: 42 },
			},
		});
		const logged =
			chunks.find((c) => c.includes("auth_bff.rate_limited")) ?? "";
		expect(logged).toContain("auth_bff.rate_limited");
		expect(logged).toContain(CORRELATION_ID);
		expect(logged).toContain("RATE_LIMITED");
		writeSpy.mockRestore();
	});

	it("returns safe empty 500 when the provider throws", async () => {
		handlerGet.mockRejectedValue(new Error("upstream secret token leak"));
		const chunks: string[] = [];
		const writeSpy = vi
			.spyOn(process.stdout, "write")
			.mockImplementation((chunk) => {
				chunks.push(String(chunk));
				return true;
			});

		const { AUTH_BFF_CORRELATION_HEADER, createAuthApiHandlers } = await import(
			"../src/api-handler"
		);
		const { GET } = createAuthApiHandlers();
		const response = await GET(
			authRequest("GET", {
				[AUTH_BFF_CORRELATION_HEADER]: CORRELATION_ID,
			}),
			{},
		);

		expect(response.status).toBe(500);
		expect(await response.text()).toBe("");
		expect(response.headers.get(AUTH_BFF_CORRELATION_HEADER)).toBe(
			CORRELATION_ID,
		);

		const logged =
			chunks.find((c) => c.includes("auth_bff.unexpected_error")) ?? "";
		expect(logged).toContain("auth_bff.unexpected_error");
		expect(logged).toContain(CORRELATION_ID);
		expect(logged).not.toContain("secret");
		expect(logged).not.toContain("token leak");
		writeSpy.mockRestore();
	});
});

describe("auth BFF helpers (PL-S7)", () => {
	it("redacts authorization, cookie, set-cookie, and secret/token headers", async () => {
		const { redactAuthHeaderValue } = await import("../src/api-handler");
		expect(redactAuthHeaderValue("Authorization", "Bearer abc")).toBe(
			"[redacted]",
		);
		expect(redactAuthHeaderValue("Cookie", "session=1")).toBe("[redacted]");
		expect(
			redactAuthHeaderValue("Set-Cookie", "session_data=abc; Path=/"),
		).toBe("[redacted]");
		expect(redactAuthHeaderValue("X-Auth-Token", "xyz")).toBe("[redacted]");
		expect(redactAuthHeaderValue("X-Cookie-Secret", "s")).toBe("[redacted]");
		expect(redactAuthHeaderValue("Content-Type", "application/json")).toBe(
			"application/json",
		);
	});

	it("resolves inbound UUID correlation or mints a new one", async () => {
		const { resolveAuthBffCorrelationId } = await import("../src/api-handler");
		expect(resolveAuthBffCorrelationId(CORRELATION_ID)).toBe(CORRELATION_ID);
		const minted = resolveAuthBffCorrelationId("not-a-uuid");
		expect(minted).not.toBe("not-a-uuid");
		expect(minted).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
		);
	});
});
