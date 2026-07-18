/**
 * N6 — Request-level composition: `apps/web/proxy.ts` forwards protected
 * navigations through `createSessionProxy` and surfaces `AUTH_LOGIN_PATH`.
 * Auth-package `session-contract.test.ts` proves `createSessionProxy` binds
 * Neon middleware to `AUTH_LOGIN_PATH` and redirects unauthenticated requests.
 * Public `/auth/*` and `/join` stay outside the matcher (session-gate-policy).
 */

import { AUTH_LOGIN_PATH } from "@afenda/auth/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CLIENT_GATE_PATHS } from "../features/auth/client-paths";

const sessionGateMock = vi.fn();

vi.mock("@afenda/auth", () => ({
	createSessionProxy: () => sessionGateMock,
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

	it("request-level: unauthenticated protected path redirects via createSessionProxy to AUTH_LOGIN_PATH", async () => {
		const { NextRequest, NextResponse } = await import("next/server");
		sessionGateMock.mockImplementation(async (request) => {
			return NextResponse.redirect(new URL(AUTH_LOGIN_PATH, request.url));
		});

		const { proxy } = await import("../proxy");
		for (const protectedPath of [
			"/admin",
			"/fft",
			"/client/declarations",
		] as const) {
			sessionGateMock.mockClear();
			const response = await proxy(
				new NextRequest(`https://afenda-lite.vercel.app${protectedPath}`),
			);

			expect(sessionGateMock).toHaveBeenCalledTimes(1);
			expect(response.status).toBeGreaterThanOrEqual(300);
			expect(response.status).toBeLessThan(400);
			expect(new URL(String(response.headers.get("location"))).pathname).toBe(
				AUTH_LOGIN_PATH,
			);
		}
	});

	it("request-level: CLIENT_GATE_PATHS bypass does not invoke createSessionProxy", async () => {
		const { NextRequest } = await import("next/server");
		const { proxy } = await import("../proxy");

		for (const gatePath of CLIENT_GATE_PATHS) {
			sessionGateMock.mockClear();
			const response = await proxy(
				new NextRequest(`https://afenda-lite.vercel.app${gatePath}`),
			);

			expect(sessionGateMock).not.toHaveBeenCalled();
			expect(response.status).toBe(200);
			expect(response.headers.get("location")).toBeNull();
			expect(response.headers.get("x-middleware-next")).toBe("1");
		}
	});

	it("request-level: Pre-Login API bypass does not invoke createSessionProxy", async () => {
		const { NextRequest } = await import("next/server");
		const { proxy } = await import("../proxy");

		for (const apiPath of [
			"/api/health/liveness",
			"/api/health/readiness",
			"/api/auth/get-session",
		] as const) {
			sessionGateMock.mockClear();
			const response = await proxy(
				new NextRequest(`https://afenda-lite.vercel.app${apiPath}`),
			);

			expect(sessionGateMock).not.toHaveBeenCalled();
			expect(response.status).toBe(200);
			expect(response.headers.get("location")).toBeNull();
			expect(response.headers.get("x-middleware-next")).toBe("1");
		}
	});
});
