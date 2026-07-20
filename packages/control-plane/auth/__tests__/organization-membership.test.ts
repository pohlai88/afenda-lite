import { beforeEach, describe, expect, it, vi } from "vitest";

const mockedEnv = vi.hoisted(() => ({
	PORTAL_ORGANIZATION_ID: undefined as string | undefined,
	PORTAL_ORG_SLUG: undefined as string | undefined,
}));

vi.mock("@afenda/env", () => ({
	env: mockedEnv,
}));

describe("organization membership (N8)", () => {
	beforeEach(() => {
		vi.resetModules();
		mockedEnv.PORTAL_ORGANIZATION_ID = undefined;
		mockedEnv.PORTAL_ORG_SLUG = undefined;
	});

	describe("normalizeMemberOrganizations", () => {
		it("returns empty for non-arrays and drops invalid rows", async () => {
			const { normalizeMemberOrganizations } = await import(
				"../src/organization-membership"
			);
			expect(normalizeMemberOrganizations(null)).toEqual([]);
			expect(normalizeMemberOrganizations({})).toEqual([]);
			expect(
				normalizeMemberOrganizations([
					{ id: "org-1", slug: "one" },
					{ id: "", slug: "empty-id" },
					{ id: "org-2" },
					{ slug: "no-id" },
					null,
					"x",
				]),
			).toEqual([{ id: "org-1", slug: "one" }]);
		});
	});

	describe("selectResolvableOrganizationId", () => {
		const orgs = [
			{ id: "org-a", slug: "alpha" },
			{ id: "org-b", slug: "beta" },
		] as const;

		it("selects the PORTAL_ORGANIZATION_ID allowlist match among many", async () => {
			mockedEnv.PORTAL_ORGANIZATION_ID = "org-b";
			const { selectResolvableOrganizationId } = await import(
				"../src/organization-membership"
			);
			expect(selectResolvableOrganizationId(orgs)).toBe("org-b");
		});

		it("selects the PORTAL_ORG_SLUG allowlist match when id is unset", async () => {
			mockedEnv.PORTAL_ORG_SLUG = "alpha";
			const { selectResolvableOrganizationId } = await import(
				"../src/organization-membership"
			);
			expect(selectResolvableOrganizationId(orgs)).toBe("org-a");
		});

		it("prefers PORTAL_ORGANIZATION_ID over slug when both are set", async () => {
			mockedEnv.PORTAL_ORGANIZATION_ID = "org-b";
			mockedEnv.PORTAL_ORG_SLUG = "alpha";
			const { selectResolvableOrganizationId } = await import(
				"../src/organization-membership"
			);
			expect(selectResolvableOrganizationId(orgs)).toBe("org-b");
		});

		it("selects the sole membership when no allowlist is configured", async () => {
			const { selectResolvableOrganizationId } = await import(
				"../src/organization-membership"
			);
			expect(
				selectResolvableOrganizationId([{ id: "org-sole", slug: "sole" }]),
			).toBe("org-sole");
		});

		it("fail-closes to null for multi-org without an allowlist match", async () => {
			mockedEnv.PORTAL_ORGANIZATION_ID = "org-not-a-member";
			mockedEnv.PORTAL_ORG_SLUG = "missing-slug";
			const { selectResolvableOrganizationId } = await import(
				"../src/organization-membership"
			);
			expect(selectResolvableOrganizationId(orgs)).toBeNull();
		});

		it("fail-closes to null for multi-org with no allowlist configured", async () => {
			const { selectResolvableOrganizationId } = await import(
				"../src/organization-membership"
			);
			expect(selectResolvableOrganizationId(orgs)).toBeNull();
		});

		it("fail-closes to null for an empty membership list", async () => {
			const { selectResolvableOrganizationId } = await import(
				"../src/organization-membership"
			);
			expect(selectResolvableOrganizationId([])).toBeNull();
		});
	});

	describe("resolveMemberOrganizationId", () => {
		it("returns null when organization.list errors", async () => {
			const { resolveMemberOrganizationId } = await import(
				"../src/organization-membership"
			);
			const auth = {
				organization: {
					list: async () => ({
						data: null,
						error: { message: "list failed" },
					}),
				},
			};
			await expect(
				resolveMemberOrganizationId(auth as never),
			).resolves.toBeNull();
		});

		it("applies the sole-membership ladder on a successful list", async () => {
			const { resolveMemberOrganizationId } = await import(
				"../src/organization-membership"
			);
			const auth = {
				organization: {
					list: async () => ({
						data: [{ id: "org-sole", slug: "sole" }],
						error: null,
					}),
				},
			};
			await expect(resolveMemberOrganizationId(auth as never)).resolves.toBe(
				"org-sole",
			);
		});
	});

	describe("persistActiveOrganization", () => {
		it("returns true when setActive succeeds", async () => {
			const { persistActiveOrganization } = await import(
				"../src/organization-membership"
			);
			const auth = {
				organization: {
					setActive: async () => ({ data: null, error: null }),
				},
			};
			await expect(
				persistActiveOrganization(auth as never, "org-1"),
			).resolves.toBe(true);
		});

		it("returns false when setActive errors", async () => {
			const { persistActiveOrganization } = await import(
				"../src/organization-membership"
			);
			const auth = {
				organization: {
					setActive: async () => ({
						data: null,
						error: { message: "denied" },
					}),
				},
			};
			await expect(
				persistActiveOrganization(auth as never, "org-1"),
			).resolves.toBe(false);
		});
	});
});
