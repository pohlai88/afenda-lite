import { describe, expect, it } from "vitest";

import { parseInviteOrgMemberCommand } from "../modules/identity/domain/invite-org-member";

describe("parseInviteOrgMemberCommand (I1.3)", () => {
	it("normalizes email and accepts client role", () => {
		expect(
			parseInviteOrgMemberCommand({
				email: "  Client@Example.COM ",
				role: "client",
			}),
		).toEqual({ email: "client@example.com", role: "client" });
	});

	it("rejects empty email", () => {
		expect(() =>
			parseInviteOrgMemberCommand({ email: "  ", role: "client" }),
		).toThrow();
	});

	it("rejects unknown role", () => {
		expect(() =>
			parseInviteOrgMemberCommand({
				email: "a@b.co",
				role: "viewer",
			}),
		).toThrow();
	});
});
