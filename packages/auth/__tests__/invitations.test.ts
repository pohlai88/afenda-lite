import { beforeEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.fn();
const getSessionMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("next/headers", () => ({
	headers: () => headersMock(),
}));

vi.mock("@afenda/env", () => ({
	env: {
		APP_URL: "https://afenda-lite.vercel.app",
		NEON_AUTH_BASE_URL: "https://auth.example.test/",
	},
}));

vi.mock("../src/session", () => ({
	getSession: () => getSessionMock(),
}));

describe("inviteOrgMember (I1.3)", () => {
	beforeEach(() => {
		vi.resetModules();
		headersMock.mockReset();
		getSessionMock.mockReset();
		fetchMock.mockReset();
		vi.stubGlobal("fetch", fetchMock);

		headersMock.mockResolvedValue({
			get: (name: string) => (name === "cookie" ? "session=abc" : null),
		});
		getSessionMock.mockResolvedValue({
			userId: "user-1",
			orgId: "org-1",
			role: "operator",
		});
	});

	it("refuses a different organization id", async () => {
		const { inviteOrgMember } = await import("../src/invitations");
		await expect(
			inviteOrgMember({
				email: "a@b.co",
				orgId: "org-other",
				role: "client",
			}),
		).rejects.toThrow(/refuses organization/);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("posts to Neon with APP_URL Origin and normalized email", async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => JSON.stringify({ ok: true }),
		});

		const { inviteOrgMember } = await import("../src/invitations");
		await inviteOrgMember({
			email: "  Client@Example.COM ",
			orgId: "org-1",
			role: "client",
		});

		expect(fetchMock).toHaveBeenCalledOnce();
		const [url, init] = fetchMock.mock.calls[0] as [
			string,
			RequestInit & { headers: Record<string, string>; body: string },
		];
		expect(url).toBe("https://auth.example.test/organization/invite-member");
		expect(init.method).toBe("POST");
		expect(init.headers.Origin).toBe("https://afenda-lite.vercel.app");
		expect(init.headers.Referer).toBe("https://afenda-lite.vercel.app/");
		expect(JSON.parse(init.body)).toEqual({
			email: "client@example.com",
			role: "member",
			organizationId: "org-1",
			resend: true,
		});
	});

	it("throws a stable failure without Neon response body leakage", async () => {
		fetchMock.mockResolvedValue({
			ok: false,
			status: 403,
			text: async () =>
				JSON.stringify({ message: "internal token xyz leaked" }),
		});

		const { inviteOrgMember } = await import("../src/invitations");
		await expect(
			inviteOrgMember({
				email: "a@b.co",
				orgId: "org-1",
				role: "client",
			}),
		).rejects.toThrow(/organization invite failed \(403\)/);
		await expect(
			inviteOrgMember({
				email: "a@b.co",
				orgId: "org-1",
				role: "client",
			}),
		).rejects.not.toThrow(/xyz/);
	});
});
