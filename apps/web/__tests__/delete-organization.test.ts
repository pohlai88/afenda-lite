/**
 * Org-console hard-delete Action — Result → ActionResult mapping.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-delete-operator",
	orgId: "org-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const adminMocks = vi.hoisted(() => ({
	deleteOrganization: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	requireRole: authMocks.requireRole,
}));

vi.mock("@afenda/admin", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@afenda/admin")>();
	return {
		...actual,
		deleteOrganization: adminMocks.deleteOrganization,
	};
});

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { deleteOrganizationAction } from "../app/actions/delete-organization";

describe("deleteOrganizationAction", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
	});

	it("returns VALIDATION_ERROR when orgId is missing", async () => {
		const formData = new FormData();
		const result = await deleteOrganizationAction(null, formData);

		expect(result?.ok).toBe(false);
		if (result?.ok === false) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(adminMocks.deleteOrganization).not.toHaveBeenCalled();
	});

	it("maps package success to ActionResult ok and revalidates", async () => {
		adminMocks.deleteOrganization.mockResolvedValue({
			ok: true,
			data: { orgId: "org-to-delete" },
		});

		const formData = new FormData();
		formData.set("orgId", "org-to-delete");

		const result = await deleteOrganizationAction(null, formData);

		expect(result).toEqual({
			ok: true,
			data: { orgId: "org-to-delete" },
		});
		expect(adminMocks.deleteOrganization).toHaveBeenCalledWith({
			orgId: "org-to-delete",
		});
		expect(revalidatePath).toHaveBeenCalledWith("/admin");
	});

	it("passes package FORBIDDEN through honestly", async () => {
		adminMocks.deleteOrganization.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Organization is not in the session memberships",
		});

		const formData = new FormData();
		formData.set("orgId", "org-outside");

		const result = await deleteOrganizationAction(null, formData);

		expect(result?.ok).toBe(false);
		if (result?.ok === false) {
			expect(result.code).toBe("FORBIDDEN");
			expect(result.message).toContain("session memberships");
		}
		expect(revalidatePath).not.toHaveBeenCalled();
	});

	it("pins hard-delete semantics in Action source (not soft-deactivate)", async () => {
		const { readFileSync } = await import("node:fs");
		const path = await import("node:path");
		const { fileURLToPath } = await import("node:url");
		const webRoot = path.join(
			path.dirname(fileURLToPath(import.meta.url)),
			"..",
		);
		const source = readFileSync(
			path.join(webRoot, "app/actions/delete-organization.ts"),
			"utf8",
		);
		expect(source).toMatch(/hard-delete/i);
		expect(source).toMatch(/Permanent removal only/i);
		expect(source).toContain('from "@afenda/admin"');
	});
});
