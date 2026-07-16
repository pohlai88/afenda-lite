import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const getActiveMemberRoleMock = vi.fn();
const middlewareMock = vi.fn();
const redirectMock = vi.fn((url: string) => {
	throw new Error(`NEXT_REDIRECT:${url}`);
});

vi.mock("next/navigation", () => ({
	redirect: (url: string) => redirectMock(url),
}));

vi.mock("@neondatabase/auth/next/server", () => ({
	createNeonAuth: () => ({
		getSession: () => getSessionMock(),
		organization: {
			getActiveMemberRole: (...args: unknown[]) =>
				getActiveMemberRoleMock(...args),
		},
		middleware: (...args: unknown[]) => middlewareMock(...args),
	}),
}));

vi.mock("@afenda/env", () => ({
	env: {
		NEON_AUTH_BASE_URL: "https://auth.example.test",
		NEON_AUTH_COOKIE_SECRET: "x".repeat(32),
		DATABASE_URL: "postgresql://u:p@ep-x-pooler.example/db?sslmode=require",
		APP_URL: "https://afenda-lite.vercel.app",
	},
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
				email: partial && "email" in partial ? partial.email : "User@Example.COM",
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

describe("N6 session contract", () => {
	beforeEach(() => {
		vi.resetModules();
		getSessionMock.mockReset();
		getActiveMemberRoleMock.mockReset();
		middlewareMock.mockReset();
		redirectMock.mockClear();
		getActiveMemberRoleMock.mockResolvedValue({
			data: { role: "member" },
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

		it("returns null when active organization is missing", async () => {
			getSessionMock.mockResolvedValue(
				neonSession({ activeOrganizationId: null }),
			);
			const { getApiSession } = await import("../src/session");
			await expect(getApiSession()).resolves.toBeNull();
		});

		it("returns null when active organization is empty", async () => {
			getSessionMock.mockResolvedValue(
				neonSession({ activeOrganizationId: "" }),
			);
			const { getApiSession } = await import("../src/session");
			await expect(getApiSession()).resolves.toBeNull();
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

		it("throws when active organization is missing (never defaults org)", async () => {
			getSessionMock.mockResolvedValue(
				neonSession({ activeOrganizationId: null }),
			);
			const { getSession } = await import("../src/session");
			await expect(getSession()).rejects.toThrow(
				/active organization missing from session/,
			);
			expect(redirectMock).not.toHaveBeenCalled();
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

	describe("createSessionProxy", () => {
		it("binds Neon middleware to AUTH_LOGIN_PATH", async () => {
			const gate = vi.fn();
			middlewareMock.mockReturnValue(gate);
			const { createSessionProxy } = await import("../src/proxy");
			const { AUTH_LOGIN_PATH } = await import("../src/auth-paths");
			const proxy = createSessionProxy();
			expect(middlewareMock).toHaveBeenCalledWith({
				loginUrl: AUTH_LOGIN_PATH,
			});
			expect(proxy).toBe(gate);
		});

		it("request-level: unauthenticated protected request redirects to /auth/login", async () => {
			const { NextRequest, NextResponse } = await import("next/server");
			// Neon Auth middleware contract under test: unauthenticated → loginUrl.
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
				new NextRequest("https://afenda-lite.vercel.app/admin"),
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
				new NextRequest("https://afenda-lite.vercel.app/fft/events"),
			);

			expect(response.status).toBe(200);
			expect(response.headers.get("location")).toBeNull();
			expect(response.headers.get("x-middleware-next")).toBe("1");
		});
	});
});
