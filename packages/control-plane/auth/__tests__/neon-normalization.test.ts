import { describe, expect, it } from "vitest";

import {
	normalizeNeonCreatedOrganization,
	normalizeNeonInvitationId,
	normalizeNeonMemberOrganizations,
	normalizeNeonOrgMembers,
	probeNeonError,
} from "../src/neon-normalization";

describe("Neon Auth normalization boundary", () => {
	it("accepts supported historical vendor envelope shapes", () => {
		expect(
			normalizeNeonInvitationId({ data: { invitation: { id: " inv-1 " } } }),
		).toBe("inv-1");
		expect(
			normalizeNeonCreatedOrganization({
				organization: { id: " org-1 ", name: " Acme ", slug: " acme " },
			}),
		).toEqual({ id: "org-1", name: "Acme", slug: "acme" });
	});

	it("drops malformed organizations and members instead of exposing vendor data", () => {
		expect(
			normalizeNeonMemberOrganizations([
				{ id: "org-1", slug: "acme" },
				{ id: "", slug: "broken" },
				null,
			]),
		).toEqual([{ id: "org-1", slug: "acme" }]);
		expect(
			normalizeNeonOrgMembers({
				members: [
					{ role: "owner", user: { id: "u1", email: " OWNER@EXAMPLE.COM " } },
					{ role: "unknown", user: { id: "u2", email: "u2@example.com" } },
				],
			}),
		).toEqual([
			{
				email: "owner@example.com",
				name: "owner@example.com",
				role: "owner",
				userId: "u1",
			},
		]);
	});

	it("survives hostile getters", () => {
		const hostile = Object.defineProperty({}, "message", {
			get() {
				throw new Error("getter escaped");
			},
		});
		expect(probeNeonError(hostile)).toBe("");
		expect(normalizeNeonInvitationId(hostile)).toBeNull();
	});
});
