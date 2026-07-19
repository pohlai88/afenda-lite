import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const organizationList = vi.fn();
const organizationCreate = vi.fn();
const organizationSetActive = vi.fn();
const organizationDelete = vi.fn();

vi.mock("../src/neon-auth", () => ({
	getNeonAuth: () => ({
		organization: {
			list: organizationList,
			create: organizationCreate,
			setActive: organizationSetActive,
			delete: organizationDelete,
		},
	}),
}));

describe("organization console (Neon Auth)", () => {
	beforeEach(() => {
		organizationList.mockReset();
		organizationCreate.mockReset();
		organizationSetActive.mockReset();
		organizationDelete.mockReset();
		vi.resetModules();
	});

	describe("parseCreatedOrganization", () => {
		it("accepts flat and nested Neon envelopes", async () => {
			const { parseCreatedOrganization } = await import(
				"../src/organization-console"
			);
			expect(
				parseCreatedOrganization({
					id: "org-1",
					slug: "one",
					name: "One",
				}),
			).toEqual({ id: "org-1", slug: "one", name: "One" });
			expect(
				parseCreatedOrganization({
					organization: { id: "org-2", slug: "two", name: "Two" },
				}),
			).toEqual({ id: "org-2", slug: "two", name: "Two" });
			expect(
				parseCreatedOrganization({ id: "org-3", slug: "three" }),
			).toBeNull();
			expect(parseCreatedOrganization(null)).toBeNull();
		});
	});

	describe("listMemberOrganizations", () => {
		it("returns normalized memberships on success", async () => {
			organizationList.mockResolvedValue({
				data: [
					{ id: "org-1", slug: "one" },
					{ id: "", slug: "drop" },
				],
				error: null,
			});
			const { listMemberOrganizations } = await import(
				"../src/organization-console"
			);
			await expect(listMemberOrganizations()).resolves.toEqual({
				ok: true,
				data: [{ id: "org-1", slug: "one" }],
			});
		});

		it("returns Result failure when Neon list errors", async () => {
			organizationList.mockResolvedValue({
				data: null,
				error: { message: "list denied" },
			});
			const { listMemberOrganizations } = await import(
				"../src/organization-console"
			);
			await expect(listMemberOrganizations()).resolves.toEqual({
				ok: false,
				code: "FORBIDDEN",
				message: "Not authorized for this organization action",
			});
		});
	});

	describe("createOrganization", () => {
		it("rejects empty name or slug before calling Neon", async () => {
			const { createOrganization } = await import(
				"../src/organization-console"
			);
			await expect(
				createOrganization({ name: "  ", slug: "ok" }),
			).resolves.toEqual({
				ok: false,
				code: "BAD_REQUEST",
				message: "Organization name is required",
			});
			await expect(
				createOrganization({ name: "Ok", slug: "  " }),
			).resolves.toEqual({
				ok: false,
				code: "BAD_REQUEST",
				message: "Organization slug is required",
			});
			expect(organizationCreate).not.toHaveBeenCalled();
		});

		it("returns parsed organization when Neon succeeds", async () => {
			organizationCreate.mockResolvedValue({
				data: { id: "org-new", slug: "new-org", name: "New Org" },
				error: null,
			});
			const { createOrganization } = await import(
				"../src/organization-console"
			);
			await expect(
				createOrganization({ name: " New Org ", slug: " new-org " }),
			).resolves.toEqual({
				ok: true,
				data: {
					id: "org-new",
					slug: "new-org",
					name: "New Org",
				},
			});
			expect(organizationCreate).toHaveBeenCalledWith({
				name: "New Org",
				slug: "new-org",
			});
		});

		it("returns CONFLICT when Neon create reports slug taken", async () => {
			organizationCreate.mockResolvedValue({
				data: null,
				error: { message: "slug taken" },
			});
			const { createOrganization } = await import(
				"../src/organization-console"
			);
			await expect(
				createOrganization({ name: "Dup", slug: "dup" }),
			).resolves.toEqual({
				ok: false,
				code: "CONFLICT",
				message: "Organization already exists",
			});
		});

		it("returns INTERNAL_ERROR when Neon omits organization id", async () => {
			organizationCreate.mockResolvedValue({
				data: { slug: "no-id", name: "No Id" },
				error: null,
			});
			const { createOrganization } = await import(
				"../src/organization-console"
			);
			await expect(
				createOrganization({ name: "No Id", slug: "no-id" }),
			).resolves.toEqual({
				ok: false,
				code: "INTERNAL_ERROR",
				message: "Organization create returned no usable organization id",
			});
		});
	});

	describe("persistActiveOrganization", () => {
		it("rejects empty organizationId before Neon setActive", async () => {
			const { persistActiveOrganization } = await import(
				"../src/organization-console"
			);
			await expect(persistActiveOrganization("  ")).resolves.toEqual({
				ok: false,
				code: "BAD_REQUEST",
				message: "Active organization id is required",
			});
			expect(organizationSetActive).not.toHaveBeenCalled();
		});

		it("calls Neon setActive and resolves when persist succeeds", async () => {
			organizationSetActive.mockResolvedValue({ data: null, error: null });
			const { persistActiveOrganization } = await import(
				"../src/organization-console"
			);
			await expect(persistActiveOrganization(" org-1 ")).resolves.toEqual({
				ok: true,
				data: undefined,
			});
			expect(organizationSetActive).toHaveBeenCalledWith({
				organizationId: "org-1",
			});
		});

		it("returns Result failure when Neon setActive errors", async () => {
			organizationSetActive.mockResolvedValue({
				data: null,
				error: { message: "denied" },
			});
			const { persistActiveOrganization } = await import(
				"../src/organization-console"
			);
			await expect(persistActiveOrganization("org-1")).resolves.toEqual({
				ok: false,
				code: "INTERNAL_ERROR",
				message: "Failed to persist active organization on session",
			});
		});
	});

	describe("deleteOrganization", () => {
		it("rejects empty organizationId before Neon delete", async () => {
			const { deleteOrganization } = await import(
				"../src/organization-console"
			);
			await expect(deleteOrganization("  ")).resolves.toEqual({
				ok: false,
				code: "BAD_REQUEST",
				message: "Organization id is required",
			});
			expect(organizationDelete).not.toHaveBeenCalled();
		});

		it("refuses orgs outside session memberships", async () => {
			organizationList.mockResolvedValue({
				data: [{ id: "org-other", slug: "other" }],
				error: null,
			});
			const { deleteOrganization } = await import(
				"../src/organization-console"
			);
			await expect(deleteOrganization("org-1")).resolves.toEqual({
				ok: false,
				code: "FORBIDDEN",
				message: "Organization is not in the session memberships",
			});
			expect(organizationDelete).not.toHaveBeenCalled();
		});

		it("calls Neon delete when membership includes the org", async () => {
			organizationList.mockResolvedValue({
				data: [{ id: "org-1", slug: "one" }],
				error: null,
			});
			organizationDelete.mockResolvedValue({ data: null, error: null });
			const { deleteOrganization } = await import(
				"../src/organization-console"
			);
			await expect(deleteOrganization(" org-1 ")).resolves.toEqual({
				ok: true,
				data: undefined,
			});
			expect(organizationDelete).toHaveBeenCalledWith({
				organizationId: "org-1",
			});
		});

		it("returns FORBIDDEN when Neon delete is not permitted", async () => {
			organizationList.mockResolvedValue({
				data: [{ id: "org-1", slug: "one" }],
				error: null,
			});
			organizationDelete.mockResolvedValue({
				data: null,
				error: { message: "not owner" },
			});
			const { deleteOrganization } = await import(
				"../src/organization-console"
			);
			await expect(deleteOrganization("org-1")).resolves.toEqual({
				ok: false,
				code: "FORBIDDEN",
				message: "Not authorized for this organization action",
			});
		});
	});
});
