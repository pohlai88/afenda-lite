import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@afenda/env", () => ({
	env: {
		APP_URL: "https://afenda-lite.vercel.app",
	},
}));

describe("join paths (I1.3)", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it("exports JOIN_PATH as /join", async () => {
		const { JOIN_PATH } = await import("../src/join-paths");
		expect(JOIN_PATH).toBe("/join");
	});

	it("builds a relative join URL with invitationId", async () => {
		const { buildJoinUrl } = await import("../src/join-paths");
		expect(buildJoinUrl({ invitationId: "inv-abc" })).toBe(
			"/join?invitationId=inv-abc",
		);
	});

	it("builds an absolute join URL from origin", async () => {
		const { buildJoinUrl } = await import("../src/join-paths");
		expect(
			buildJoinUrl({
				invitationId: "inv-abc",
				origin: "https://afenda-lite.vercel.app/",
			}),
		).toBe("https://afenda-lite.vercel.app/join?invitationId=inv-abc");
	});

	it("rejects empty invitationId", async () => {
		const { buildJoinUrl } = await import("../src/join-paths");
		expect(() => buildJoinUrl({ invitationId: "  " })).toThrow(
			/non-empty invitationId/,
		);
	});

	it("buildInviteJoinUrl uses production APP_URL origin", async () => {
		const { buildInviteJoinUrl } = await import("../src/join-paths");
		expect(buildInviteJoinUrl("inv-123")).toBe(
			"https://afenda-lite.vercel.app/join?invitationId=inv-123",
		);
	});

	it("buildInviteJoinUrl rejects empty invitationId", async () => {
		const { buildInviteJoinUrl } = await import("../src/join-paths");
		expect(() => buildInviteJoinUrl("  ")).toThrow(/non-empty invitationId/);
	});
});
