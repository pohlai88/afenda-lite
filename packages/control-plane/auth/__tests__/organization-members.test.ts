import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const listMembersMock = vi.fn();
const SECRET_PATTERN = /xyz/;

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
			email: "actor@example.com",
			orgId: "org-1",
			role: "operator",
			userId: "user-actor",
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
							role: "member",
							user: { email: "  Ada@Example.COM ", id: "u-1", name: " Ada " },
							userId: "u-1",
						},
						{
							role: "owner",
							user: { email: "bob@example.com", id: "u-2", name: "" },
							userId: "u-2",
						},
						{ role: "superuser", user: { email: "x@y.z" }, userId: "u-bad" },
						{ role: "member", user: { email: "missing-id@example.com" } },
						null,
						"x",
					],
					total: 2,
				}),
			).toEqual([
				{
					email: "ada@example.com",
					name: "Ada",
					role: "member",
					userId: "u-1",
				},
				{
					email: "bob@example.com",
					name: "bob@example.com",
					role: "owner",
					userId: "u-2",
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
						role: "admin",
						user: { email: "a@example.com", name: "A" },
						userId: "u-1",
					},
					{
						role: "member",
						user: { email: "a@example.com", name: "A updated" },
						userId: "u-1",
					},
				]),
			).toEqual([
				{
					email: "a@example.com",
					name: "A updated",
					role: "member",
					userId: "u-1",
				},
			]);
		});
	});

	describe("listOrgMembers", () => {
		it("refuses a different organization id", async () => {
			const { listOrgMembers } = await import("../src/organization-members");
			await expect(listOrgMembers("org-other")).rejects.toMatchObject({
				code: "FORBIDDEN",
				message: "Organization is not in the active session",
			});
			expect(listMembersMock).not.toHaveBeenCalled();
		});

		it("paginates until a short page and never leaks upstream errors", async () => {
			const pageOne = Array.from({ length: 100 }, (_, index) => ({
				role: "member" as const,
				user: {
					email: `u${index}@example.com`,
					name: `User ${index}`,
				},
				userId: `u-page-${index}`,
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
								role: "admin",
								user: { email: "last@example.com", name: "Last" },
								userId: "u-last",
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
				query: { limit: 100, offset: 0, organizationId: "org-1" },
			});
			expect(listMembersMock.mock.calls[1]?.[0]).toEqual({
				query: { limit: 100, offset: 100, organizationId: "org-1" },
			});
			expect(members).toHaveLength(101);
			expect(members.some((member) => member.userId === "u-last")).toBe(true);
		});

		it("throws a stable failure without Neon message leakage", async () => {
			listMembersMock.mockResolvedValue({
				data: null,
				error: {
					code: "FORBIDDEN",
					message: "secret token xyz leaked",
				},
			});

			const { listOrgMembers } = await import("../src/organization-members");
			await expect(listOrgMembers("org-1")).rejects.toMatchObject({
				code: "SERVICE_UNAVAILABLE",
				details: { service: "neon-auth" },
				message: "A required service is temporarily unavailable.",
			});
			await expect(listOrgMembers("org-1")).rejects.not.toThrow(SECRET_PATTERN);
		});
	});

	describe("findOrgMember", () => {
		it("returns the exact member or null", async () => {
			listMembersMock.mockResolvedValue({
				data: {
					members: [
						{
							role: "member",
							user: { email: "keep@example.com", name: "Keep" },
							userId: "u-keep",
						},
						{
							role: "admin",
							user: { email: "other@example.com", name: "Other" },
							userId: "u-other",
						},
					],
					total: 2,
				},
				error: null,
			});

			const { findOrgMember } = await import("../src/organization-members");
			await expect(findOrgMember("org-1", "u-keep")).resolves.toEqual({
				email: "keep@example.com",
				name: "Keep",
				role: "member",
				userId: "u-keep",
			});
			expect(listMembersMock).toHaveBeenCalledWith({
				query: {
					filterField: "userId",
					filterOperator: "eq",
					filterValue: "u-keep",
					limit: 100,
					offset: 0,
					organizationId: "org-1",
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
			await expect(findOrgMember("org-other", "u-1")).rejects.toMatchObject({
				code: "FORBIDDEN",
				message: "Organization is not in the active session",
			});
			expect(listMembersMock).not.toHaveBeenCalled();
		});

		it("throws a canonical failure without Neon message leakage", async () => {
			listMembersMock.mockResolvedValue({
				data: null,
				error: {
					code: "FORBIDDEN",
					message: "secret token xyz leaked",
				},
			});

			const { findOrgMember } = await import("../src/organization-members");
			await expect(findOrgMember("org-1", "u-1")).rejects.toMatchObject({
				code: "SERVICE_UNAVAILABLE",
				details: { service: "neon-auth" },
				message: "A required service is temporarily unavailable.",
			});
			await expect(findOrgMember("org-1", "u-1")).rejects.not.toThrow(
				SECRET_PATTERN,
			);
		});
	});
});
