/**
 * Identity organization-users port — mapping + membership lookup.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
	listOrgMembers: vi.fn(),
	findOrgMember: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	listOrgMembers: authMocks.listOrgMembers,
	findOrgMember: authMocks.findOrgMember,
}));

describe("organization-users Identity port", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("maps and sorts organization users by name then email", async () => {
		authMocks.listOrgMembers.mockResolvedValue([
			{
				userId: "u-2",
				email: "b@example.com",
				name: "Bea",
				role: "member",
			},
			{
				userId: "u-1",
				email: "a@example.com",
				name: "Ada",
				role: "admin",
			},
			{
				userId: "u-3",
				email: "c@example.com",
				name: "Ada",
				role: "owner",
			},
		]);

		const { listOrganizationUsers } = await import(
			"../modules/identity/domain/organization-users"
		);
		await expect(listOrganizationUsers("org-1")).resolves.toEqual([
			{
				userId: "u-1",
				email: "a@example.com",
				name: "Ada",
				neonRole: "admin",
			},
			{
				userId: "u-3",
				email: "c@example.com",
				name: "Ada",
				neonRole: "owner",
			},
			{
				userId: "u-2",
				email: "b@example.com",
				name: "Bea",
				neonRole: "member",
			},
		]);
		expect(authMocks.listOrgMembers).toHaveBeenCalledWith("org-1");
	});

	it("returns exact membership or null", async () => {
		authMocks.findOrgMember.mockResolvedValueOnce({
			userId: "u-1",
			email: "a@example.com",
			name: "Ada",
			role: "member",
		});

		const { getOrganizationUser } = await import(
			"../modules/identity/domain/organization-users"
		);
		await expect(getOrganizationUser("org-1", "u-1")).resolves.toEqual({
			userId: "u-1",
			email: "a@example.com",
			name: "Ada",
			neonRole: "member",
		});

		authMocks.findOrgMember.mockResolvedValueOnce(null);
		await expect(getOrganizationUser("org-1", "missing")).resolves.toBeNull();
	});
});
