import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const getActiveMemberRoleMock = vi.fn();
const listOrganizationsMock = vi.fn();
const setActiveOrganizationMock = vi.fn();
const middlewareMock = vi.fn();
const redirectMock = vi.fn((url: string) => {
	throw new Error(`NEXT_REDIRECT:${url}`);
});
const mockedEnv = vi.hoisted(() => ({
	NEON_AUTH_BASE_URL: "https://auth.example.test",
	NEON_AUTH_COOKIE_SECRET: "x".repeat(32),
	DATABASE_URL: "postgresql://u:p@ep-x-pooler.example/db?sslmode=require",
	APP_URL: "https://www.nexuscanon.com",
	PORTAL_ORGANIZATION_ID: undefined as string | undefined,
	PORTAL_ORG_SLUG: undefined as string | undefined,
}));

vi.mock("next/navigation", () => ({
	redirect: (url: string) => redirectMock(url),
}));

vi.mock("next/headers", () => ({
	headers: async () =>
		new Headers({
			"x-afenda-pathname": "",
		}),
}));

vi.mock("@neondatabase/auth/next/server", () => ({
	createNeonAuth: () => ({
		getSession: (...args: unknown[]) => getSessionMock(...args),
		organization: {
			getActiveMemberRole: (...args: unknown[]) =>
				getActiveMemberRoleMock(...args),
			list: (...args: unknown[]) => listOrganizationsMock(...args),
			setActive: (...args: unknown[]) => setActiveOrganizationMock(...args),
		},
		middleware: (...args: unknown[]) => middlewareMock(...args),
	}),
}));

vi.mock("@afenda/env", () => ({
	env: mockedEnv,
}));

function neonSession(partial?: {
	userId?: string;
	email?: string | null;
	activeOrganizationId?: string | null;
}) {
	return {
		data: {
			user: {
				id: partial?.userId ?? "user-1",
				email:
					partial && "email" in partial ? partial.email : "User@Example.COM",
			},
			session: {
				activeOrganizationId:
					partial && "activeOrganizationId" in partial
						? partial.activeOrganizationId
						: "org-1",
			},
		},
		error: null,
	};
}

describe("N6/N8 session contract", () => {
	beforeEach(() => {
		vi.resetModules();
		getSessionMock.mockReset();
		getActiveMemberRoleMock.mockReset();
		listOrganizationsMock.mockReset();
		setActiveOrganizationMock.mockReset();
		middlewareMock.mockReset();
		redirectMock.mockClear();
		mockedEnv.PORTAL_ORGANIZATION_ID = undefined;
		mockedEnv.PORTAL_ORG_SLUG = undefined;
		getActiveMemberRoleMock.mockResolvedValue({
			data: { role: "member" },
			error: null,
		});
		listOrganizationsMock.mockResolvedValue({
			data: [],
			error: null,
		});
		setActiveOrganizationMock.mockResolvedValue({
			data: null,
			error: null,
		});
	});

	describe("getApiSession", () => {
		it("returns typed ApiSession when authenticated with org, email, and role", async () => {
			getSessionMock.mockResolvedValue(neonSession());
			const { getApiSession } = await import("../src/session");
			await expect(getApiSession()).resolves.toEqual({
				userId: "user-1",
				orgId: "org-1",
				role: "client",
				email: "user@example.com",
			});
		});

		it("returns null when unauthenticated", async () => {
			getSessionMock.mockResolvedValue({
				data: null,
				error: { message: "no session" },
			});
			const { getApiSession } = await import("../src/session");
			await expect(getApiSession()).resolves.toBeNull();
		});

		it("returns null when active organization is missing and unresolvable", async () => {
			getSessionMock.mockResolvedValue(
				neonSession({ activeOrganizationId: null }),
			);
			const { getApiSession } = await import("../src/session");
			await expect(getApiSession()).resolves.toBeNull();
			expect(setActiveOrganizationMock).not.toHaveBeenCalled();
		});

		it("returns null when active organization is empty and unresolvable", async () => {
			getSessionMock.mockResolvedValue(
				neonSession({ activeOrganizationId: "" }),
			);
			const { getApiSession } = await import("../src/session");
			await expect(getApiSession()).resolves.toBeNull();
			expect(setActiveOrganizationMock).not.toHaveBeenCalled();
		});

		it("does not call setActive from RSC when a sole membership is resolvable", async () => {
			getSessionMock.mockResolvedValue(
				neonSession({ activeOrganizationId: null }),
			);
			listOrganizationsMock.mockResolvedValue({
				data: [{ id: "org-sole", slug: "sole-org", name: "Sole Org" }],
				error: null,
			});
			const { getApiSession } = await import("../src/session");
			await expect(getApiSession()).resolves.toBeNull();
			expect(listOrganizationsMock).toHaveBeenCalled();
			expect(setActiveOrganizationMock).not.toHaveBeenCalled();
		});

		it("does not resolve organizations when the active member organization exists", async () => {
			getSessionMock.mockResolvedValue(neonSession());
			const { getApiSession } = await import("../src/session");
			await getApiSession();
			expect(listOrganizationsMock).not.toHaveBeenCalled();
			expect(setActiveOrganizationMock).not.toHaveBeenCalled();
		});

		it("returns null when email is missing", async () => {
			getSessionMock.mockResolvedValue(neonSession({ email: null }));
			const { getApiSession } = await import("../src/session");
			await expect(getApiSession()).resolves.toBeNull();
		});

		it("returns null when email is blank", async () => {
			getSessionMock.mockResolvedValue(neonSession({ email: "   " }));
			const { getApiSession } = await import("../src/session");
			await expect(getApiSession()).resolves.toBeNull();
		});

		it("returns null when membership role is missing", async () => {
			getSessionMock.mockResolvedValue(neonSession());
			getActiveMemberRoleMock.mockResolvedValue({
				data: null,
				error: { message: "no role" },
			});
			const { getApiSession } = await import("../src/session");
			await expect(getApiSession()).resolves.toBeNull();
		});

		it("returns null when Neon membership role is unknown", async () => {
			getSessionMock.mockResolvedValue(neonSession());
			getActiveMemberRoleMock.mockResolvedValue({
				data: { role: "superuser" },
				error: null,
			});
			const { getApiSession } = await import("../src/session");
			await expect(getApiSession()).resolves.toBeNull();
		});
	});

	describe("getAuthBootstrap", () => {
		it("returns ready when the session already has an active org", async () => {
			getSessionMock.mockResolvedValue(neonSession());
			const { getAuthBootstrap } = await import("../src/session");
			await expect(getAuthBootstrap("/")).resolves.toEqual({
				state: "ready",
				session: {
					userId: "user-1",
					orgId: "org-1",
					role: "client",
					email: "user@example.com",
				},
			});
		});

		it("returns ensure_active_org for a sole membership without writing cookies", async () => {
			getSessionMock.mockResolvedValue(
				neonSession({ activeOrganizationId: null }),
			);
			listOrganizationsMock.mockResolvedValue({
				data: [{ id: "org-sole", slug: "sole-org", name: "Sole Org" }],
				error: null,
			});
			const { getAuthBootstrap } = await import("../src/session");
			const { ENSURE_ACTIVE_ORGANIZATION_PATH } = await import(
				"../src/ensure-active-organization"
			);
			await expect(getAuthBootstrap("/admin")).resolves.toEqual({
				state: "ensure_active_org",
				url: `${ENSURE_ACTIVE_ORGANIZATION_PATH}?next=${encodeURIComponent("/admin")}`,
			});
			expect(setActiveOrganizationMock).not.toHaveBeenCalled();
		});

		it("returns ensure_active_org for an allowlisted membership among many", async () => {
			mockedEnv.PORTAL_ORGANIZATION_ID = "org-allowed";
			getSessionMock.mockResolvedValue(
				neonSession({ activeOrganizationId: null }),
			);
			listOrganizationsMock.mockResolvedValue({
				data: [
					{ id: "org-other", slug: "other", name: "Other" },
					{ id: "org-allowed", slug: "allowed", name: "Allowed" },
				],
				error: null,
			});
			const { getAuthBootstrap } = await import("../src/session");
			await expect(getAuthBootstrap()).resolves.toMatchObject({
				state: "ensure_active_org",
			});
		});

		it("returns unresolved_organization when multi-membership has no allowlist match", async () => {
			mockedEnv.PORTAL_ORGANIZATION_ID = "org-not-a-member";
			getSessionMock.mockResolvedValue(
				neonSession({ activeOrganizationId: null }),
			);
			listOrganizationsMock.mockResolvedValue({
				data: [
					{ id: "org-1", slug: "one", name: "One" },
					{ id: "org-2", slug: "two", name: "Two" },
				],
				error: null,
			});
			const { getAuthBootstrap } = await import("../src/session");
			await expect(getAuthBootstrap()).resolves.toEqual({
				state: "unresolved_organization",
				reason: "missing_org",
			});
			expect(setActiveOrganizationMock).not.toHaveBeenCalled();
		});

		it("returns unresolved_organization when signed-in with zero memberships", async () => {
			getSessionMock.mockResolvedValue(
				neonSession({ activeOrganizationId: null }),
			);
			listOrganizationsMock.mockResolvedValue({
				data: [],
				error: null,
			});
			const { getAuthBootstrap } = await import("../src/session");
			await expect(getAuthBootstrap()).resolves.toEqual({
				state: "unresolved_organization",
				reason: "missing_org",
			});
		});

		it("returns sync_cookies when Neon getSession attempts RSC cookie writes", async () => {
			getSessionMock.mockRejectedValue(
				new Error(
					"Cookies can only be modified in a Server Action or Route Handler. Read more: https://nextjs.org/docs",
				),
			);
			const { getAuthBootstrap } = await import("../src/session");
			const { SYNC_SESSION_COOKIES_PATH } = await import(
				"../src/sync-session-cookies"
			);
			await expect(getAuthBootstrap("/")).resolves.toEqual({
				state: "sync_cookies",
				url: `${SYNC_SESSION_COOKIES_PATH}?next=${encodeURIComponent("/")}`,
			});
		});
	});

	describe("getSession", () => {
		it("returns typed Session without inventing fields when complete", async () => {
			getSessionMock.mockResolvedValue(neonSession());
			const { getSession } = await import("../src/session");
			await expect(getSession()).resolves.toEqual({
				userId: "user-1",
				orgId: "org-1",
				role: "client",
			});
			expect(redirectMock).not.toHaveBeenCalled();
		});

		it("redirects unauthenticated callers to AUTH_LOGIN_PATH", async () => {
			getSessionMock.mockResolvedValue({
				data: null,
				error: { message: "no session" },
			});
			const { getSession } = await import("../src/session");
			const { AUTH_LOGIN_PATH } = await import("../src/auth-paths");
			await expect(getSession()).rejects.toThrow(
				`NEXT_REDIRECT:${AUTH_LOGIN_PATH}`,
			);
			expect(redirectMock).toHaveBeenCalledWith(AUTH_LOGIN_PATH);
		});

		it("throws when active organization is missing and unresolvable", async () => {
			getSessionMock.mockResolvedValue(
				neonSession({ activeOrganizationId: null }),
			);
			const { getSession } = await import("../src/session");
			await expect(getSession()).rejects.toThrow(
				/active organization missing from session/,
			);
			expect(redirectMock).not.toHaveBeenCalled();
		});

		it("redirects to the ensure Route Handler when a sole membership is resolvable", async () => {
			getSessionMock.mockResolvedValue(
				neonSession({ activeOrganizationId: null }),
			);
			listOrganizationsMock.mockResolvedValue({
				data: [{ id: "org-sole", slug: "sole-org", name: "Sole Org" }],
				error: null,
			});
			const { getSession } = await import("../src/session");
			const { ENSURE_ACTIVE_ORGANIZATION_PATH } = await import(
				"../src/ensure-active-organization"
			);
			await expect(getSession()).rejects.toThrow(
				`NEXT_REDIRECT:${ENSURE_ACTIVE_ORGANIZATION_PATH}`,
			);
			expect(setActiveOrganizationMock).not.toHaveBeenCalled();
		});

		it("redirects to the sync Route Handler when cookie mutation is blocked in RSC", async () => {
			getSessionMock.mockRejectedValue(
				new Error(
					"Cookies can only be modified in a Server Action or Route Handler",
				),
			);
			const { getSession } = await import("../src/session");
			const { SYNC_SESSION_COOKIES_PATH } = await import(
				"../src/sync-session-cookies"
			);
			await expect(getSession()).rejects.toThrow(
				`NEXT_REDIRECT:${SYNC_SESSION_COOKIES_PATH}`,
			);
		});

		it("throws when email is missing", async () => {
			getSessionMock.mockResolvedValue(neonSession({ email: null }));
			const { getSession } = await import("../src/session");
			await expect(getSession()).rejects.toThrow(
				/authenticated user email missing from session/,
			);
		});

		it("throws when membership role is unresolved", async () => {
			getSessionMock.mockResolvedValue(neonSession());
			getActiveMemberRoleMock.mockResolvedValue({
				data: { role: "" },
				error: null,
			});
			const { getSession } = await import("../src/session");
			await expect(getSession()).rejects.toThrow(
				/active organization membership role unresolved/,
			);
		});
	});

	describe("handleEnsureActiveOrganizationRequest", () => {
		it("persists a sole member organization then redirects to role home", async () => {
			getSessionMock.mockResolvedValue(
				neonSession({ activeOrganizationId: null }),
			);
			listOrganizationsMock.mockResolvedValue({
				data: [{ id: "org-sole", slug: "sole-org", name: "Sole Org" }],
				error: null,
			});
			getActiveMemberRoleMock.mockResolvedValue({
				data: { role: "admin" },
				error: null,
			});

			const { handleEnsureActiveOrganizationRequest } = await import(
				"../src/ensure-active-organization"
			);
			const response = await handleEnsureActiveOrganizationRequest(
				new Request(
					"https://www.nexuscanon.com/api/session/ensure-active-organization",
				),
			);

			expect(setActiveOrganizationMock).toHaveBeenCalledWith({
				organizationId: "org-sole",
			});
			// Upstream reads only (disableCookieCache) — never trust inbound session_data.
			expect(getSessionMock).toHaveBeenCalledWith({
				query: { disableCookieCache: "true" },
			});
			expect(getSessionMock).toHaveBeenCalledTimes(2);
			expect(response.status).toBeGreaterThanOrEqual(300);
			expect(response.status).toBeLessThan(400);
			expect(new URL(String(response.headers.get("location"))).pathname).toBe(
				"/admin",
			);
		});

		it("honors a safe next callback after persist", async () => {
			getSessionMock.mockResolvedValue(
				neonSession({ activeOrganizationId: null }),
			);
			listOrganizationsMock.mockResolvedValue({
				data: [{ id: "org-sole", slug: "sole-org", name: "Sole Org" }],
				error: null,
			});

			const { handleEnsureActiveOrganizationRequest } = await import(
				"../src/ensure-active-organization"
			);
			const response = await handleEnsureActiveOrganizationRequest(
				new Request(
					"https://www.nexuscanon.com/api/session/ensure-active-organization?next=%2Fadmin",
				),
			);

			expect(new URL(String(response.headers.get("location"))).pathname).toBe(
				"/admin",
			);
		});

		it("skips setActive when upstream session already has active org", async () => {
			getSessionMock.mockResolvedValue(neonSession());
			getActiveMemberRoleMock.mockResolvedValue({
				data: { role: "admin" },
				error: null,
			});

			const { handleEnsureActiveOrganizationRequest } = await import(
				"../src/ensure-active-organization"
			);
			const response = await handleEnsureActiveOrganizationRequest(
				new Request(
					"https://www.nexuscanon.com/api/session/ensure-active-organization?next=%2F",
				),
			);

			expect(setActiveOrganizationMock).not.toHaveBeenCalled();
			expect(getSessionMock).toHaveBeenCalledWith({
				query: { disableCookieCache: "true" },
			});
			expect(new URL(String(response.headers.get("location"))).pathname).toBe(
				"/",
			);
		});
	});

	describe("handleSyncSessionCookiesRequest", () => {
		it("forces disableCookieCache then redirects to next when authenticated", async () => {
			getSessionMock.mockResolvedValue(neonSession());
			const { handleSyncSessionCookiesRequest } = await import(
				"../src/sync-session-cookies"
			);
			const response = await handleSyncSessionCookiesRequest(
				new Request(
					"https://www.nexuscanon.com/api/session/sync-cookies?next=%2Fadmin",
				),
			);

			expect(getSessionMock).toHaveBeenCalledWith({
				query: { disableCookieCache: "true" },
			});
			expect(response.status).toBeGreaterThanOrEqual(300);
			expect(response.status).toBeLessThan(400);
			expect(new URL(String(response.headers.get("location"))).pathname).toBe(
				"/admin",
			);
		});

		it("redirects to login when session is absent", async () => {
			getSessionMock.mockResolvedValue({
				data: null,
				error: { message: "no session" },
			});
			const { handleSyncSessionCookiesRequest } = await import(
				"../src/sync-session-cookies"
			);
			const { AUTH_LOGIN_PATH } = await import("../src/auth-paths");
			const response = await handleSyncSessionCookiesRequest(
				new Request("https://www.nexuscanon.com/api/session/sync-cookies"),
			);

			expect(new URL(String(response.headers.get("location"))).pathname).toBe(
				AUTH_LOGIN_PATH,
			);
		});
	});

	describe("createSessionProxy", () => {
		it("binds Neon middleware to AUTH_LOGIN_PATH", async () => {
			const { NextRequest, NextResponse } = await import("next/server");
			const gate = vi.fn(async () => NextResponse.next());
			middlewareMock.mockReturnValue(gate);
			const { createSessionProxy } = await import("../src/proxy");
			const { AUTH_LOGIN_PATH } = await import("../src/auth-paths");
			const proxy = createSessionProxy();
			expect(middlewareMock).toHaveBeenCalledWith({
				loginUrl: AUTH_LOGIN_PATH,
			});
			expect(typeof proxy).toBe("function");
			await proxy(new NextRequest("https://www.nexuscanon.com/admin"));
			expect(gate).toHaveBeenCalled();
		});

		it("preserves same-origin path as redirectTo on login redirects", async () => {
			const { NextRequest, NextResponse } = await import("next/server");
			const { AUTH_LOGIN_PATH } = await import("../src/auth-paths");
			const { POST_LOGIN_CALLBACK_PARAM } = await import("../src/post-login");
			middlewareMock.mockImplementation(() => {
				return async (request: NextRequest) => {
					return NextResponse.redirect(new URL(AUTH_LOGIN_PATH, request.url));
				};
			});
			const { createSessionProxy } = await import("../src/proxy");
			const sessionProxy = createSessionProxy();
			const response = await sessionProxy(
				new NextRequest("https://www.nexuscanon.com/admin"),
			);
			const location = new URL(String(response.headers.get("location")));
			expect(location.pathname).toBe(AUTH_LOGIN_PATH);
			expect(location.searchParams.get(POST_LOGIN_CALLBACK_PARAM)).toBe(
				"/admin",
			);
		});

		it("overwrites external redirectTo on login redirects with sanitized request path", async () => {
			const { NextRequest, NextResponse } = await import("next/server");
			const { AUTH_LOGIN_PATH } = await import("../src/auth-paths");
			const { POST_LOGIN_CALLBACK_PARAM } = await import("../src/post-login");
			middlewareMock.mockImplementation(() => {
				return async (request: NextRequest) => {
					const loginUrl = new URL(AUTH_LOGIN_PATH, request.url);
					loginUrl.searchParams.set(
						POST_LOGIN_CALLBACK_PARAM,
						"https://evil.example",
					);
					return NextResponse.redirect(loginUrl);
				};
			});
			const { createSessionProxy } = await import("../src/proxy");
			const sessionProxy = createSessionProxy();
			const response = await sessionProxy(
				new NextRequest("https://www.nexuscanon.com/admin/users"),
			);
			const location = new URL(String(response.headers.get("location")));
			expect(location.pathname).toBe(AUTH_LOGIN_PATH);
			expect(location.searchParams.get(POST_LOGIN_CALLBACK_PARAM)).toBe(
				"/admin/users",
			);
			expect(location.searchParams.get(POST_LOGIN_CALLBACK_PARAM)).not.toBe(
				"https://evil.example",
			);
		});

		it("request-level: unauthenticated protected request redirects to /auth/login", async () => {
			const { NextRequest, NextResponse } = await import("next/server");
			middlewareMock.mockImplementation((options: { loginUrl: string }) => {
				return async (request: NextRequest) => {
					const session = await getSessionMock();
					if (session?.error || !session?.data?.user?.id) {
						return NextResponse.redirect(
							new URL(options.loginUrl, request.url),
						);
					}
					return NextResponse.next();
				};
			});
			getSessionMock.mockResolvedValue({
				data: null,
				error: { message: "no session" },
			});

			const { createSessionProxy } = await import("../src/proxy");
			const { AUTH_LOGIN_PATH } = await import("../src/auth-paths");
			expect(AUTH_LOGIN_PATH).toBe("/auth/login");

			const sessionProxy = createSessionProxy();
			const response = await sessionProxy(
				new NextRequest("https://www.nexuscanon.com/admin"),
			);

			expect(middlewareMock).toHaveBeenCalledWith({
				loginUrl: AUTH_LOGIN_PATH,
			});
			expect(response.status).toBeGreaterThanOrEqual(300);
			expect(response.status).toBeLessThan(400);
			expect(new URL(String(response.headers.get("location"))).pathname).toBe(
				"/auth/login",
			);
		});

		it("request-level: authenticated protected request continues (no login redirect)", async () => {
			const { NextRequest, NextResponse } = await import("next/server");
			middlewareMock.mockImplementation((options: { loginUrl: string }) => {
				return async (request: NextRequest) => {
					const session = await getSessionMock();
					if (session?.error || !session?.data?.user?.id) {
						return NextResponse.redirect(
							new URL(options.loginUrl, request.url),
						);
					}
					return NextResponse.next();
				};
			});
			getSessionMock.mockResolvedValue(neonSession());

			const { createSessionProxy } = await import("../src/proxy");
			const sessionProxy = createSessionProxy();
			const response = await sessionProxy(
				new NextRequest("https://www.nexuscanon.com/admin/users"),
			);

			expect(response.status).toBe(200);
			expect(response.headers.get("location")).toBeNull();
			expect(response.headers.get("x-middleware-next")).toBe("1");
		});
	});
});
