import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const listMembersMock = vi.fn();

vi.mock("../src/session", () => ({
	getSession: () => getSessionMock(),
}));

vi.mock("../src/neon-auth", () => ({
	getNeonAuth: () => ({
		organization: {
			listMembers: (...args: unknown[]) => listMembersMock(...args),
		},
	}),
}));

describe("organization members adapter", () => {
	beforeEach(() => {
		vi.resetModules();
		getSessionMock.mockReset();
		listMembersMock.mockReset();
		getSessionMock.mockResolvedValue({
			userId: "user-actor",
			orgId: "org-1",
			role: "operator",
			email: "actor@example.com",
		});
	});

	describe("normalizeOrgMembers", () => {
		it("normalizes envelope members and drops invalid rows", async () => {
			const { normalizeOrgMembers } = await import(
				"../src/organization-members"
			);

			expect(normalizeOrgMembers(null)).toEqual([]);
			expect(normalizeOrgMembers({})).toEqual([]);
			expect(
				normalizeOrgMembers({
					members: [
						{
							userId: "u-1",
							role: "member",
							user: { id: "u-1", email: "  Ada@Example.COM ", name: " Ada " },
						},
						{
							userId: "u-2",
							role: "owner",
							user: { id: "u-2", email: "bob@example.com", name: "" },
						},
						{ userId: "u-bad", role: "superuser", user: { email: "x@y.z" } },
						{ role: "member", user: { email: "missing-id@example.com" } },
						null,
						"x",
					],
					total: 2,
				}),
			).toEqual([
				{
					userId: "u-1",
					email: "ada@example.com",
					name: "Ada",
					role: "member",
				},
				{
					userId: "u-2",
					email: "bob@example.com",
					name: "bob@example.com",
					role: "owner",
				},
			]);
		});

		it("dedupes by userId when given a raw array", async () => {
			const { normalizeOrgMembers } = await import(
				"../src/organization-members"
			);
			expect(
				normalizeOrgMembers([
					{
						userId: "u-1",
						role: "admin",
						user: { email: "a@example.com", name: "A" },
					},
					{
						userId: "u-1",
						role: "member",
						user: { email: "a@example.com", name: "A updated" },
					},
				]),
			).toEqual([
				{
					userId: "u-1",
					email: "a@example.com",
					name: "A updated",
					role: "member",
				},
			]);
		});
	});

	describe("listOrgMembers", () => {
		it("refuses a different organization id", async () => {
			const { listOrgMembers } = await import("../src/organization-members");
			await expect(listOrgMembers("org-other")).rejects.toThrow(
				/refuses organization/,
			);
			expect(listMembersMock).not.toHaveBeenCalled();
		});

		it("paginates until a short page and never leaks upstream errors", async () => {
			const pageOne = Array.from({ length: 100 }, (_, index) => ({
				userId: `u-page-${index}`,
				role: "member" as const,
				user: {
					email: `u${index}@example.com`,
					name: `User ${index}`,
				},
			}));

			listMembersMock
				.mockResolvedValueOnce({
					data: {
						members: pageOne,
						total: 101,
					},
					error: null,
				})
				.mockResolvedValueOnce({
					data: {
						members: [
							{
								userId: "u-last",
								role: "admin",
								user: { email: "last@example.com", name: "Last" },
							},
						],
						total: 101,
					},
					error: null,
				});

			const { listOrgMembers } = await import("../src/organization-members");
			const members = await listOrgMembers("org-1");

			expect(listMembersMock).toHaveBeenCalledTimes(2);
			expect(listMembersMock.mock.calls[0]?.[0]).toEqual({
				query: { organizationId: "org-1", limit: 100, offset: 0 },
			});
			expect(listMembersMock.mock.calls[1]?.[0]).toEqual({
				query: { organizationId: "org-1", limit: 100, offset: 100 },
			});
			expect(members).toHaveLength(101);
			expect(members.some((member) => member.userId === "u-last")).toBe(true);
		});

		it("throws a stable failure without Neon message leakage", async () => {
			listMembersMock.mockResolvedValue({
				data: null,
				error: {
					message: "secret token xyz leaked",
					code: "FORBIDDEN",
				},
			});

			const { listOrgMembers } = await import("../src/organization-members");
			await expect(listOrgMembers("org-1")).rejects.toThrow(
				/@afenda\/auth: organization listMembers failed/,
			);
			await expect(listOrgMembers("org-1")).rejects.not.toThrow(/xyz/);
		});
	});

	describe("findOrgMember", () => {
		it("returns the exact member or null", async () => {
			listMembersMock.mockResolvedValue({
				data: {
					members: [
						{
							userId: "u-keep",
							role: "member",
							user: { email: "keep@example.com", name: "Keep" },
						},
						{
							userId: "u-other",
							role: "admin",
							user: { email: "other@example.com", name: "Other" },
						},
					],
					total: 2,
				},
				error: null,
			});

			const { findOrgMember } = await import("../src/organization-members");
			await expect(findOrgMember("org-1", "u-keep")).resolves.toEqual({
				userId: "u-keep",
				email: "keep@example.com",
				name: "Keep",
				role: "member",
			});
			expect(listMembersMock).toHaveBeenCalledWith({
				query: {
					organizationId: "org-1",
					limit: 100,
					offset: 0,
					filterField: "userId",
					filterValue: "u-keep",
					filterOperator: "eq",
				},
			});

			listMembersMock.mockResolvedValueOnce({
				data: { members: [], total: 0 },
				error: null,
			});
			await expect(findOrgMember("org-1", "missing")).resolves.toBeNull();
		});

		it("refuses cross-org lookup", async () => {
			const { findOrgMember } = await import("../src/organization-members");
			await expect(findOrgMember("org-other", "u-1")).rejects.toThrow(
				/refuses organization/,
			);
			expect(listMembersMock).not.toHaveBeenCalled();
		});
	});
});
