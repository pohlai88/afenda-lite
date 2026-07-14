import { describe, expect, it } from "vitest";

import { buildJoinUrl, JOIN_PATH } from "./join-paths";

describe("join paths (I1.3)", () => {
	it("exports JOIN_PATH as /join", () => {
		expect(JOIN_PATH).toBe("/join");
	});

	it("builds a relative join URL with invitationId", () => {
		expect(buildJoinUrl({ invitationId: "inv-abc" })).toBe(
			"/join?invitationId=inv-abc",
		);
	});

	it("builds an absolute join URL from origin", () => {
		expect(
			buildJoinUrl({
				invitationId: "inv-abc",
				origin: "https://afenda-lite.vercel.app/",
			}),
		).toBe("https://afenda-lite.vercel.app/join?invitationId=inv-abc");
	});

	it("rejects empty invitationId", () => {
		expect(() => buildJoinUrl({ invitationId: "  " })).toThrow(
			/non-empty invitationId/,
		);
	});
});
