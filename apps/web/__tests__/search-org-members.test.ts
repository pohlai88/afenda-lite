/**
 * Org-admin member FTS Action — session orgId + org.roles.manage.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-search-operator",
	orgId: "org-active-session",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const searchMocks = vi.hoisted(() => ({
	searchOrganizationMembers: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	sessionHasPermission: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	requireRole: authMocks.requireRole,
}));

vi.mock("@/modules/identity/domain/organization-member-search", () => ({
	searchOrganizationMembers: searchMocks.searchOrganizationMembers,
}));

vi.mock(
	"@/modules/identity/domain/session-permission",
	async (importOriginal) => {
		const actual =
			await importOriginal<
				typeof import("@/modules/identity/domain/session-permission")
			>();
		return {
			...actual,
			sessionHasPermission: permissionMocks.sessionHasPermission,
		};
	},
);

vi.mock("@/modules/platform/observability/product-log", () => ({
	logProductEvent: vi.fn(),
}));

import { searchOrgMembersAction } from "../app/actions/search-org-members";

describe("searchOrgMembersAction", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.sessionHasPermission.mockResolvedValue(true);
	});

	it("returns VALIDATION_ERROR for empty query", async () => {
		const result = await searchOrgMembersAction({ query: "   " });
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(searchMocks.searchOrganizationMembers).not.toHaveBeenCalled();
	});

	it("returns FORBIDDEN without org.roles.manage", async () => {
		permissionMocks.sessionHasPermission.mockResolvedValue(false);

		const result = await searchOrgMembersAction({ query: "ada" });

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("FORBIDDEN");
		}
		expect(searchMocks.searchOrganizationMembers).not.toHaveBeenCalled();
	});

	it("stamps organizationId from session only", async () => {
		searchMocks.searchOrganizationMembers.mockResolvedValue({
			ok: true,
			data: [{ id: "u-1", label: "Ada · ada@example.com" }],
		});

		const result = await searchOrgMembersAction({
			query: "ada",
			organizationId: "org-spoofed",
		});

		expect(result).toEqual({
			ok: true,
			data: {
				members: [{ id: "u-1", label: "Ada · ada@example.com" }],
			},
		});
		expect(searchMocks.searchOrganizationMembers).toHaveBeenCalledWith(
			"org-active-session",
			"ada",
			undefined,
		);
	});

	it("passes domain Result failures through", async () => {
		searchMocks.searchOrganizationMembers.mockResolvedValue({
			ok: false,
			code: "INTERNAL_ERROR",
			message: "Failed to search documents",
		});

		const result = await searchOrgMembersAction({ query: "ada" });

		expect(result).toEqual({
			ok: false,
			code: "INTERNAL_ERROR",
			message: "Failed to search documents",
		});
	});
});
