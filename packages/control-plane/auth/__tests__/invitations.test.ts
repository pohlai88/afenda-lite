import { errorResult } from "@afenda/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.fn();
const getSessionMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("next/headers", () => ({
	headers: () => headersMock(),
}));

vi.mock("@afenda/env", () => ({
	env: {
		APP_URL: "https://www.nexuscanon.com",
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
			orgId: "org-1",
			role: "operator",
			userId: "user-1",
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
		).resolves.toEqual(errorResult.fail("FORBIDDEN"));
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
		expect(init.headers.Origin).toBe("https://www.nexuscanon.com");
		expect(init.headers.Referer).toBe("https://www.nexuscanon.com/");
		expect(JSON.parse(init.body)).toEqual({
			email: "client@example.com",
			organizationId: "org-1",
			resend: true,
			role: "member",
		});
	});

	it("returns a stable failure without Neon response body leakage", async () => {
		fetchMock.mockResolvedValue({
			ok: false,
			status: 403,
			text: async () =>
				JSON.stringify({ message: "internal token xyz leaked" }),
		});

		const { inviteOrgMember } = await import("../src/invitations");
		const result = await inviteOrgMember({
			email: "a@b.co",
			orgId: "org-1",
			role: "client",
		});
		expect(result).toEqual(errorResult.fail("FORBIDDEN"));
		expect(JSON.stringify(result)).not.toContain("xyz");
	});

	it("returns invitationId when Neon includes an invitation envelope", async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			status: 200,
			text: async () =>
				JSON.stringify({
					invitation: { email: "client@example.com", id: "inv-from-neon" },
				}),
		});

		const { inviteOrgMember } = await import("../src/invitations");
		await expect(
			inviteOrgMember({
				email: "client@example.com",
				orgId: "org-1",
				role: "client",
			}),
		).resolves.toEqual({
			data: {
				data: {
					invitation: { email: "client@example.com", id: "inv-from-neon" },
				},
				invitationId: "inv-from-neon",
			},
			ok: true,
		});
	});
});

describe("extractInvitationId", () => {
	it("reads id, invitationId, nested invitation, and data envelopes", async () => {
		const { extractInvitationId } = await import("../src/invitations");
		expect(extractInvitationId({ id: " inv-1 " })).toBe("inv-1");
		expect(extractInvitationId({ invitationId: "inv-2" })).toBe("inv-2");
		expect(extractInvitationId({ invitation: { id: "inv-3" } })).toBe("inv-3");
		expect(extractInvitationId({ data: { id: "inv-4" } })).toBe("inv-4");
		expect(extractInvitationId(null)).toBeNull();
		expect(extractInvitationId({ ok: true })).toBeNull();
	});
});
