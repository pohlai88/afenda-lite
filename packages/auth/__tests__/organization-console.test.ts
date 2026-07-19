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
			await expect(listMemberOrganizations()).resolves.toEqual([
				{ id: "org-1", slug: "one" },
			]);
		});

		it("throws when Neon list errors", async () => {
			organizationList.mockResolvedValue({
				data: null,
				error: { message: "list denied" },
			});
			const { listMemberOrganizations } = await import(
				"../src/organization-console"
			);
			await expect(listMemberOrganizations()).rejects.toThrow(/list denied/);
		});
	});

	describe("createOrganization", () => {
		it("rejects empty name or slug before calling Neon", async () => {
			const { createOrganization } = await import(
				"../src/organization-console"
			);
			await expect(
				createOrganization({ name: "  ", slug: "ok" }),
			).rejects.toThrow(/non-empty name/);
			await expect(
				createOrganization({ name: "Ok", slug: "  " }),
			).rejects.toThrow(/non-empty slug/);
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
				id: "org-new",
				slug: "new-org",
				name: "New Org",
			});
			expect(organizationCreate).toHaveBeenCalledWith({
				name: "New Org",
				slug: "new-org",
			});
		});

		it("throws when Neon create errors", async () => {
			organizationCreate.mockResolvedValue({
				data: null,
				error: { message: "slug taken" },
			});
			const { createOrganization } = await import(
				"../src/organization-console"
			);
			await expect(
				createOrganization({ name: "Dup", slug: "dup" }),
			).rejects.toThrow(/slug taken/);
		});

		it("throws when Neon omits organization id", async () => {
			organizationCreate.mockResolvedValue({
				data: { slug: "no-id", name: "No Id" },
				error: null,
			});
			const { createOrganization } = await import(
				"../src/organization-console"
			);
			await expect(
				createOrganization({ name: "No Id", slug: "no-id" }),
			).rejects.toThrow(/no usable organization id/);
		});
	});

	describe("persistActiveOrganization", () => {
		it("rejects empty organizationId before Neon setActive", async () => {
			const { persistActiveOrganization } = await import(
				"../src/organization-console"
			);
			await expect(persistActiveOrganization("  ")).rejects.toThrow(
				/non-empty organizationId/,
			);
			expect(organizationSetActive).not.toHaveBeenCalled();
		});

		it("calls Neon setActive and resolves when persist succeeds", async () => {
			organizationSetActive.mockResolvedValue({ data: null, error: null });
			const { persistActiveOrganization } = await import(
				"../src/organization-console"
			);
			await expect(
				persistActiveOrganization(" org-1 "),
			).resolves.toBeUndefined();
			expect(organizationSetActive).toHaveBeenCalledWith({
				organizationId: "org-1",
			});
		});

		it("throws when Neon setActive errors", async () => {
			organizationSetActive.mockResolvedValue({
				data: null,
				error: { message: "denied" },
			});
			const { persistActiveOrganization } = await import(
				"../src/organization-console"
			);
			await expect(persistActiveOrganization("org-1")).rejects.toThrow(
				/failed to persist active organization/,
			);
		});
	});

	describe("deleteOrganization", () => {
		it("rejects empty organizationId before Neon delete", async () => {
			const { deleteOrganization } = await import(
				"../src/organization-console"
			);
			await expect(deleteOrganization("  ")).rejects.toThrow(
				/non-empty organizationId/,
			);
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
			await expect(deleteOrganization("org-1")).rejects.toThrow(
				/outside session memberships/,
			);
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
			await expect(deleteOrganization(" org-1 ")).resolves.toBeUndefined();
			expect(organizationDelete).toHaveBeenCalledWith({
				organizationId: "org-1",
			});
		});

		it("throws when Neon delete errors", async () => {
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
			await expect(deleteOrganization("org-1")).rejects.toThrow(/not owner/);
		});
	});
});
