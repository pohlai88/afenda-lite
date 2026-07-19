/**
 * Org-console provision Action — Result → ActionResult mapping.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-provision-operator",
	orgId: "org-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const adminMocks = vi.hoisted(() => ({
	provisionOrganization: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	requireRole: authMocks.requireRole,
}));

vi.mock("@afenda/admin", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@afenda/admin")>();
	return {
		...actual,
		provisionOrganization: adminMocks.provisionOrganization,
	};
});

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { provisionOrganizationAction } from "../app/actions/provision-organization";

describe("provisionOrganizationAction", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
	});

	it("returns VALIDATION_ERROR for invalid FormData", async () => {
		const formData = new FormData();
		formData.set("name", "");
		formData.set("slug", "Not Valid");
		formData.set("adminEmail", "not-an-email");
		formData.set("adminRole", "admin");

		const result = await provisionOrganizationAction(null, formData);

		expect(result?.ok).toBe(false);
		if (result?.ok === false) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(adminMocks.provisionOrganization).not.toHaveBeenCalled();
	});

	it("maps package success to ActionResult ok", async () => {
		adminMocks.provisionOrganization.mockResolvedValue({
			ok: true,
			data: {
				organization: {
					id: "org-new",
					slug: "acme-ops",
					name: "Acme Ops",
				},
				invitationId: "inv_1",
			},
		});

		const formData = new FormData();
		formData.set("name", "Acme Ops");
		formData.set("slug", "acme-ops");
		formData.set("adminEmail", "Admin@Example.com");
		formData.set("adminRole", "admin");

		const result = await provisionOrganizationAction(null, formData);

		expect(result).toEqual({
			ok: true,
			data: {
				organization: {
					id: "org-new",
					slug: "acme-ops",
					name: "Acme Ops",
				},
				invitationId: "inv_1",
			},
		});
		expect(adminMocks.provisionOrganization).toHaveBeenCalledWith({
			name: "Acme Ops",
			slug: "acme-ops",
			adminEmail: "admin@example.com",
			adminRole: "admin",
		});
		expect(revalidatePath).toHaveBeenCalledWith("/admin");
	});

	it("passes package failure code, message, and details", async () => {
		adminMocks.provisionOrganization.mockResolvedValue({
			ok: false,
			code: "INTERNAL_ERROR",
			message: "Organization created; invite failed — retry invite",
			details: {
				disposition: "org_created_invite_failed",
				organization: {
					id: "org-partial",
					slug: "partial",
					name: "Partial",
				},
			},
		});

		const formData = new FormData();
		formData.set("name", "Partial");
		formData.set("slug", "partial");
		formData.set("adminEmail", "admin@example.com");
		formData.set("adminRole", "operator");

		const result = await provisionOrganizationAction(null, formData);

		expect(result?.ok).toBe(false);
		if (result?.ok === false) {
			expect(result.code).toBe("INTERNAL_ERROR");
			expect(result.message).toContain("invite failed");
			expect(result.details).toEqual({
				disposition: "org_created_invite_failed",
				organization: {
					id: "org-partial",
					slug: "partial",
					name: "Partial",
				},
			});
		}
		expect(revalidatePath).not.toHaveBeenCalled();
	});
});
