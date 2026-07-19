/**
 * Identity org-member search projection — sync prune + hit mapping.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { MemorySearchStore } from "../../../packages/search/__tests__/helpers/memory-search-store";

const authMocks = vi.hoisted(() => ({
	listOrgMembers: vi.fn(),
	findOrgMember: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	listOrgMembers: authMocks.listOrgMembers,
	findOrgMember: authMocks.findOrgMember,
}));

describe("organization-member-search Identity port", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("upserts members and prunes stale index rows", async () => {
		const store = new MemorySearchStore();
		authMocks.listOrgMembers.mockResolvedValue([
			{
				userId: "u-1",
				email: "ada@example.com",
				name: "Ada",
				role: "admin",
			},
			{
				userId: "u-2",
				email: "grace@example.com",
				name: "Grace",
				role: "member",
			},
		]);

		const { syncOrganizationMemberSearchIndex, searchOrganizationMembers } =
			await import("../modules/identity/domain/organization-member-search");

		const first = await syncOrganizationMemberSearchIndex("org-1", store);
		expect(first.ok).toBe(true);
		if (first.ok) {
			expect(first.data).toEqual({ upserted: 2, pruned: 0 });
		}

		authMocks.listOrgMembers.mockResolvedValue([
			{
				userId: "u-1",
				email: "ada@example.com",
				name: "Ada",
				role: "admin",
			},
		]);

		const second = await syncOrganizationMemberSearchIndex("org-1", store);
		expect(second.ok).toBe(true);
		if (second.ok) {
			expect(second.data).toEqual({ upserted: 1, pruned: 1 });
		}

		const stale = await searchOrganizationMembers("org-1", "Grace", 20, store);
		expect(stale.ok).toBe(true);
		if (stale.ok) {
			expect(stale.data).toEqual([]);
		}

		const live = await searchOrganizationMembers("org-1", "Ada", 20, store);
		expect(live.ok).toBe(true);
		if (live.ok) {
			expect(live.data).toEqual([
				{ id: "u-1", label: "Ada · ada@example.com" },
			]);
		}
	});

	it("prunes all member docs when org has no members", async () => {
		const store = new MemorySearchStore();
		authMocks.listOrgMembers.mockResolvedValueOnce([
			{
				userId: "u-1",
				email: "ada@example.com",
				name: "Ada",
				role: "admin",
			},
		]);

		const { syncOrganizationMemberSearchIndex } = await import(
			"../modules/identity/domain/organization-member-search"
		);

		await syncOrganizationMemberSearchIndex("org-1", store);
		authMocks.listOrgMembers.mockResolvedValueOnce([]);
		const cleared = await syncOrganizationMemberSearchIndex("org-1", store);
		expect(cleared.ok).toBe(true);
		if (cleared.ok) {
			expect(cleared.data).toEqual({ upserted: 0, pruned: 1 });
		}
	});
});
