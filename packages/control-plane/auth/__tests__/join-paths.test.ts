import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@afenda/env", () => ({
	env: {
		APP_URL: "https://www.nexuscanon.com",
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
				origin: "https://www.nexuscanon.com/",
			}),
		).toBe("https://www.nexuscanon.com/join?invitationId=inv-abc");
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
			"https://www.nexuscanon.com/join?invitationId=inv-123",
		);
	});

	it("buildInviteJoinUrl rejects empty invitationId", async () => {
		const { buildInviteJoinUrl } = await import("../src/join-paths");
		expect(() => buildInviteJoinUrl("  ")).toThrow(/non-empty invitationId/);
	});
});

describe("parseJoinInvitationQuery (PL-S4)", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it("classifies missing and blank as missing", async () => {
		const { parseJoinInvitationQuery } = await import("../src/join-paths");
		expect(parseJoinInvitationQuery(undefined)).toEqual({ kind: "missing" });
		expect(parseJoinInvitationQuery(null)).toEqual({ kind: "missing" });
		expect(parseJoinInvitationQuery("")).toEqual({ kind: "missing" });
		expect(parseJoinInvitationQuery("   ")).toEqual({ kind: "missing" });
	});

	it("classifies structurally unsafe values as invalid", async () => {
		const { JOIN_INVITATION_ID_MAX_LENGTH, parseJoinInvitationQuery } =
			await import("../src/join-paths");
		expect(parseJoinInvitationQuery(["a", "b"])).toEqual({ kind: "invalid" });
		expect(parseJoinInvitationQuery(42)).toEqual({ kind: "invalid" });
		expect(parseJoinInvitationQuery("inv\u0000bad")).toEqual({
			kind: "invalid",
		});
		expect(
			parseJoinInvitationQuery("x".repeat(JOIN_INVITATION_ID_MAX_LENGTH + 1)),
		).toEqual({ kind: "invalid" });
	});

	it("accepts opaque printable ids including the acceptance probe", async () => {
		const { parseJoinInvitationQuery } = await import("../src/join-paths");
		expect(parseJoinInvitationQuery("test")).toEqual({
			kind: "present",
			invitationId: "test",
		});
		expect(parseJoinInvitationQuery("  inv-neon-1  ")).toEqual({
			kind: "present",
			invitationId: "inv-neon-1",
		});
	});
});
