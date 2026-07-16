/**
 * N6 — Request-level composition: `apps/web/proxy.ts` forwards protected
 * navigations through `createSessionProxy` and surfaces `/auth/login`.
 * Auth-package `session-contract.test.ts` proves `createSessionProxy` binds
 * Neon middleware to `AUTH_LOGIN_PATH` and redirects unauthenticated requests.
 * Public `/auth/*` and `/join` stay outside the matcher (session-gate-policy).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionGateMock = vi.fn();

vi.mock("@afenda/auth", () => ({
	createSessionProxy: () => sessionGateMock,
	AUTH_LOGIN_PATH: "/auth/login",
}));

vi.mock("@afenda/env", () => ({
	env: {
		PLAYGROUND_ENABLED: false,
	},
}));

describe("N6 apps/web proxy request gate", () => {
	beforeEach(() => {
		vi.resetModules();
		sessionGateMock.mockReset();
	});

	it("request-level: unauthenticated protected path redirects via createSessionProxy to /auth/login", async () => {
		const { NextRequest, NextResponse } = await import("next/server");
		sessionGateMock.mockImplementation(async (request) => {
			return NextResponse.redirect(new URL("/auth/login", request.url));
		});

		const { proxy } = await import("../proxy");
		const response = await proxy(
			new NextRequest("https://afenda-lite.vercel.app/admin"),
		);

		expect(sessionGateMock).toHaveBeenCalledTimes(1);
		expect(response.status).toBeGreaterThanOrEqual(300);
		expect(response.status).toBeLessThan(400);
		expect(new URL(String(response.headers.get("location"))).pathname).toBe(
			"/auth/login",
		);
	});

	it("request-level: client public bypass does not invoke createSessionProxy", async () => {
		const { NextRequest } = await import("next/server");
		const { proxy } = await import("../proxy");
		const response = await proxy(
			new NextRequest("https://afenda-lite.vercel.app/client/login"),
		);

		expect(sessionGateMock).not.toHaveBeenCalled();
		expect(response.status).toBe(200);
		expect(response.headers.get("location")).toBeNull();
		expect(response.headers.get("x-middleware-next")).toBe("1");
	});
});
