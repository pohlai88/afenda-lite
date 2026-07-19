/** I2.4 Route Handler auth cases; N6 fail-closed matrix is in session-contract.test.ts. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const getActiveMemberRoleMock = vi.fn();

vi.mock("@neondatabase/auth/next/server", () => ({
	createNeonAuth: () => ({
		getSession: () => getSessionMock(),
		organization: {
			getActiveMemberRole: (...args: unknown[]) =>
				getActiveMemberRoleMock(...args),
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
}));

describe("getApiSession (I2.4 Route Handler auth)", () => {
	beforeEach(() => {
		vi.resetModules();
		getSessionMock.mockReset();
		getActiveMemberRoleMock.mockReset();
		getActiveMemberRoleMock.mockResolvedValue({
			data: { role: "member" },
			error: null,
		});
	});

	it("returns null when Neon reports no session", async () => {
		getSessionMock.mockResolvedValue({
			data: null,
			error: { message: "nope" },
		});
		const { getApiSession } = await import("../src/session");
		await expect(getApiSession()).resolves.toBeNull();
	});

	it("returns ApiSession with normalized email for HTTP adapters", async () => {
		getSessionMock.mockResolvedValue({
			data: {
				user: { id: "user-1", email: " Client@Example.COM " },
				session: { activeOrganizationId: "org-1" },
			},
			error: null,
		});
		const { getApiSession } = await import("../src/session");
		await expect(getApiSession()).resolves.toEqual({
			userId: "user-1",
			orgId: "org-1",
			role: "client",
			email: "client@example.com",
		});
	});
});
